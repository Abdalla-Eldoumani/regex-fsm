import { useState, useMemo, useEffect, useCallback } from 'react'
import type { JSX } from 'react'
import { productDFA } from '@/core/algorithms/product'
import { complementDFA } from '@/core/algorithms/complement'
import type { ProductResult, ProductStep } from '@/core/algorithms/product'
import type { ComplementResult, ComplementStep } from '@/core/algorithms/complement'
import { nfaToDFA } from '@/core/algorithms/subset'
import { GNFA_PRESETS, regexToSourceNfa } from '@/core/algorithms/gnfaPresets'
import { AutomatonGraph } from '@/visualization/renderer'
import { TooLargeNotice } from '@/components/common/TooLargeNotice'
import { TooLargeError } from '@/core/automata/types'
import type { DFA } from '@/core/automata/types'
import { AcceptingLegend } from './AcceptingLegend'
import type { ClosureMode } from './AcceptingLegend'
import { ClosureControls } from './ClosureControls'

// Source DFAs are derived by determinizing through nfaToDFA so editor/regex/preset
// sources are all valid complete DFAs (A1; Pitfall 4). The preset NFA is run
// through the subset construction, producing a DFA total over the preset's
// alphabet with the standard '∅' trap.
//
// Source selection uses the GNFA_PRESETS list for both product sources so the
// view is never blank on load (NfaToRegexView pattern).

// The common Sigma for complement. This is the working alphabet over which
// the complement is taken. The plan-02 bug: complementing over a symbol-light
// DFA's own alphabet gives the wrong language. We pass this wider Sigma to
// complementDFA so the complement is correct.
const COMPLEMENT_SIGMA = new Set<string>(['a', 'b'])

const DEFAULT_PRESET_A = GNFA_PRESETS[0].id  // a*
const DEFAULT_PRESET_B = GNFA_PRESETS[4].id  // contains a

// Derive a DFA from a preset id or a typed regex string. Returns the DFA or
// null if there is a parse error. Re-throws TooLargeError so the caller can
// show TooLargeNotice (SAFETY-01). Only ordinary parse errors are swallowed.
function deriveSourceDfa(
  spec: { kind: 'preset'; id: string } | { kind: 'regex'; src: string }
): { dfa: DFA | null; parseError: string | null } {
  if (spec.kind === 'preset') {
    const preset = GNFA_PRESETS.find(p => p.id === spec.id)
    if (!preset) return { dfa: null, parseError: 'Unknown preset' }
    // Determinize the hand-built preset NFA via subset construction (A1).
    return { dfa: nfaToDFA(preset.nfa), parseError: null }
  }
  const src = spec.src.trim()
  if (!src) return { dfa: null, parseError: null }
  try {
    const nfa = regexToSourceNfa(src)
    // nfaToDFA can throw TooLargeError for large inputs. Re-throw so the
    // closureResult useMemo catches it and returns { kind: 'too-large' }.
    return { dfa: nfaToDFA(nfa), parseError: null }
  } catch (e) {
    if (e instanceof TooLargeError) throw e
    return {
      dfa: null,
      parseError: e instanceof Error ? e.message : 'Parse error',
    }
  }
}

// Result union: either a product or complement result, or an error.
type ClosureResult =
  | { kind: 'product'; data: ProductResult }
  | { kind: 'complement'; data: ComplementResult }
  | { kind: 'too-large'; message: string; partial?: { states: number } }
  | { kind: 'none' }

// Build the source key for staleness-guarded step state (NfaToRegexView pattern).
function makeSourceKey(
  mode: ClosureMode,
  specA: { kind: string; id?: string; src?: string },
  specB: { kind: string; id?: string; src?: string },
  debounced: { a: string; b: string }
): string {
  const a = specA.kind === 'preset' ? (specA.id ?? '') : debounced.a
  const b = specB.kind === 'preset' ? (specB.id ?? '') : debounced.b
  return `${mode}::${a}::${b}`
}

export default function ClosureView(): JSX.Element {
  const [closureMode, setClosureMode] = useState<ClosureMode>('union')

  // Source A — used by both product modes and complement.
  const [specA, setSpecA] = useState<{ kind: 'preset'; id: string } | { kind: 'regex'; src: string }>(
    { kind: 'preset', id: DEFAULT_PRESET_A }
  )
  // Source B — only used by product (union/intersection) modes.
  const [specB, setSpecB] = useState<{ kind: 'preset'; id: string } | { kind: 'regex'; src: string }>(
    { kind: 'preset', id: DEFAULT_PRESET_B }
  )

  // Raw regex inputs for each source (debounced below).
  const [regexA, setRegexA] = useState('')
  const [regexB, setRegexB] = useState('')
  const [debouncedA, setDebouncedA] = useState('')
  const [debouncedB, setDebouncedB] = useState('')

  // Step key/step state: the {key, step} pattern from NfaToRegexView guards
  // against stale step state across source changes (BL-01 lesson carried forward).
  const [stepState, setStepState] = useState<{ key: string; step: number }>({
    key: makeSourceKey('union', { kind: 'preset', id: DEFAULT_PRESET_A }, { kind: 'preset', id: DEFAULT_PRESET_B }, { a: '', b: '' }),
    step: 0,
  })

  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1000)

  // Reduced-motion: read matchMedia on mount and track changes (NfaToRegexView pattern).
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

  // 300ms debounce for each typed regex input.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedA(regexA), 300)
    return () => clearTimeout(t)
  }, [regexA])
  useEffect(() => {
    const t = setTimeout(() => setDebouncedB(regexB), 300)
    return () => clearTimeout(t)
  }, [regexB])

  // Derive the source DFAs from the current specs.
  // TooLargeError from nfaToDFA is stored as a special marker so closureResult
  // can surface it as the 'too-large' kind without crashing the render (SAFETY-01).
  const {
    dfa: dfaA,
    parseError: parseErrorA,
    tooLargeA,
  } = useMemo(
    () => {
      const s = specA.kind === 'regex' ? { kind: 'regex' as const, src: debouncedA } : specA
      try {
        return { ...deriveSourceDfa(s), tooLargeA: null as TooLargeError | null }
      } catch (e) {
        if (e instanceof TooLargeError) {
          return { dfa: null, parseError: null, tooLargeA: e }
        }
        throw e
      }
    },
    [specA, debouncedA]
  )
  const {
    dfa: dfaB,
    parseError: parseErrorB,
    tooLargeB,
  } = useMemo(
    () => {
      const s = specB.kind === 'regex' ? { kind: 'regex' as const, src: debouncedB } : specB
      try {
        return { ...deriveSourceDfa(s), tooLargeB: null as TooLargeError | null }
      } catch (e) {
        if (e instanceof TooLargeError) {
          return { dfa: null, parseError: null, tooLargeB: e }
        }
        throw e
      }
    },
    [specB, debouncedB]
  )

  // The stable source key for this (mode, specA, specB) combination.
  const sourceKey = makeSourceKey(closureMode, specA, specB, { a: debouncedA, b: debouncedB })

  // Compute the closure result: productDFA or complementDFA depending on mode.
  // Catches TooLargeError (SAFETY-01 / T-07-DOS).
  const closureResult = useMemo<ClosureResult>(() => {
    // Surface TooLargeError from source determinization before computing the product.
    if (tooLargeA) return { kind: 'too-large', message: tooLargeA.message, partial: tooLargeA.partial }
    if (tooLargeB) return { kind: 'too-large', message: tooLargeB.message, partial: tooLargeB.partial }

    if (closureMode === 'complement') {
      if (!dfaA) return { kind: 'none' }
      try {
        // Pass COMPLEMENT_SIGMA so the complement is correct for symbol-light sources
        // (the plan-02 fix: complement over the caller's Sigma, not the input's own).
        const data = complementDFA(dfaA, COMPLEMENT_SIGMA)
        return { kind: 'complement', data }
      } catch (e) {
        if (e instanceof TooLargeError) {
          return { kind: 'too-large', message: e.message, partial: e.partial }
        }
        throw e
      }
    }
    // Product modes: union or intersection.
    if (!dfaA || !dfaB) return { kind: 'none' }
    try {
      const data = productDFA(dfaA, dfaB, closureMode)
      return { kind: 'product', data }
    } catch (e) {
      if (e instanceof TooLargeError) {
        return { kind: 'too-large', message: e.message, partial: e.partial }
      }
      throw e
    }
  }, [dfaA, dfaB, closureMode, tooLargeA, tooLargeB])

  // Total step count and clamped step (NfaToRegexView pattern).
  const totalSteps = useMemo(() => {
    if (closureResult.kind === 'product') return closureResult.data.steps.length
    if (closureResult.kind === 'complement') return closureResult.data.steps.length
    return 0
  }, [closureResult])

  const rawStep = stepState.key === sourceKey ? stepState.step : 0
  const clampedStep = totalSteps > 0 ? Math.min(rawStep, totalSteps - 1) : 0

  // Auto-play interval: advance step every `speed` ms.
  // Never auto-advances under reducedMotion (UI-SPEC).
  useEffect(() => {
    if (!isPlaying || reducedMotion || totalSteps === 0) return
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
  }, [isPlaying, speed, reducedMotion, totalSteps])

  // Mode toggle handler: reset step and stop play (BL-01 lesson).
  const handleModeChange = useCallback((m: ClosureMode) => {
    setClosureMode(m)
    setIsPlaying(false)
    setStepState({ key: makeSourceKey(m, specA, specB, { a: debouncedA, b: debouncedB }), step: 0 })
  }, [specA, specB, debouncedA, debouncedB])

  // Source A selection handlers.
  const handlePresetA = useCallback((id: string) => {
    setSpecA({ kind: 'preset', id })
    setRegexA('')
    setDebouncedA('')
    setIsPlaying(false)
    setStepState({ key: makeSourceKey(closureMode, { kind: 'preset', id }, specB, { a: '', b: debouncedB }), step: 0 })
  }, [closureMode, specB, debouncedB])

  const handleRegexA = useCallback((value: string) => {
    setIsPlaying(false)
    setRegexA(value)
    if (value.trim()) {
      setSpecA({ kind: 'regex', src: value })
    }
  }, [])

  // Source B selection handlers.
  const handlePresetB = useCallback((id: string) => {
    setSpecB({ kind: 'preset', id })
    setRegexB('')
    setDebouncedB('')
    setIsPlaying(false)
    setStepState({ key: makeSourceKey(closureMode, specA, { kind: 'preset', id }, { a: debouncedA, b: '' }), step: 0 })
  }, [closureMode, specA, debouncedA])

  const handleRegexB = useCallback((value: string) => {
    setIsPlaying(false)
    setRegexB(value)
    if (value.trim()) {
      setSpecB({ kind: 'regex', src: value })
    }
  }, [])

  // Step control handlers.
  const handlePrev = useCallback(() => {
    setIsPlaying(false)
    setStepState(prev => ({
      key: sourceKey,
      step: Math.max(0, (prev.key === sourceKey ? prev.step : 0) - 1),
    }))
  }, [sourceKey])

  const handleNext = useCallback(() => {
    if (totalSteps <= 0) return
    setIsPlaying(false)
    setStepState(prev => ({
      key: sourceKey,
      step: Math.min(totalSteps - 1, (prev.key === sourceKey ? prev.step : 0) + 1),
    }))
  }, [sourceKey, totalSteps])

  const handlePlay = useCallback(() => {
    if (reducedMotion) return
    if (clampedStep >= totalSteps - 1) {
      setStepState({ key: sourceKey, step: 0 })
    }
    setIsPlaying(true)
  }, [reducedMotion, clampedStep, totalSteps, sourceKey])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const handleSpeedChange = useCallback((ms: number) => {
    setSpeed(ms)
  }, [])

  // Build the transient automaton for the current snapshot. This is the
  // NfaToRegexView pattern: rebuild from snapshot each step. The per-step
  // rebuild flicker is accepted TECH_DEBT (Pitfall 6; not fixed here).
  const { transientAutomaton, highlightStates, stepNote, currentStage } = useMemo(() => {
    if (closureResult.kind === 'product') {
      const steps: ProductStep[] = closureResult.data.steps
      const result = closureResult.data
      const snap = steps[clampedStep]
      if (!snap) return { transientAutomaton: null, highlightStates: [], stepNote: '', currentStage: '' }

      // The transient DFA for this step: only pairs discovered so far.
      // acceptStates = result.dfa.acceptStates intersected with snap.states
      // so accepting pairs show the double-ring as they appear.
      const acceptSet = new Set(result.dfa.acceptStates)
      const snapAccepts = snap.states.filter(id => acceptSet.has(id))

      const transientAutomaton: DFA = {
        states: snap.states.map(id => ({ id })),
        transitions: snap.transitions,
        startState: result.dfa.startState,
        acceptStates: snapAccepts,
        alphabet: result.dfa.alphabet,
      }

      // highlightStates: the pair added at this step (.active treatment).
      const highlight: string[] = []
      if (snap.added) {
        highlight.push(`(${snap.added.a},${snap.added.b})`)
      }

      return {
        transientAutomaton,
        highlightStates: highlight,
        stepNote: snap.note,
        currentStage: '',
      }
    }

    if (closureResult.kind === 'complement') {
      const steps: ComplementStep[] = closureResult.data.steps
      const snap = steps[clampedStep]
      if (!snap) return { transientAutomaton: null, highlightStates: [], stepNote: '', currentStage: '' }

      // For complement, use the step's own DFA directly.
      // At 'completed' stage, highlight the trap and targets of added edges
      // so the completion is the .active focus.
      const highlight: string[] = []
      if (snap.stage === 'completed') {
        if (snap.addedTrap) highlight.push('∅')
        if (snap.addedEdges) {
          for (const e of snap.addedEdges) {
            if (e.to !== '∅') highlight.push(e.to)
          }
          // Always include trap in highlight so it is visible as .active
          if (!highlight.includes('∅')) highlight.push('∅')
        }
      }
      // At 'flipped' stage, highlight states whose accept role changed (the
      // new acceptStates that were not accepting before completion).
      // This is optional guidance; the double-ring moving is the primary cue.

      return {
        transientAutomaton: snap.dfa as DFA,
        highlightStates: highlight,
        stepNote: snap.note,
        currentStage: snap.stage,
      }
    }

    return { transientAutomaton: null, highlightStates: [], stepNote: '', currentStage: '' }
  }, [closureResult, clampedStep])

  const modeBtnClass = (m: ClosureMode) =>
    'min-h-[44px] px-4 rounded-lg text-sm font-medium transition-colors border ' +
    (closureMode === m
      ? 'bg-brand-tint text-brand-hover border-brand/30'
      : 'bg-surface-raised text-text-mid border-border hover:text-text-hi hover:border-border-strong')

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      {/* Page header */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <h2 className="text-2xl font-display font-semibold text-text-hi">
          Closure Constructions
        </h2>
        <p className="text-sm text-text-mid mt-1">
          Product automaton (union, intersection) and complement construction, step by step.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={closureMode === 'union'}
            onClick={() => handleModeChange('union')}
            className={modeBtnClass('union')}
            data-testid="closure-mode-union"
          >
            Union
          </button>
          <button
            type="button"
            aria-pressed={closureMode === 'intersection'}
            onClick={() => handleModeChange('intersection')}
            className={modeBtnClass('intersection')}
            data-testid="closure-mode-intersection"
          >
            Intersection
          </button>
          <button
            type="button"
            aria-pressed={closureMode === 'complement'}
            onClick={() => handleModeChange('complement')}
            className={modeBtnClass('complement')}
            data-testid="closure-mode-complement"
          >
            Complement
          </button>
        </div>
      </div>

      {/* Source selection */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3">
          {/* Source A */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono text-text-low">
              {closureMode === 'complement' ? 'Source:' : 'Source A:'}
            </span>
            <div className="flex flex-wrap gap-2">
              {GNFA_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetA(preset.id)}
                  className={
                    'px-3 min-h-[44px] rounded-lg text-sm font-mono transition-colors border ' +
                    (specA.kind === 'preset' && specA.id === preset.id
                      ? 'bg-brand-tint text-brand-hover border-brand/30'
                      : 'bg-surface-raised text-text-mid border-border hover:text-text-hi hover:border-border-strong')
                  }
                  aria-pressed={specA.kind === 'preset' && specA.id === preset.id}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <label
                htmlFor="closure-regex-a"
                className="shrink-0 text-xs font-mono text-text-low"
              >
                Regex:
              </label>
              <input
                id="closure-regex-a"
                data-testid="closure-regex-a"
                type="text"
                value={regexA}
                onChange={e => handleRegexA(e.target.value)}
                placeholder="e.g. (a+b)*abb"
                spellCheck={false}
                className="flex-1 min-w-0 bg-transparent font-mono text-text-hi text-sm focus:outline-none placeholder:text-text-low"
              />
              {parseErrorA && (
                <span className="text-xs text-error shrink-0">{parseErrorA}</span>
              )}
            </div>
          </div>

          {/* Source B — only shown for product modes */}
          {closureMode !== 'complement' && (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <span className="text-xs font-mono text-text-low">Source B:</span>
              <div className="flex flex-wrap gap-2">
                {GNFA_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetB(preset.id)}
                    className={
                      'px-3 min-h-[44px] rounded-lg text-sm font-mono transition-colors border ' +
                      (specB.kind === 'preset' && specB.id === preset.id
                        ? 'bg-brand-tint text-brand-hover border-brand/30'
                        : 'bg-surface-raised text-text-mid border-border hover:text-text-hi hover:border-border-strong')
                    }
                    aria-pressed={specB.kind === 'preset' && specB.id === preset.id}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="closure-regex-b"
                  className="shrink-0 text-xs font-mono text-text-low"
                >
                  Regex:
                </label>
                <input
                  id="closure-regex-b"
                  data-testid="closure-regex-b"
                  type="text"
                  value={regexB}
                  onChange={e => handleRegexB(e.target.value)}
                  placeholder="e.g. a*b"
                  spellCheck={false}
                  className="flex-1 min-w-0 bg-transparent font-mono text-text-hi text-sm focus:outline-none placeholder:text-text-low"
                />
                {parseErrorB && (
                  <span className="text-xs text-error shrink-0">{parseErrorB}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-8 flex-1 flex flex-col gap-4">
        {/* Persistent accepting condition legend */}
        <AcceptingLegend mode={closureMode} />

        {closureResult.kind === 'too-large' ? (
          <div className="p-4">
            <TooLargeNotice
              message={closureResult.message}
              partial={closureResult.partial}
            />
          </div>
        ) : closureResult.kind !== 'none' ? (
          <>
            {/* Graph region */}
            <div
              data-testid="closure-canvas"
              className="rounded-xl border border-border bg-surface overflow-hidden"
              style={{ minHeight: '420px' }}
            >
              {transientAutomaton && (
                <AutomatonGraph
                  automaton={transientAutomaton}
                  highlightStates={highlightStates}
                />
              )}
            </div>

            {/* Stage indicator for complement (CLOSURE-03: completion before flip) */}
            {closureMode === 'complement' && currentStage && (
              <div
                data-testid="closure-stage"
                className="rounded-xl border border-border bg-surface p-3 flex flex-col gap-1"
              >
                <span className="text-xs font-sans text-text-low uppercase tracking-wide">
                  Stage
                </span>
                <span className="text-sm font-mono text-text-hi">
                  {currentStage === 'original' && 'original — DFA before completion'}
                  {currentStage === 'completed' && 'completed — trap ∅ and missing edges added'}
                  {currentStage === 'flipped' && 'flipped — accepting and non-accepting states swapped'}
                </span>
              </div>
            )}

            {/* Controls */}
            <div className="rounded-xl border border-border bg-surface p-4">
              <ClosureControls
                currentStep={clampedStep}
                totalSteps={totalSteps}
                isPlaying={isPlaying}
                speed={speed}
                reducedMotion={reducedMotion}
                onPrev={handlePrev}
                onNext={handleNext}
                onPlay={handlePlay}
                onPause={handlePause}
                onSpeedChange={handleSpeedChange}
              />
            </div>

            {/* Step note */}
            {stepNote && (
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
                <span className="text-xs font-sans text-text-low uppercase tracking-wide">
                  Step {clampedStep + 1} of {totalSteps}
                </span>
                <span className="text-sm font-mono text-text-mid">{stepNote}</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-border bg-surface p-8 text-sm text-text-low min-h-[200px]">
            Select sources above to begin the construction.
          </div>
        )}
      </div>
    </div>
  )
}
