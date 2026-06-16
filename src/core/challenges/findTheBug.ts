import { Automaton } from '@/core/automata/types'

// The find-the-bug set: deliberately broken automata over known reference languages.
// The student inspects the loaded machine, finds the bug, and fixes it in the hand
// editor; the SAME equivalence grader applies, so a remaining bug shows up as the
// shortest counterexample. These are curated, not generated.
//
// Each entry is provably broken and provably fixable, and findTheBug.test.ts pins
// both: the broken machine is non-equivalent to its reference with a SPECIFIC
// counterexample and direction, and a hand-authored fix is language-equivalent to the
// reference. A "broken" machine that turns out correct, or one whose bug cannot be
// fixed, fails the suite before it can ship.
//
// References are course-notation regex strings (+ for union, lambda for the empty
// string). Grading is by language, never by shape (automata-correctness invariant 8),
// so a regex is enough to denote the target language. Nothing here is compiled to a
// JavaScript regular expression; the reference flows only through the bespoke parser.

export interface FindTheBugExercise {
  // Stable id for the picker and for keying view state across selections.
  id: string
  // The language the machine is SUPPOSED to accept, in plain course wording.
  prompt: string
  // The authoritative alphabet. The broken machine and the reference are both
  // completed over exactly this Sigma when graded.
  alphabet: readonly string[]
  // A course-notation regex whose language IS the target. Pinned in findTheBug.test.ts.
  reference: string
  // The deliberately wrong machine, loaded into the editor for the student to fix.
  broken: Automaton
  // A plain-language nudge toward the bug.
  hint: string
}

// Machine 1: "does not start with abc" over Sigma = {a, b, c}.
//
// The correct machine accepts every string except those that begin a, b, c. It tracks
// how far the input matches the forbidden prefix: q0 (matched nothing of it), q1
// (matched a), q2 (matched ab). Only after reaching the full forbidden prefix abc does
// it reject, so q0, q1, and q2 are all accepting (the empty string, "a", and "ab" do
// not start with abc), and a dedicated reject sink swallows everything once abc is seen.
//
// The bug is the proper-prefix mistake from the course notes: q2 (the state reached
// after reading "ab") is wrongly left OUT of the accepting set, so the machine rejects
// the proper prefix "ab" even though "ab" does not start with abc. The grader returns
// the counterexample "ab", wrongly rejected (acceptedBy reference). The fix is to add
// q2 to the accepting set.
const brokenNotStartsAbc: Automaton = {
  states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }, { id: 'ok' }, { id: 'no' }],
  transitions: [
    // q0: an a advances the forbidden-prefix match; b or c can never begin abc, so
    // they jump straight to the accept sink.
    { from: 'q0', to: 'q1', symbol: 'a' },
    { from: 'q0', to: 'ok', symbol: 'b' },
    { from: 'q0', to: 'ok', symbol: 'c' },
    // q1 (after a): a b advances to "ab"; anything else cannot complete abc here.
    { from: 'q1', to: 'q2', symbol: 'b' },
    { from: 'q1', to: 'ok', symbol: 'a' },
    { from: 'q1', to: 'ok', symbol: 'c' },
    // q2 (after ab): a c completes the forbidden prefix abc and falls into the reject
    // sink; anything else means the string did not start with abc after all.
    { from: 'q2', to: 'no', symbol: 'c' },
    { from: 'q2', to: 'ok', symbol: 'a' },
    { from: 'q2', to: 'ok', symbol: 'b' },
    // ok: accept sink, self-loops on every symbol.
    { from: 'ok', to: 'ok', symbol: 'a' },
    { from: 'ok', to: 'ok', symbol: 'b' },
    { from: 'ok', to: 'ok', symbol: 'c' },
    // no: reject sink, self-loops on every symbol.
    { from: 'no', to: 'no', symbol: 'a' },
    { from: 'no', to: 'no', symbol: 'b' },
    { from: 'no', to: 'no', symbol: 'c' },
  ],
  startState: 'q0',
  // The bug: q2 is missing from the accepting set, so "ab" is wrongly rejected.
  acceptStates: ['q0', 'q1', 'ok'],
  alphabet: new Set(['a', 'b', 'c']),
}

// Machine 2: "ends in ab" over Sigma = {a, b}.
//
// The correct machine tracks the suffix matched so far: q0 (no useful suffix), q1
// (the last symbol was a, a pending start of "ab"), q2 (the last two were ab, accept).
// The key subtlety is that from q1, reading another a keeps the machine in q1: the new
// a is itself a fresh pending start, so the pending-a state must be sticky under a.
//
// The bug: from q1, reading a wrongly returns to q0 instead of staying in q1, so the
// machine forgets the pending a whenever two a's appear in a row. The string "aab"
// ends in ab and must be accepted, but the broken machine reads q0 -a-> q1 -a-> q0
// (the bug) -b-> q0 and rejects it. The grader returns the counterexample "aab",
// wrongly rejected (acceptedBy reference). The fix is the self-loop q1 -a-> q1.
const brokenEndsAb: Automaton = {
  states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
  transitions: [
    { from: 'q0', to: 'q1', symbol: 'a' },
    { from: 'q0', to: 'q0', symbol: 'b' },
    // The bug: this should be q1 -a-> q1 (the new a is a fresh pending start).
    { from: 'q1', to: 'q0', symbol: 'a' },
    { from: 'q1', to: 'q2', symbol: 'b' },
    { from: 'q2', to: 'q1', symbol: 'a' },
    { from: 'q2', to: 'q0', symbol: 'b' },
  ],
  startState: 'q0',
  acceptStates: ['q2'],
  alphabet: new Set(['a', 'b']),
}

export const FIND_THE_BUG: readonly FindTheBugExercise[] = [
  {
    id: 'bug-not-starts-abc',
    prompt: 'This machine should accept every string over Σ = {a, b, c} that does NOT start with abc.',
    alphabet: ['a', 'b', 'c'],
    reference: 'λ + a + ab + (b + c)(a + b + c)* + a(a + c)(a + b + c)* + ab(a + b)(a + b + c)*',
    broken: brokenNotStartsAbc,
    hint: 'What happens to a string that is a proper prefix of abc?',
  },
  {
    id: 'bug-ends-ab',
    prompt: 'This machine should accept exactly the strings over Σ = {a, b} that end in ab.',
    alphabet: ['a', 'b'],
    reference: '(a + b)*ab',
    broken: brokenEndsAb,
    hint: 'After reading a single a, what should happen when the next symbol is another a?',
  },
]
