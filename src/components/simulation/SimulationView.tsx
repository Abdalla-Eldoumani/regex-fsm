import { useState, useMemo, useEffect, useCallback } from 'react'
import type { JSX } from 'react'
import { simulateDFA, simulateNFA } from '@/core/algorithms/simulate'
import { nfaToDFA } from '@/core/algorithms/subset'
import { computationTree } from '@/core/algorithms/computationTree'
import type { ComputationTreeResult } from '@/core/algorithms/computationTree'
import { GNFA_PRESETS, regexToSourceNfa } from '@/core/algorithms/gnfaPresets'
import { AutomatonGraph } from '@/visualization/renderer'
import { TooLargeNotice } from '@/components/common/TooLargeNotice'
import { TooLargeError } from '@/core/automata/types'
import type { DFA, NFA } from '@/core/automata/types'
import { InputTape } from './InputTape'
import { SimulationStepControls } from './SimulationStepControls'
import { ComputationTree } from './ComputationTree'

// SimulationView: the /simulate route. A reduced-motion-aware stepped run modeled
// on ClosureView (closure/ClosureView.tsx). It reuses that view's proven pieces:
// the {key, step} stale-step guard so step state never leaks across a source or
// mode change, the matchMedia reduced-motion state tracked live, the gated
// auto-play interval that bails under reduced motion, the 300ms regex debounce,
// the GNFA_PRESETS source picker so the view is never blank on load, the
// clampedStep, and the TooLargeNotice catch on a determinization blow-up.
//
// This plan delivers the DFA run end to end (SIM-01): the single active DFA state
// lights on the graph via highlightStates, and the InputTape consumes the input
// symbol by symbol from one shared step index, showing the verdict on the final
// frame. The NFA-run and side-by-side modes are present-but-inert tabs here; the
// later waves fill them in. The view never feeds a string into a JS RegExp; the
// source flows through the bespoke parse (regexToSourceNfa) and the run through
// simulateDFA (T-10-05).

// The mode selector values. Only 'dfa' renders a run in this plan.
type SimMode = 'dfa' | 'nfa' | 'side'

// The default preset so the DFA run loads non-blank: 'contains a' over Sigma =
// {a, b} gives a two-state machine that animates clearly on a short input.
const DEFAULT_PRESET = GNFA_PRESETS[4].id // contains a
const DEFAULT_INPUT = 'aba'

// The source spec: a curated preset id or a typed regex string.
type SourceSpec = { kind: 'preset'; id: string } | { kind: 'regex'; src: string }

// The determinized-source result. A parse error is surfaced inline; a
// TooLargeError surfaces as the 'too-large' kind so the view shows TooLargeNotice
// instead of hanging (SAFETY-01 / T-10-04).
// The source carries BOTH the source NFA and its determinized DFA. The DFA run
// (SIM-01) steps the DFA; the NFA run (SIM-02) steps the NFA directly to light the
// full lambda-closed active set and to build the computation tree. One derivation
// feeds both branches so they always agree on the source.
type SourceResult =
  | { kind: 'dfa'; nfa: NFA; dfa: DFA; alphabet: string[] }
  | { kind: 'too-large'; message: string; partial?: { states: number } }
  | { kind: 'error'; message: string }
  | { kind: 'none' }

// Build the source NFA and its complete DFA from a preset id or a typed regex.
// Re-throws TooLargeError so the caller's useMemo can surface it; ordinary parse
// errors are returned inline. Mirrors deriveSourceDfa in ClosureView.
function deriveSource(spec: SourceSpec): SourceResult {
  if (spec.kind === 'preset') {
    const preset = GNFA_PRESETS.find(p => p.id === spec.id)
    if (!preset) return { kind: 'error', message: 'Unknown preset' }
    const dfa = nfaToDFA(preset.nfa)
    return { kind: 'dfa', nfa: preset.nfa, dfa, alphabet: Array.from(preset.nfa.alphabet).sort() }
  }
  const src = spec.src.trim()
  if (!src) return { kind: 'none' }
  try {
    const nfa = regexToSourceNfa(src)
    // nfaToDFA can throw TooLargeError; re-throw so sourceResult catches it.
    const dfa = nfaToDFA(nfa)
    return { kind: 'dfa', nfa, dfa, alphabet: Array.from(nfa.alphabet).sort() }
  } catch (e) {
    if (e instanceof TooLargeError) throw e
    return { kind: 'error', message: e instanceof Error ? e.message : 'Parse error' }
  }
}

// Build the stale-step guard key. The step resets to 0 whenever the mode, the
// source, or the input string changes, so a stale step never points past a
// shorter run (the ClosureView {key, step} lesson).
function makeStepKey(mode: SimMode, spec: SourceSpec, debounced: string, input: string): string {
  const source = spec.kind === 'preset' ? spec.id : debounced
  return `${mode}::${source}::${input}`
}

export default function SimulationView(): JSX.Element {
  const [mode, setMode] = useState<SimMode>('dfa')

  // The run source: a preset by default so the view loads non-blank.
  const [spec, setSpec] = useState<SourceSpec>({ kind: 'preset', id: DEFAULT_PRESET })

  // The raw typed regex (debounced below) and the test string.
  const [regex, setRegex] = useState('')
  const [debouncedRegex, setDebouncedRegex] = useState('')
  const [input, setInput] = useState(DEFAULT_INPUT)

  const [stepState, setStepState] = useState<{ key: string; step: number }>({
    key: makeStepKey('dfa', { kind: 'preset', id: DEFAULT_PRESET }, '', DEFAULT_INPUT),
    step: 0,
  })

  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1000)

  // Reduced motion: read matchMedia on mount and track it live (ClosureView).
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // 300ms debounce for the typed regex input.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedRegex(regex), 300)
    return () => clearTimeout(t)
  }, [regex])

  // Determinize the source. TooLargeError is caught here and stored as the
  // 'too-large' kind so the render shows TooLargeNotice rather than crashing.
  const sourceResult = useMemo<SourceResult>(() => {
    const s: SourceSpec = spec.kind === 'regex' ? { kind: 'regex', src: debouncedRegex } : spec
    try {
      return deriveSource(s)
    } catch (e) {
      if (e instanceof TooLargeError) {
        return { kind: 'too-large', message: e.message, partial: e.partial }
      }
      throw e
    }
  }, [spec, debouncedRegex])

  // The working alphabet caption (Sigma = {a, b}) for the input field.
  const alphabetLabel = useMemo(() => {
    if (sourceResult.kind !== 'dfa') return ''
    return `Σ = {${sourceResult.alphabet.join(', ')}}`
  }, [sourceResult])

  const stepKey = makeStepKey(mode, spec, debouncedRegex, input)

  // The DFA run trace. simulateDFA returns ordered steps; steps[i].nextStates is
  // the single active DFA state (or [] on a trap frame with no transition).
  const run = useMemo(() => {
    if (sourceResult.kind !== 'dfa') return null
    return simulateDFA(sourceResult.dfa, input)
  }, [sourceResult, input])

  // The NFA run trace. simulateNFA seeds lambdaClosure([startState]) and re-applies
  // lambdaClosure(move(...)) after every symbol, so steps[i].nextStates is the FULL
  // lambda-closed active set (invariant 3). The whole set binds to highlightStates
  // below; there is no affordance that selects one path.
  const nfaRun = useMemo(() => {
    if (sourceResult.kind !== 'dfa') return null
    return simulateNFA(sourceResult.nfa, input)
  }, [sourceResult, input])

  // The computation tree (the genuine branching). computationTree is bounded by the
  // shared assertWithinBounds cap and can throw TooLargeError on a fan-out blow-up;
  // catch it here and return a 'too-large' marker so the tree REGION degrades to
  // TooLargeNotice while the graph and tape stay usable (graceful degradation, T-10-07).
  const tree = useMemo<
    { kind: 'ok'; result: ComputationTreeResult } | { kind: 'too-large'; message: string; partial?: { states: number } } | null
  >(() => {
    if (sourceResult.kind !== 'dfa') return null
    try {
      return { kind: 'ok', result: computationTree(sourceResult.nfa, input) }
    } catch (e) {
      if (e instanceof TooLargeError) return { kind: 'too-large', message: e.message, partial: e.partial }
      throw e
    }
  }, [sourceResult, input])

  // The run that drives the shared step index for the current mode. The DFA run can
  // stop early on a trap frame; the NFA run always has input.length + 1 frames. Both
  // start at position 0, so totalSteps >= 1 whenever a source is selected.
  const activeRun = mode === 'nfa' ? nfaRun : run
  const totalSteps = activeRun ? activeRun.steps.length : 0

  const rawStep = stepState.key === stepKey ? stepState.step : 0
  const clampedStep = totalSteps > 0 ? Math.min(rawStep, totalSteps - 1) : 0

  // Auto-play interval: advance one step every `speed` ms. Drives the DFA and NFA
  // runs (side-by-side is inert this wave). Bails under reduced motion so the
  // experience degrades to a static prev/next step-through, and stops at the last
  // step (the ClosureView interval pattern).
  useEffect(() => {
    if (mode === 'side' || !isPlaying || reducedMotion || totalSteps === 0) return
    const interval = setInterval(() => {
      setStepState(prev => {
        const next = prev.step + 1
        if (next >= totalSteps) {
          setIsPlaying(false)
          return prev
        }
        return { key: prev.key, step: next }
      })
    }, speed)
    return () => clearInterval(interval)
  }, [mode, isPlaying, speed, reducedMotion, totalSteps])

  // Mode toggle: reset the step and stop play so a stale step never carries over.
  const handleModeChange = useCallback((m: SimMode) => {
    setMode(m)
    setIsPlaying(false)
    setStepState({ key: makeStepKey(m, spec, debouncedRegex, input), step: 0 })
  }, [spec, debouncedRegex, input])

  // Source preset selection: clear the typed regex and reset the step.
  const handlePreset = useCallback((id: string) => {
    setSpec({ kind: 'preset', id })
    setRegex('')
    setDebouncedRegex('')
    setIsPlaying(false)
    setStepState({ key: makeStepKey(mode, { kind: 'preset', id }, '', input), step: 0 })
  }, [mode, input])

  // Typed regex: switch the source to regex once there is non-empty text.
  const handleRegex = useCallback((value: string) => {
    setIsPlaying(false)
    setRegex(value)
    if (value.trim()) {
      setSpec({ kind: 'regex', src: value })
    }
  }, [])

  // Test-string change: reset the step so the head starts at the beginning.
  const handleInput = useCallback((value: string) => {
    setIsPlaying(false)
    setInput(value)
    setStepState({ key: makeStepKey(mode, spec, debouncedRegex, value), step: 0 })
  }, [mode, spec, debouncedRegex])

  // Step control handlers (ClosureView shape).
  const handlePrev = useCallback(() => {
    setIsPlaying(false)
    setStepState(prev => ({
      key: stepKey,
      step: Math.max(0, (prev.key === stepKey ? prev.step : 0) - 1),
    }))
  }, [stepKey])

  const handleNext = useCallback(() => {
    if (totalSteps <= 0) return
    setIsPlaying(false)
    setStepState(prev => ({
      key: stepKey,
      step: Math.min(totalSteps - 1, (prev.key === stepKey ? prev.step : 0) + 1),
    }))
  }, [stepKey, totalSteps])

  const handlePlay = useCallback(() => {
    if (reducedMotion || totalSteps === 0) return
    if (clampedStep >= totalSteps - 1) {
      setStepState({ key: stepKey, step: 0 })
    }
    setIsPlaying(true)
  }, [reducedMotion, clampedStep, totalSteps, stepKey])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setStepState({ key: stepKey, step: 0 })
  }, [stepKey])

  const handleSpeedChange = useCallback((ms: number) => {
    setSpeed(ms)
  }, [])

  // The current frame for the active run. For the DFA this is the single active
  // state (or [] on a trap frame). For the NFA this is the WHOLE lambda-closed
  // active set: every simultaneously-active state lights at once. Both bind the
  // frame's nextStates to highlightStates, which lights every id in the array.
  const frame = activeRun ? activeRun.steps[clampedStep] : null
  const highlightStates = frame ? frame.nextStates : []
  const tapePosition = frame ? frame.position : 0
  // accepted is passed only on the final frame so the verdict badge appears once
  // the run is complete; every intermediate frame passes null.
  const isFinalFrame = totalSteps > 0 && clampedStep === totalSteps - 1
  const tapeAccepted = isFinalFrame && activeRun ? activeRun.accepted : null

  const modeBtnClass = (m: SimMode) =>
    'min-h-[44px] min-w-[44px] px-4 rounded-lg text-sm font-medium transition-colors border ' +
    (mode === m
      ? 'bg-brand-tint text-brand-hover border-brand/30'
      : 'bg-surface-raised text-text-mid border-border hover:text-text-hi hover:border-border-strong')

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      {/* Page header */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <h2 className="text-2xl font-display font-semibold text-text-hi">
          Simulation
        </h2>
        <p className="text-sm text-text-mid mt-1">
          Run a string through an automaton step by step: the active state lights on
          the graph and the tape consumes the input symbol by symbol to a verdict.
        </p>
      </div>

      {/* Mode selector. DFA run is the default; NFA run and side-by-side are
          present here and fill in with the later simulation waves. */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={mode === 'dfa'}
            onClick={() => handleModeChange('dfa')}
            className={modeBtnClass('dfa')}
            data-testid="sim-mode-dfa"
          >
            DFA run
          </button>
          <button
            type="button"
            aria-pressed={mode === 'nfa'}
            onClick={() => handleModeChange('nfa')}
            className={modeBtnClass('nfa')}
            data-testid="sim-mode-nfa"
          >
            NFA run
          </button>
          <button
            type="button"
            aria-pressed={mode === 'side'}
            onClick={() => handleModeChange('side')}
            className={modeBtnClass('side')}
            data-testid="sim-mode-side"
          >
            Side-by-side
          </button>
        </div>
      </div>

      {/* Source selection: a preset row plus a typed-regex field. */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono text-text-low">Source:</span>
            <div className="flex flex-wrap gap-2">
              {GNFA_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePreset(preset.id)}
                  className={
                    'px-3 min-h-[44px] min-w-[44px] rounded-lg text-sm font-mono transition-colors border ' +
                    (spec.kind === 'preset' && spec.id === preset.id
                      ? 'bg-brand-tint text-brand-hover border-brand/30'
                      : 'bg-surface-raised text-text-mid border-border hover:text-text-hi hover:border-border-strong')
                  }
                  aria-pressed={spec.kind === 'preset' && spec.id === preset.id}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="sim-regex" className="shrink-0 text-xs font-mono text-text-low">
                Regex:
              </label>
              <input
                id="sim-regex"
                data-testid="sim-regex"
                type="text"
                value={regex}
                onChange={e => handleRegex(e.target.value)}
                placeholder="e.g. (a+b)*ab"
                spellCheck={false}
                className="flex-1 min-w-0 bg-transparent font-mono text-text-hi text-sm focus-visible:outline-none placeholder:text-text-low"
              />
            </div>
          </div>

          {/* Input-string field. The empty string is allowed and renders as the
              verdict only (the tape shows the empty-tape hint). */}
          <div className="flex items-center gap-3 border-t border-border pt-3">
            <label htmlFor="sim-input" className="shrink-0 text-xs font-mono text-text-low">
              Input:
            </label>
            <input
              id="sim-input"
              data-testid="sim-input"
              type="text"
              value={input}
              onChange={e => handleInput(e.target.value)}
              placeholder={alphabetLabel || 'Σ = {a, b}'}
              spellCheck={false}
              className="flex-1 min-w-0 bg-transparent font-mono text-text-hi text-sm focus-visible:outline-none placeholder:text-text-low"
            />
            {alphabetLabel && (
              <span className="shrink-0 text-xs font-mono text-text-low">{alphabetLabel}</span>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-8 flex-1 flex flex-col gap-4">
        {sourceResult.kind === 'too-large' ? (
          <div className="p-4">
            <TooLargeNotice message={sourceResult.message} partial={sourceResult.partial} />
          </div>
        ) : sourceResult.kind === 'error' ? (
          <div className="flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {sourceResult.message}
          </div>
        ) : sourceResult.kind === 'dfa' && mode === 'dfa' ? (
          <>
            {/* Graph region: the single active DFA state lights via highlightStates
                (amber .active). The glow is CSS, so reduced motion holds a still
                amber frame with no pulse by construction. */}
            <div
              data-testid="sim-canvas"
              className="rounded-xl border border-border bg-surface overflow-hidden"
              style={{ minHeight: '420px' }}
            >
              <AutomatonGraph
                automaton={sourceResult.dfa}
                highlightStates={highlightStates}
              />
            </div>

            {/* Input tape: consumes the string symbol by symbol from the shared
                step position, with the verdict on the final frame. */}
            <div data-testid="sim-tape" className="rounded-xl border border-border bg-surface px-4">
              <InputTape input={input} currentPosition={tapePosition} accepted={tapeAccepted} />
            </div>

            {/* Controls */}
            <div className="rounded-xl border border-border bg-surface p-4">
              <SimulationStepControls
                currentStep={clampedStep}
                totalSteps={totalSteps}
                isPlaying={isPlaying}
                speed={speed}
                reducedMotion={reducedMotion}
                onPrev={handlePrev}
                onNext={handleNext}
                onPlay={handlePlay}
                onPause={handlePause}
                onReset={handleReset}
                onSpeedChange={handleSpeedChange}
              />
            </div>

            {/* Step note: name the symbol consumed to reach this frame in course
                notation (lambda for the position-0 start frame). */}
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
              <span className="text-xs font-sans text-text-low uppercase tracking-wide">
                Step {clampedStep + 1} of {totalSteps}
              </span>
              <span className="text-sm font-mono text-text-mid">
                {frame && frame.symbol === null
                  ? 'start -- the run begins at the start state q₀ before reading any symbol (λ)'
                  : frame
                    ? `reading '${frame.symbol}'`
                    : ''}
              </span>
            </div>
          </>
        ) : sourceResult.kind === 'dfa' && mode === 'nfa' ? (
          <>
            {/* Graph region: the WHOLE lambda-closed active set lights at once via
                highlightStates (every active state amber .active), never a single
                arbitrary path (invariant 3). The glow is CSS, so reduced motion
                holds a still amber frame. */}
            <div
              data-testid="sim-canvas"
              className="rounded-xl border border-border bg-surface overflow-hidden"
              style={{ minHeight: '420px' }}
            >
              <AutomatonGraph
                automaton={sourceResult.nfa}
                highlightStates={highlightStates}
              />
            </div>

            {/* Active-set chip row: the current lambda-closed set as font-mono chips
                with the active treatment, mirroring SimulationPanel's Current States.
                An empty set renders the empty-set glyph with the trap cue and reads
                as a dead configuration (the run has no live state). */}
            <div
              data-testid="sim-active-set"
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-4"
            >
              <span className="text-xs font-sans text-text-low uppercase tracking-wide">
                Active set
              </span>
              {highlightStates.length > 0 ? (
                highlightStates.map(state => (
                  <span
                    key={state}
                    className="is-active px-2 py-1 rounded text-xs font-mono text-text-hi bg-state-active-soft border border-state-active"
                  >
                    {state}
                  </span>
                ))
              ) : (
                <span className="px-2 py-1 rounded text-xs font-mono text-state-trap bg-state-trap-soft border border-dashed border-state-trap opacity-80 flex items-center gap-1">
                  {/* The empty active set: a dead configuration in course notation. */}
                  ∅ <span className="font-sans">(dead configuration)</span>
                </span>
              )}
            </div>

            {/* Input tape: consumes the string from the shared step position, with
                the verdict on the final frame. */}
            <div data-testid="sim-tape" className="rounded-xl border border-border bg-surface px-4">
              <InputTape input={input} currentPosition={tapePosition} accepted={tapeAccepted} />
            </div>

            {/* Controls (the same shared step index drives the graph, chips, tape,
                and the tree below). */}
            <div className="rounded-xl border border-border bg-surface p-4">
              <SimulationStepControls
                currentStep={clampedStep}
                totalSteps={totalSteps}
                isPlaying={isPlaying}
                speed={speed}
                reducedMotion={reducedMotion}
                onPrev={handlePrev}
                onNext={handleNext}
                onPlay={handlePlay}
                onPause={handlePause}
                onReset={handleReset}
                onSpeedChange={handleSpeedChange}
              />
            </div>

            {/* Step note in course notation (lambda for the position-0 start frame). */}
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
              <span className="text-xs font-sans text-text-low uppercase tracking-wide">
                Step {clampedStep + 1} of {totalSteps}
              </span>
              <span className="text-sm font-mono text-text-mid">
                {frame && frame.symbol === null
                  ? 'start -- the run begins at the lambda-closure of q₀ (λ)'
                  : frame
                    ? `reading '${frame.symbol}'`
                    : ''}
              </span>
            </div>

            {/* Computation-tree region. The tree renders the genuine branching in
                lockstep with the tape on the shared step index. A fan-out blow-up
                surfaces TooLargeNotice HERE only, so the graph + tape above stay
                usable (graceful degradation). */}
            {tree && tree.kind === 'too-large' ? (
              <div data-testid="sim-tree-toolarge" className="p-1">
                <TooLargeNotice message={tree.message} partial={tree.partial} />
              </div>
            ) : tree && tree.kind === 'ok' ? (
              <ComputationTree result={tree.result} currentStep={clampedStep} />
            ) : null}
          </>
        ) : sourceResult.kind === 'dfa' ? (
          // Side-by-side is present-but-inert in this plan; the synced NFA + DFA
          // panels land in the next wave. The tab stays reachable so the mode row
          // is complete.
          <div
            data-testid="sim-mode-placeholder"
            className="flex items-center justify-center rounded-xl border border-border bg-surface p-8 text-sm text-text-low min-h-[200px] text-center"
          >
            The side-by-side NFA and determinized-DFA run, kept in step-for-step sync, comes to this view next.
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-border bg-surface p-8 text-sm text-text-low min-h-[200px]">
            Select a source above to begin the run.
          </div>
        )}
      </div>
    </div>
  )
}
