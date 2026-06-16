import { useState, useMemo, useEffect, useCallback } from 'react'
import type { JSX } from 'react'
import { nfaToRegex, toRegexNode, GNFA_START, GNFA_ACCEPT } from '@/core/algorithms/gnfa'
import type { GnfaSnapshot, NfaToRegexResult } from '@/core/algorithms/gnfa'
import { GNFA_PRESETS, regexToSourceNfa } from '@/core/algorithms/gnfaPresets'
import { RegexResultPanel } from './RegexResultPanel'
import { EliminationControls } from './EliminationControls'
import { AutomatonGraph } from '@/visualization/renderer'
import { GraphSummary } from '@/components/a11y'
import { TooLargeNotice } from '@/components/common/TooLargeNotice'
import { TooLargeError, BOUNDS } from '@/core/automata/types'
import type { NFA } from '@/core/automata/types'
import { formatRegex } from '@/notation/format'
import { useNotation } from '@/notation/useNotation'

// Map the GNFA sentinel ids to short readable display ids.
// "__gnfa_start__" -> "S", "__gnfa_accept__" -> "A".
// Any other id is returned unchanged.
function mapMarkerId(id: string): string {
  if (id === GNFA_START) return 'S'
  if (id === GNFA_ACCEPT) return 'A'
  return id
}

// Build a transient display NFA from a GNFA snapshot so AutomatonGraph can
// render it with regex-labeled edges in course notation.
//
// Each snapshot edge carries a GnfaLabel. We convert it to a RegexNode via
// toRegexNode and format it with formatRegex, then store the resulting string
// in the transition's `symbol` field. automatonToCytoscape uses symbol as the
// edge label (label: t.symbol ?? 'λ'), so the formatted regex appears on the edge.
//
// Emptyset edges are skipped (they carry no information and would clutter the graph).
// The new START ("S") gets the start arrow; the new ACCEPT ("A") is the sole accept
// state so it gets the double ring.
function snapshotToAutomaton(
  snap: GnfaSnapshot,
  mode: import('@/notation/glyphs').NotationMode
): NFA {
  const mappedStates = snap.states.map(id => ({ id: mapMarkerId(id) }))

  const transitions = snap.edges
    .filter(e => e.label.type !== 'emptyset')
    .map(e => {
      // toRegexNode converts GnfaLabel -> RegexNode for the formatter.
      // Emptyset labels are already filtered above (T-06-09).
      const rn = toRegexNode(e.label)
      const labelStr = formatRegex(rn, mode)
      return {
        from: mapMarkerId(e.from),
        to: mapMarkerId(e.to),
        symbol: labelStr,
      }
    })

  return {
    states: mappedStates,
    transitions,
    startState: mapMarkerId(GNFA_START),
    acceptStates: [mapMarkerId(GNFA_ACCEPT)],
    alphabet: new Set<string>(),
  }
}

// Derivation result for a given source NFA.
interface DerivationState {
  result: NfaToRegexResult | null
  tooLarge: { message: string; partial?: { states: number } } | null
}

function deriveFromSource(source: NFA): DerivationState {
  // Guard against a source that exceeds the cap before elimination (T-06-08).
  // Reuses the Phase 4 cap (BOUNDS.MAX_DFA_STATES = 256).
  if (source.states.length > BOUNDS.MAX_DFA_STATES) {
    return {
      result: null,
      tooLarge: {
        message: `This automaton is too large to render here (exceeded ${BOUNDS.MAX_DFA_STATES} states).`,
        partial: { states: source.states.length },
      },
    }
  }
  try {
    const result = nfaToRegex(source)
    return { result, tooLarge: null }
  } catch (e) {
    if (e instanceof TooLargeError) {
      return { result: null, tooLarge: { message: e.message, partial: e.partial } }
    }
    throw e
  }
}

// Default to the first preset so the view is never blank on load.
const DEFAULT_PRESET_ID = GNFA_PRESETS[0].id

export default function NfaToRegexView(): JSX.Element {
  const { mode } = useNotation()

  // Source selection state.
  const [sourceSpec, setSourceSpec] = useState<
    { kind: 'preset'; id: string } | { kind: 'regex'; src: string }
  >({ kind: 'preset', id: DEFAULT_PRESET_ID })

  // The regex text input and its debounced value.
  const [regexInput, setRegexInput] = useState('')
  const [debouncedRegex, setDebouncedRegex] = useState('')

  // Step key: tracks which source is "active" so we can derive the correct step.
  // This is the same pattern as MultiView's selectionState.source staleness check:
  // storing the source identity alongside the step avoids setState-in-effect.
  const [stepState, setStepState] = useState<{ key: string; step: number }>({
    key: DEFAULT_PRESET_ID,
    step: 0,
  })

  // Play/speed controls.
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1000)

  // Reduced-motion: read matchMedia on mount and track changes.
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
    const timer = setTimeout(() => setDebouncedRegex(regexInput), 300)
    return () => clearTimeout(timer)
  }, [regexInput])

  // Source key: the stable identity string for the current source.
  // Changes when the user picks a different preset or types a different regex.
  const sourceKey =
    sourceSpec.kind === 'preset' ? sourceSpec.id : debouncedRegex

  // Preset selection handler.
  const handlePresetSelect = useCallback((id: string) => {
    setSourceSpec({ kind: 'preset', id })
    setRegexInput('')
    setDebouncedRegex('')
    setStepState({ key: id, step: 0 })
    setIsPlaying(false)
  }, [])

  // Regex input handler: switches to the regex source path.
  // Stop any running timer before the source changes so the interval cannot
  // advance stepState against the old source during the 300ms debounce window.
  const handleRegexInput = useCallback((value: string) => {
    setIsPlaying(false)
    setRegexInput(value)
    if (value.trim()) {
      setSourceSpec({ kind: 'regex', src: value })
    }
  }, [])

  // Compute the source NFA from the current spec.
  const { sourceNfa, parseError } = useMemo<{
    sourceNfa: NFA | null
    parseError: string | null
  }>(() => {
    if (sourceSpec.kind === 'preset') {
      const preset = GNFA_PRESETS.find(p => p.id === sourceSpec.id)
      if (!preset) return { sourceNfa: null, parseError: 'Unknown preset' }
      return { sourceNfa: preset.nfa, parseError: null }
    }
    const src = debouncedRegex.trim()
    if (!src) return { sourceNfa: null, parseError: null }
    try {
      return { sourceNfa: regexToSourceNfa(src), parseError: null }
    } catch (e) {
      return {
        sourceNfa: null,
        parseError: e instanceof Error ? e.message : 'Parse error',
      }
    }
  }, [sourceSpec, debouncedRegex])

  // Derive the NFA-to-regex result from the source NFA.
  const derivation = useMemo<DerivationState>(() => {
    if (!sourceNfa) return { result: null, tooLarge: null }
    return deriveFromSource(sourceNfa)
  }, [sourceNfa])

  // Effective step: if the key has changed since the step was stored, use 0.
  // This replaces setState-in-effect for source resets (MultiView pattern).
  const totalSteps = derivation.result?.steps.length ?? 0
  const rawStep = stepState.key === sourceKey ? stepState.step : 0
  const clampedStep = totalSteps > 0 ? Math.min(rawStep, totalSteps - 1) : 0

  // Auto-play interval: advance step every `speed` ms.
  // Under reducedMotion, never auto-advance (UI-SPEC static step-through).
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

  // Step control handlers.
  const handlePrev = useCallback(() => {
    setIsPlaying(false)
    setStepState(prev => ({
      key: sourceKey,
      step: Math.max(0, (prev.key === sourceKey ? prev.step : 0) - 1),
    }))
  }, [sourceKey])

  const handleNext = useCallback(() => {
    // Guard: totalSteps === 0 means no derivation result yet; do nothing so
    // stepState never receives -1 from Math.min(totalSteps - 1, ...).
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

  // Build the transient automaton for the current snapshot.
  const currentSnapshot: GnfaSnapshot | null =
    derivation.result?.steps[clampedStep] ?? null

  const transientAutomaton = useMemo(() => {
    if (!currentSnapshot) return null
    return snapshotToAutomaton(currentSnapshot, mode)
  }, [currentSnapshot, mode])

  // The eliminated state id in the transient automaton's id space.
  const highlightStates = useMemo<string[]>(() => {
    if (!currentSnapshot?.eliminated) return []
    return [mapMarkerId(currentSnapshot.eliminated)]
  }, [currentSnapshot])

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      {/* Page header */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <h2 className="text-2xl font-display font-semibold text-text-hi">
          NFA to Regex
        </h2>
        <p className="text-sm text-text-mid mt-1">
          GNFA state elimination: select a source NFA or type a regex and step through the construction.
        </p>
      </div>

      {/* Source selection bar */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3">
          {/* Preset buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-text-low shrink-0">Preset:</span>
            {GNFA_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetSelect(preset.id)}
                className={
                  'px-3 min-h-[44px] rounded-lg text-sm font-mono transition-colors border ' +
                  (sourceSpec.kind === 'preset' && sourceSpec.id === preset.id
                    ? 'bg-brand-tint text-brand-hover border-brand/30'
                    : 'bg-surface-raised text-text-mid border-border hover:text-text-hi hover:border-border-strong')
                }
                aria-pressed={
                  sourceSpec.kind === 'preset' && sourceSpec.id === preset.id
                }
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Regex input */}
          <div className="flex items-center gap-3">
            <label
              htmlFor="n2r-regex-input"
              className="shrink-0 text-xs font-mono text-text-low"
            >
              Regex:
            </label>
            <input
              id="n2r-regex-input"
              data-testid="n2r-regex-input"
              type="text"
              value={regexInput}
              onChange={e => handleRegexInput(e.target.value)}
              placeholder="e.g. (a+b)*abb"
              spellCheck={false}
              className="flex-1 min-w-0 bg-transparent font-mono text-text-hi text-sm focus-visible:outline-none placeholder:text-text-low"
            />
            {parseError && (
              <span className="text-xs text-error shrink-0">{parseError}</span>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-8 flex-1 flex flex-col gap-4">
        {derivation.tooLarge ? (
          /* Too-large guard: shared TooLargeNotice (T-06-08) */
          <div className="p-4">
            <TooLargeNotice
              message={derivation.tooLarge.message}
              partial={derivation.tooLarge.partial}
            />
          </div>
        ) : derivation.result ? (
          <>
            {/* Graph region — highlighted state is the eliminated state (.active) */}
            <div
              data-testid="n2r-canvas"
              className="rounded-xl border border-border bg-surface overflow-hidden"
              style={{ minHeight: '420px' }}
            >
              {transientAutomaton && (
                <GraphSummary automaton={transientAutomaton} ariaLabel="State diagram for the current elimination step">
                  <AutomatonGraph
                    automaton={transientAutomaton}
                    highlightStates={highlightStates}
                  />
                </GraphSummary>
              )}
            </div>

            {/* Controls */}
            <div className="rounded-xl border border-border bg-surface p-4">
              <EliminationControls
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

            {/* Result panel */}
            <RegexResultPanel
              result={derivation.result}
              currentStep={clampedStep}
              mode={mode}
            />
          </>
        ) : !parseError && !derivation.tooLarge ? (
          <div className="flex items-center justify-center rounded-xl border border-border bg-surface p-8 text-sm text-text-low min-h-[200px]">
            Select a preset or enter a valid regex above.
          </div>
        ) : null}
      </div>
    </div>
  )
}
