import { useState, useMemo, useCallback } from 'react'
import type { JSX } from 'react'
import { CHALLENGES } from '@/core/challenges/bank'
import { FIND_THE_BUG } from '@/core/challenges/findTheBug'
import { gradeChallenge } from '@/core/challenges/grade'
import type { Exercise, StudentInput, GradeResult } from '@/core/challenges/types'
import { useAutomatonEditor } from '@/hooks/useAutomatonEditor'
import { AutomatonGraph } from '@/visualization/renderer'
import { GraphSummary } from '@/components/a11y'
import type { Automaton } from '@/core/automata/types'
import { TooLargeError } from '@/core/automata/types'
import { EditorPanel } from '@/components/editor/EditorPanel'
import { RegexInput } from '@/components/input/RegexInput'
import { TooLargeNotice } from '@/components/common/TooLargeNotice'
import { ResultPanel } from './ResultPanel'
import { ExercisePicker } from './ExercisePicker'

// The construction-challenge surface. A picker drives a build surface: the Phase 4
// hand editor for automaton exercises, the Phase 3 regex input for build-a-regex,
// and the editor pre-loaded with a broken machine for find-the-bug. Submit grades
// through gradeChallenge and nothing else. Grading is by language equivalence, never
// by shape (SKILL invariant 8): a correct answer of any shape passes, and a wrong
// answer carries the shortest counterexample plus the direction of the error.
//
// A too-large student construction throws TooLargeError out of gradeChallenge; every
// submit path catches it and renders the shared TooLargeNotice instead of hanging
// (SAFETY-01), mirroring ClosureView. Switching exercises clears the previous verdict
// and the previous build surface: the regex string and the result are reset here, and
// the editor subtree is remounted by a React key on the exercise id so a fresh broken
// machine loads and no stale machine survives (Pitfall 7).

// The outcome a submit produces. A graded verdict and an inline error are distinct
// from the too-large notice, which is the re-thrown SAFETY-01 path.
type SubmitOutcome =
  | { kind: 'graded'; result: GradeResult }
  | { kind: 'too-large'; message: string; partial?: { states: number } }
  | { kind: 'none' }

// Short human labels for the curated bank, keyed by exercise id. The picker shows
// these instead of the full prompt so the button row stays compact.
const CHALLENGE_LABELS: Record<string, string> = {
  'dfa-ends-ab': 'DFA: ends in ab',
  'dfa-even-as': 'DFA: even aʼs',
  'nfa-contains-aa': 'NFA: contains aa',
  'nfa-starts-a': 'NFA: starts with a',
  'regex-ends-b': 'Regex: ends in b',
}

const FIND_THE_BUG_LABELS: Record<string, string> = {
  'bug-not-starts-abc': 'Bug: not abc start',
  'bug-ends-ab': 'Bug: ends in ab',
}

// Map a find-the-bug entry to the Exercise shape the grader consumes. The broken
// machine is graded as a 'dfa'-typed build; only the reference and alphabet matter to
// gradeChallenge, which decides by language.
function bugAsExercise(id: string): Exercise | null {
  const bug = FIND_THE_BUG.find(b => b.id === id)
  if (!bug) return null
  return { id: bug.id, type: 'dfa', prompt: bug.prompt, alphabet: bug.alphabet, reference: bug.reference }
}

// Grade a StudentInput against an exercise, translating the three gradeChallenge
// outcomes (verdict, inline error, re-thrown TooLargeError) into one SubmitOutcome.
function runGrade(input: StudentInput, exercise: Exercise): SubmitOutcome {
  try {
    return { kind: 'graded', result: gradeChallenge(input, exercise) }
  } catch (e) {
    if (e instanceof TooLargeError) {
      return { kind: 'too-large', message: e.message, partial: e.partial }
    }
    throw e
  }
}

// The editor build surface for automaton exercises and find-the-bug. The
// useAutomatonEditor hook lives HERE, not in the parent, so the parent can remount
// this whole subtree with a React key on the exercise id: a remount re-runs the lazy
// reducer init, loading a fresh `initial` machine and clearing any stale edits
// (Pitfall 7). The submit button is inside this component so the built automaton
// never has to cross back up to the parent before grading.
function AutomatonBuildSurface({
  initial,
  exercise,
  onOutcome,
}: {
  initial?: Automaton
  exercise: Exercise
  onOutcome: (outcome: SubmitOutcome) => void
}): JSX.Element {
  // `automaton` is the core Automaton the hook already derives from `working` via
  // toAutomaton; it feeds the grader directly. `working` carries the editor-only
  // positions and selection the canvas and panel need.
  const { working, automaton, dispatchers } = useAutomatonEditor(initial)

  // Positional editor edge ids so canvas selection round-trips through the editor id
  // (the EditorView convention), not the array index.
  const edgeIds = useMemo(() => working.transitions.map(t => t.id), [working.transitions])

  const handleSubmit = useCallback(() => {
    onOutcome(runGrade({ kind: 'automaton', automaton }, exercise))
  }, [automaton, exercise, onOutcome])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row gap-4 min-h-0">
        <div
          data-testid="editor-canvas"
          className="relative flex-1 min-h-[420px] lg:min-h-[520px] bg-bg rounded-2xl border border-border overflow-hidden"
        >
          <GraphSummary automaton={automaton} ariaLabel="State diagram of the automaton you are building">
            <AutomatonGraph
              automaton={automaton}
              edgeIds={edgeIds}
              editable
              onAddStateAt={dispatchers.addStateAt}
              onDrawEdge={dispatchers.drawEdge}
              onSelect={dispatchers.setSelection}
            />
          </GraphSummary>
        </div>
        <div className="lg:w-72 xl:w-80 shrink-0">
          <EditorPanel working={working} dispatchers={dispatchers} />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        data-testid="challenge-submit"
        className="self-start min-h-[44px] min-w-[44px] px-5 rounded-lg text-sm font-medium bg-brand text-on-brand hover:bg-brand-hover transition-colors"
      >
        Check answer
      </button>
    </div>
  )
}

// The build-a-regex surface. The parent owns the typed value so it can be cleared on
// an exercise switch; this component renders the Phase 3 regex input and its own
// submit button.
function RegexBuildSurface({
  value,
  onChange,
  alphabet,
  onAlphabetChange,
  exercise,
  onOutcome,
}: {
  value: string
  onChange: (v: string) => void
  alphabet: string
  onAlphabetChange: (v: string) => void
  exercise: Exercise
  onOutcome: (outcome: SubmitOutcome) => void
}): JSX.Element {
  const handleSubmit = useCallback(() => {
    onOutcome(runGrade({ kind: 'regex', src: value }, exercise))
  }, [value, exercise, onOutcome])

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      <RegexInput
        value={value}
        onChange={onChange}
        alphabet={alphabet}
        onAlphabetChange={onAlphabetChange}
      />
      <button
        type="button"
        onClick={handleSubmit}
        data-testid="challenge-submit"
        className="self-start min-h-[44px] min-w-[44px] px-5 rounded-lg text-sm font-medium bg-brand text-on-brand hover:bg-brand-hover transition-colors"
      >
        Check answer
      </button>
    </div>
  )
}

export default function ChallengesView(): JSX.Element {
  // The selected exercise id. Defaults to the first curated build exercise.
  const [selectedId, setSelectedId] = useState<string>(CHALLENGES[0].id)
  // The typed regex for the build-a-regex surface, cleared on every exercise switch.
  const [regexSrc, setRegexSrc] = useState('')
  // The latest submit outcome (verdict, too-large, or none), cleared on every switch.
  const [outcome, setOutcome] = useState<SubmitOutcome>({ kind: 'none' })

  // Resolve the selection to either a curated build exercise or a find-the-bug entry.
  const challenge = useMemo(() => CHALLENGES.find(c => c.id === selectedId) ?? null, [selectedId])
  const bug = useMemo(() => FIND_THE_BUG.find(b => b.id === selectedId) ?? null, [selectedId])

  // The exercise the grader sees: the curated exercise directly, or the find-the-bug
  // entry mapped to the Exercise shape.
  const gradedExercise: Exercise | null = useMemo(
    () => challenge ?? bugAsExercise(selectedId),
    [challenge, selectedId]
  )

  // The plain-language prompt and alphabet for the current selection.
  const prompt = challenge?.prompt ?? bug?.prompt ?? ''
  const alphabet = challenge?.alphabet ?? bug?.alphabet ?? []

  // Switch exercises: clear the verdict, the too-large state, and the regex string.
  // The editor subtree resets itself via its key on selectedId, so no machine carries
  // over (Pitfall 7).
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
    setRegexSrc('')
    setOutcome({ kind: 'none' })
  }, [])

  const handleAlphabetChange = useCallback(() => {
    // The exercise alphabet is authoritative for grading (gradeChallenge uses
    // exercise.alphabet, not the input field), so the field is display-only here and
    // does not need to be wired to state. Kept as a no-op handler to satisfy the
    // RegexInput contract without introducing an unused alphabet control.
  }, [])

  const verdict =
    outcome.kind === 'graded' && outcome.result.ok ? outcome.result.verdict : null
  const inlineError =
    outcome.kind === 'graded' && !outcome.result.ok ? outcome.result.error : null

  const challengeItems = useMemo(
    () => CHALLENGES.map(c => ({ id: c.id, label: CHALLENGE_LABELS[c.id] ?? c.id })),
    []
  )
  const bugItems = useMemo(
    () => FIND_THE_BUG.map(b => ({ id: b.id, label: FIND_THE_BUG_LABELS[b.id] ?? b.id })),
    []
  )

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      {/* Page header */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <h2 className="text-2xl font-display font-semibold text-text-hi">Challenges</h2>
        <p className="text-sm text-text-mid mt-1">
          Build a construction and check it against the target by language equivalence.
        </p>
      </div>

      {/* Exercise picker: the curated bank and the find-the-bug set */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono text-text-low">Construct:</span>
            <ExercisePicker exercises={challengeItems} selectedId={selectedId} onSelect={handleSelect} />
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <span className="text-xs font-mono text-text-low">Find the bug:</span>
            <ExercisePicker exercises={bugItems} selectedId={selectedId} onSelect={handleSelect} />
          </div>
        </div>
      </div>

      {/* Prompt and alphabet for the current selection */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div
          data-testid="challenge-prompt"
          className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4"
        >
          <p className="text-sm text-text-hi">{prompt}</p>
          <p className="text-xs font-mono text-text-mid">
            {'Σ = { '}
            {alphabet.join(', ')}
            {' }'}
          </p>
          {bug && <p className="text-xs text-text-low">Hint: {bug.hint}</p>}
        </div>
      </div>

      {/* Build surface plus result */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-8 flex-1 flex flex-col gap-4">
        {bug ? (
          // Find-the-bug: pre-load the broken machine. The key remounts the editor on
          // an exercise switch so the new broken machine loads and stale edits clear.
          <AutomatonBuildSurface
            key={bug.id}
            initial={bug.broken}
            exercise={gradedExercise!}
            onOutcome={setOutcome}
          />
        ) : challenge && challenge.type === 'regex' ? (
          <RegexBuildSurface
            value={regexSrc}
            onChange={setRegexSrc}
            alphabet={alphabet.join('')}
            onAlphabetChange={handleAlphabetChange}
            exercise={gradedExercise!}
            onOutcome={setOutcome}
          />
        ) : challenge ? (
          // Build-a-DFA / build-an-NFA: an empty editor. The key still remounts on a
          // switch so a previous machine never carries over.
          <AutomatonBuildSurface
            key={challenge.id}
            exercise={gradedExercise!}
            onOutcome={setOutcome}
          />
        ) : null}

        {/* Result region: too-large notice, inline error, or the graded verdict. */}
        {outcome.kind === 'too-large' ? (
          <TooLargeNotice message={outcome.message} partial={outcome.partial} />
        ) : inlineError ? (
          <div
            role="status"
            data-testid="challenge-error"
            className="flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            {inlineError}
          </div>
        ) : (
          <ResultPanel verdict={verdict} />
        )}
      </div>
    </div>
  )
}
