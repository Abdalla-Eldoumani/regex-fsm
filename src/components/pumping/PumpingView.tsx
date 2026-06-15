import { useState, useEffect, useCallback, useRef } from 'react'
import type { JSX } from 'react'
import {
  NONREGULAR_LANGUAGES,
} from '@/core/pumping/nonRegularLanguages'
import type { NonRegularLanguage } from '@/core/pumping/nonRegularLanguages'
import {
  validateWitness,
  validateSplit,
  chooseWorstSplit,
  findPumpExit,
  playDemoRound,
} from '@/core/pumping/pumpingGame'
import type { Stage, Split, GameState } from '@/core/pumping/pumpingGame'
import { PUMPING_BOUNDS, assertPumpedLengthWithin } from '@/core/pumping/pumpingBounds'
import { useNotation } from '@/notation/useNotation'
import { LanguagePicker } from './LanguagePicker'
import { SplitTape } from './SplitTape'
import { StageExplanation } from './StageExplanation'
import { PumpingControls } from './PumpingControls'

// PumpingView: the /pumping route component. Implements the adversarial pumping-lemma
// game from §4.3.2 of the course PDF. Role assignment (A2): student = PROVER (picks w
// and i), tool = ADVERSARY (picks p and the worst-case split via chooseWorstSplit).
// A demo mode lets the tool play all four moves so students can see a complete round.
//
// The BL-01 staleness-guard pattern (from NfaToRegexView and ClosureView) is the key:
// stage state is keyed by selectedLanguageId + '::' + mode. Whenever the language or
// mode changes, a new key is generated and the step resets to 0. This prevents the
// "resume at split stage for a different language" bug (Pitfall 4).
//
// Auto-play (for demo mode) is suppressed under reducedMotion (ClosureView pattern).
// The interval is always cleared on key/step change and on unmount (T-08-DOS / Pitfall 6).

type Mode = 'play' | 'demo'

// The stages in display order. The step counter maps to this index.
const STAGES: Stage[] = ['pick-p', 'choose-w', 'split', 'choose-i', 'verdict']

// A fixed tool-chosen p for the play mode. This is a sensible pedagogical value:
// small enough that witnesses stay readable, large enough to require thought.
const TOOL_P = 4

// Build the stage staleness key.
function makeStageKey(languageId: string, mode: Mode): string {
  return `${languageId}::${mode}`
}

// Explanation copy for each stage (plain language + course notation). The course-
// notation tie (A1): the contradiction copy explicitly names the repeated y-block as
// the course's "cycle of edges" from §4.3.2 / Example 4.24. The view does not
// reproduce the full state-repetition proof; it just names the mechanism so students
// can look it up.
function buildExplanation(
  stage: Stage,
  lang: NonRegularLanguage,
  p: number,
  w: string | null,
  split: Split | null,
  i: number | null,
  result: { pumped: string; inLanguage: boolean } | null,
  emptyGlyph: string,
): { plain: string; notation: string; tone?: 'info' | 'contradiction' } {
  const lambdaDisplay = (s: string) => (s === '' ? emptyGlyph : s)

  switch (stage) {
    case 'pick-p':
      return {
        plain: `The adversary commits to a pumping length p = ${p}. Every word you choose in the language must be at least this long.`,
        notation: `p = ${p}`,
      }
    case 'choose-w':
      return {
        plain: `You (the prover) choose a witness word w in L with |w| ≥ p = ${p}. The adversary will try to split it.`,
        notation: w
          ? `w = ${lambdaDisplay(w)}, |w| = ${w.length} ≥ p = ${p}`
          : `Choose w ∈ ${lang.label} with |w| ≥ ${p}`,
      }
    case 'split':
      if (!split) {
        return {
          plain: 'The adversary chooses the split w = xyz with |xy| ≤ p and |y| ≥ 1.',
          notation: `w = xyz, |xy| ≤ ${p}, |y| ≥ 1`,
        }
      }
      return {
        plain: `The adversary picks the worst-case split: x = "${lambdaDisplay(split.x)}", y = "${lambdaDisplay(split.y)}", z = "${lambdaDisplay(split.z)}". The y-block is the repeated segment — the cycle of edges in the DFA proof (§4.3.2).`,
        notation: `x = ${lambdaDisplay(split.x)}, y = ${lambdaDisplay(split.y)}, z = ${lambdaDisplay(split.z)}; |xy| = ${split.x.length + split.y.length} ≤ ${p}, |y| = ${split.y.length} ≥ 1`,
      }
    case 'choose-i':
      return {
        plain: `You (the prover) choose a pump exponent i ≠ 1. You need xy${i !== null ? `^${i}` : '^i'}z to fall outside L.`,
        notation: i !== null
          ? `i = ${i}; xy^i z = x${split ? split.y.repeat(i) : 'y^i'}z`
          : `Choose i ∈ {0, 2, 3, ...}`,
      }
    case 'verdict':
      if (!result) {
        return { plain: 'Running the oracle...', notation: '...' }
      }
      if (!result.inLanguage) {
        return {
          plain: `Contradiction! xy^${i}z = "${result.pumped}" is NOT in ${lang.label}. The pumped block y is the repeated cycle from §4.3.2: traversing it ${i} times instead of once breaks the word count invariant, proving ${lang.label} is non-regular.`,
          notation: `xy^${i}z = ${result.pumped} ∉ ${lang.label}`,
          tone: 'contradiction',
        }
      }
      return {
        plain: `xy^${i}z = "${result.pumped}" is still in ${lang.label}. Choose a different i.`,
        notation: `xy^${i}z = ${result.pumped} ∈ ${lang.label}`,
      }
  }
}

export default function PumpingView(): JSX.Element {
  const { glyphs } = useNotation()

  // Language selection — never blank (NONREGULAR_LANGUAGES[0] is always present).
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>(
    NONREGULAR_LANGUAGES[0].id
  )
  const [mode, setMode] = useState<Mode>('play')

  // Staleness guard: {key, step} keyed by languageId + mode (BL-01 / Pitfall 4).
  const [stageState, setStageState] = useState<{ key: string; step: number }>({
    key: makeStageKey(NONREGULAR_LANGUAGES[0].id, 'play'),
    step: 0,
  })

  // Auto-play state.
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1000)

  // Reduced-motion: read from matchMedia on mount and track changes (ClosureView pattern).
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

  // Per-move state for play mode.
  const [witnessInput, setWitnessInput] = useState<string>('')
  const [witnessError, setWitnessError] = useState<string | null>(null)
  const [iInput, setIInput] = useState<number>(0)

  // Demo state: a completed GameState produced by playDemoRound.
  const [demoState, setDemoState] = useState<GameState | null>(null)

  const lang = NONREGULAR_LANGUAGES.find(l => l.id === selectedLanguageId) ?? NONREGULAR_LANGUAGES[0]
  const p = TOOL_P

  // Compute current stage key and step.
  const currentKey = makeStageKey(selectedLanguageId, mode)
  const rawStep = stageState.key === currentKey ? stageState.step : 0
  const totalSteps = STAGES.length
  const clampedStep = Math.min(rawStep, totalSteps - 1)
  const currentStage = STAGES[clampedStep]

  // Derive the witness to use for the current round. In play mode it is the user's
  // input (with the suggestion pre-filled when they enter the choose-w stage). In
  // demo mode it is the tool's choice from playDemoRound.
  const effectiveWitness: string | null = (() => {
    if (mode === 'demo' && demoState) return demoState.w
    if (witnessInput !== '') return witnessInput
    return null
  })()

  // Derive split. In play mode the adversary splits after witness is accepted.
  // In demo mode the split comes from demoState.
  const effectiveSplit: Split | null = (() => {
    if (mode === 'demo' && demoState) return demoState.split
    if (effectiveWitness !== null && clampedStep >= 2) {
      return chooseWorstSplit(lang, p, effectiveWitness)
    }
    return null
  })()

  // Derive i. In play mode: the user's chosen stepper value. In demo mode: from demoState.
  const effectiveI: number | null = (() => {
    if (mode === 'demo' && demoState) return demoState.i
    if (clampedStep >= 3) return iInput
    return null
  })()

  // Derive the verdict result.
  const effectiveResult: { pumped: string; inLanguage: boolean } | null = (() => {
    if (mode === 'demo' && demoState) return demoState.result
    if (clampedStep === 4 && effectiveSplit !== null && effectiveI !== null) {
      try {
        const len = effectiveSplit.x.length + effectiveI * effectiveSplit.y.length + effectiveSplit.z.length
        assertPumpedLengthWithin(len)
        const pumped = effectiveSplit.x + effectiveSplit.y.repeat(effectiveI) + effectiveSplit.z
        return { pumped, inLanguage: lang.member(pumped) }
      } catch {
        return null
      }
    }
    return null
  })()

  // Explanation for the current stage.
  const explanation = buildExplanation(
    currentStage,
    lang,
    p,
    effectiveWitness,
    effectiveSplit,
    effectiveI,
    effectiveResult,
    glyphs.empty,
  )

  // Compute the canonical i suggestion for the choose-i stage (the proven pump exit).
  const suggestedI: number | null = (() => {
    if (effectiveSplit === null) return null
    return findPumpExit(lang.member, effectiveSplit)
  })()

  // When entering choose-i stage, pre-fill with the canonical exit if available.
  const prevStepRef = useRef(clampedStep)
  useEffect(() => {
    if (clampedStep === 3 && prevStepRef.current !== 3 && suggestedI !== null) {
      setIInput(suggestedI)
    }
    prevStepRef.current = clampedStep
  }, [clampedStep, suggestedI])

  // Language change: reset stage, clear play-mode inputs, recompute demo (BL-01 / Pitfall 4).
  const handleLanguageSelect = useCallback((id: string) => {
    setSelectedLanguageId(id)
    setIsPlaying(false)
    setWitnessInput('')
    setWitnessError(null)
    setIInput(0)
    setDemoState(null)
    const newKey = makeStageKey(id, mode)
    setStageState({ key: newKey, step: 0 })
  }, [mode])

  // Mode change: same reset (BL-01).
  const handleModeChange = useCallback((m: Mode) => {
    setMode(m)
    setIsPlaying(false)
    setWitnessInput('')
    setWitnessError(null)
    setIInput(0)
    const newKey = makeStageKey(selectedLanguageId, m)
    setStageState({ key: newKey, step: 0 })
    if (m === 'demo') {
      // Pre-compute the demo round so it is ready immediately.
      setDemoState(playDemoRound(lang, p))
    } else {
      setDemoState(null)
    }
  }, [selectedLanguageId, lang, p])

  // Attempt to advance to the next stage. Returns false and shows an error if
  // the current stage has an unresolved gate.
  const tryAdvance = useCallback((): boolean => {
    if (currentStage === 'choose-w' && mode === 'play') {
      const w = witnessInput !== '' ? witnessInput : lang.witness(p)
      const v = validateWitness(lang, p, w)
      if (!v.ok) {
        setWitnessError(v.message)
        return false
      }
      setWitnessInput(w)
      setWitnessError(null)
    }
    if (currentStage === 'split' && mode === 'play' && effectiveSplit !== null) {
      const v = validateSplit(p, effectiveSplit)
      if (!v.ok) {
        setWitnessError(v.message)
        return false
      }
    }
    return true
  }, [currentStage, mode, witnessInput, lang, p, effectiveSplit])

  // Step control handlers (ClosureView pattern).
  const handleNext = useCallback(() => {
    if (clampedStep >= totalSteps - 1) return
    if (!tryAdvance()) return
    setIsPlaying(false)
    setStageState({ key: currentKey, step: clampedStep + 1 })
  }, [clampedStep, totalSteps, tryAdvance, currentKey])

  const handlePrev = useCallback(() => {
    if (clampedStep === 0) return
    setIsPlaying(false)
    setStageState({ key: currentKey, step: clampedStep - 1 })
  }, [clampedStep, currentKey])

  const handlePlay = useCallback(() => {
    if (reducedMotion || clampedStep >= totalSteps - 1) return
    if (clampedStep >= totalSteps - 1) {
      setStageState({ key: currentKey, step: 0 })
    }
    setIsPlaying(true)
  }, [reducedMotion, clampedStep, totalSteps, currentKey])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const handleSpeedChange = useCallback((ms: number) => {
    setSpeed(ms)
  }, [])

  // Auto-play interval. Never fires under reducedMotion. Cleared on key/unmount (T-08-DOS).
  useEffect(() => {
    if (!isPlaying || reducedMotion || clampedStep >= totalSteps - 1) return
    const interval = setInterval(() => {
      setStageState(prev => {
        const next = prev.step + 1
        if (next >= totalSteps) {
          setIsPlaying(false)
          return prev
        }
        return { key: prev.key, step: next }
      })
    }, speed)
    return () => clearInterval(interval)
  }, [isPlaying, speed, reducedMotion, clampedStep, totalSteps])

  // Stage card class: applies .active treatment to the currently-shown stage.
  // Inactive cards use text-text-mid (not text-text-low + opacity-60) so the
  // text stays above the WCAG AA 4.5:1 contrast floor when the card is dimmed.
  const stageCardClass = (idx: number) =>
    'rounded-xl border p-4 flex flex-col gap-2 transition-colors ' +
    (idx === clampedStep
      ? 'is-active border-state-active bg-state-active-soft'
      : 'border-border bg-surface')

  // Suggest-witness button: fills the input with the proven witness for this p.
  const handleSuggestWitness = useCallback(() => {
    const suggested = lang.witness(p)
    setWitnessInput(suggested)
    setWitnessError(null)
  }, [lang, p])

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      {/* Page header */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <h2 className="text-2xl font-display font-semibold text-text-hi">
          Pumping Lemma
        </h2>
        <p className="text-sm text-text-mid mt-1">
          Adversarial non-regularity game. You are the prover; the tool is the adversary.
        </p>
      </div>

      {/* Language picker + mode toggle */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
          <LanguagePicker
            languages={NONREGULAR_LANGUAGES}
            selectedId={selectedLanguageId}
            onSelect={handleLanguageSelect}
          />
          {/* Play / Demo mode toggle */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
            <button
              type="button"
              aria-pressed={mode === 'play'}
              onClick={() => handleModeChange('play')}
              data-testid="pumping-mode-play"
              className={
                'px-4 min-h-[44px] rounded-lg text-sm font-medium transition-colors border ' +
                (mode === 'play'
                  ? 'bg-brand-tint text-brand-hover border-brand/30'
                  : 'bg-surface-raised text-text-mid border-border hover:text-text-hi hover:border-border-strong')
              }
            >
              Play (you choose w and i)
            </button>
            <button
              type="button"
              aria-pressed={mode === 'demo'}
              onClick={() => handleModeChange('demo')}
              data-testid="pumping-mode-demo"
              className={
                'px-4 min-h-[44px] rounded-lg text-sm font-medium transition-colors border ' +
                (mode === 'demo'
                  ? 'bg-brand-tint text-brand-hover border-brand/30'
                  : 'bg-surface-raised text-text-mid border-border hover:text-text-hi hover:border-border-strong')
              }
            >
              Demo (tool plays a full round)
            </button>
          </div>
        </div>
      </div>

      {/* Stage cards */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4 flex flex-col gap-3">

        {/* Stage 0: pick-p */}
        <div className={stageCardClass(0)}>
          <span className="text-xs font-mono text-text-mid uppercase tracking-wide">
            Stage 1 — Adversary picks p
          </span>
          <p className="font-sans text-sm text-text-hi">
            The adversary commits to pumping length <span className="font-mono">p = {p}</span>.
          </p>
        </div>

        {/* Stage 1: choose-w */}
        <div className={stageCardClass(1)}>
          <span className="text-xs font-mono text-text-mid uppercase tracking-wide">
            Stage 2 — You (prover) choose witness w
          </span>
          {clampedStep === 1 && mode === 'play' ? (
            <div className="flex flex-col gap-2">
              <p className="font-sans text-sm text-text-mid">
                Choose a word in <span className="font-mono">{lang.label}</span> with length ≥ {p}.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={witnessInput}
                  onChange={e => {
                    setWitnessInput(e.target.value)
                    setWitnessError(null)
                  }}
                  placeholder={`e.g. ${lang.witness(p)}`}
                  spellCheck={false}
                  maxLength={PUMPING_BOUNDS.MAX_WITNESS_LEN}
                  data-testid="pumping-witness-input"
                  className="flex-1 min-w-0 min-h-[44px] bg-surface-raised border border-border rounded-lg px-3 font-mono text-sm text-text-hi focus-visible:outline-none placeholder:text-text-low"
                />
                <button
                  type="button"
                  onClick={handleSuggestWitness}
                  className="px-3 min-h-[44px] rounded-lg text-sm font-medium bg-surface-raised border border-border text-text-mid hover:text-text-hi hover:border-border-strong transition-colors"
                >
                  Use suggestion
                </button>
              </div>
              {witnessError && (
                // Inline rejection message. text-error paired with text (UI-SPEC gate 2).
                <p className="text-sm text-error" data-testid="pumping-witness-error">
                  {witnessError}
                </p>
              )}
            </div>
          ) : (
            <p className="font-mono text-sm text-text-mid">
              {effectiveWitness !== null
                ? `w = ${effectiveWitness}`
                : mode === 'demo'
                ? `w = ${lang.witness(p)}`
                : 'Advance to this stage to choose w.'}
            </p>
          )}
        </div>

        {/* Stage 2: split */}
        <div className={stageCardClass(2)}>
          <span className="text-xs font-mono text-text-mid uppercase tracking-wide">
            Stage 3 — Adversary splits w = xyz
          </span>
          {clampedStep >= 2 && effectiveSplit !== null ? (
            <div className="flex flex-col gap-2">
              <div className="overflow-x-auto">
                <SplitTape
                  x={effectiveSplit.x}
                  y={effectiveSplit.y}
                  z={effectiveSplit.z}
                />
              </div>
              <p className="font-mono text-xs text-text-mid">
                |xy| = {effectiveSplit.x.length + effectiveSplit.y.length} ≤ p = {p} &nbsp;|&nbsp;
                |y| = {effectiveSplit.y.length} ≥ 1
              </p>
            </div>
          ) : (
            <p className="font-sans text-sm text-text-mid">
              The adversary chooses a legal split once you have set the witness.
            </p>
          )}
        </div>

        {/* Stage 3: choose-i */}
        <div className={stageCardClass(3)}>
          <span className="text-xs font-mono text-text-mid uppercase tracking-wide">
            Stage 4 — You (prover) choose pump exponent i
          </span>
          {clampedStep === 3 && mode === 'play' ? (
            <div className="flex flex-col gap-2">
              <p className="font-sans text-sm text-text-mid">
                Choose i ≠ 1. You need xy^i z to land outside <span className="font-mono">{lang.label}</span>.
                {suggestedI !== null && (
                  <span className="font-mono text-text-hi ml-1">(suggested: i = {suggestedI})</span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIInput(prev => Math.max(0, prev === 1 ? 0 : prev - 1))}
                  className="w-10 min-h-[44px] bg-surface-raised border border-border rounded-lg text-text-hi font-mono hover:border-border-strong transition-colors"
                  aria-label="Decrease i"
                >
                  -
                </button>
                <span
                  className="min-w-[3rem] text-center font-mono text-text-hi text-lg"
                  data-testid="pumping-i-display"
                >
                  {iInput}
                </span>
                <button
                  type="button"
                  onClick={() => setIInput(prev => {
                    const next = prev + 1 === 1 ? 2 : prev + 1
                    return Math.min(next, PUMPING_BOUNDS.MAX_I)
                  })}
                  className="w-10 min-h-[44px] bg-surface-raised border border-border rounded-lg text-text-hi font-mono hover:border-border-strong transition-colors"
                  aria-label="Increase i"
                >
                  +
                </button>
                {suggestedI !== null && (
                  <button
                    type="button"
                    onClick={() => setIInput(suggestedI)}
                    className="px-3 min-h-[44px] rounded-lg text-sm bg-surface-raised border border-border text-text-mid hover:text-text-hi hover:border-border-strong transition-colors"
                  >
                    Use suggestion
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="font-mono text-sm text-text-mid">
              {effectiveI !== null ? `i = ${effectiveI}` : 'Advance to this stage to choose i.'}
            </p>
          )}
        </div>

        {/* Stage 4: verdict */}
        <div className={stageCardClass(4)}>
          <span className="text-xs font-mono text-text-mid uppercase tracking-wide">
            Stage 5 — Verdict
          </span>
          {clampedStep === 4 && effectiveResult !== null ? (
            <div className="flex flex-col gap-2">
              <p className="font-mono text-sm text-text-hi" data-testid="pumping-pumped-word">
                xy^{effectiveI}z = {effectiveResult.pumped}
              </p>
              {!effectiveResult.inLanguage ? (
                // Contradiction: the real, predicate-verified result (not asserted).
                <p className="font-sans text-sm text-error font-medium" data-testid="pumping-verdict-contradiction">
                  {effectiveResult.pumped} ∉ {lang.label} — contradiction!
                </p>
              ) : (
                <p className="font-sans text-sm text-text-mid">
                  {effectiveResult.pumped} ∈ {lang.label} — still in L. Choose a different i.
                </p>
              )}
            </div>
          ) : (
            <p className="font-sans text-sm text-text-mid">
              The verdict will appear once all moves are made.
            </p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <PumpingControls
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
      </div>

      {/* Stage explanation (dual plain + notation) */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <StageExplanation
          plain={explanation.plain}
          notation={explanation.notation}
          tone={explanation.tone}
        />
      </div>
    </div>
  )
}
