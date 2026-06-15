import { Automaton } from '@/core/automata/types'
import { Equivalence } from '@/core/algorithms/equivalence'

// The challenge model for the construction exercises.
//
// Grading is by LANGUAGE, never by shape (automata-correctness invariant 8): the
// only verdict source is the equivalence walk, so a reference need only DENOTE the
// target language, not match any particular construction. That is why an exercise
// stores its reference as a course-notation regex string even for build-a-DFA and
// build-a-NFA tasks: a regex is the most compact denotation of a regular language
// and is exactly what parse -> buildNFA -> nfaToDFA already consume. The student
// still builds a DFA or NFA in the editor; the type field only selects which build
// surface to show.

// Which course exercise type this is, and therefore which build surface the view
// presents: the hand editor for 'dfa'/'nfa', the regex input for 'regex'.
export type ChallengeType = 'dfa' | 'nfa' | 'regex'

export interface Exercise {
  // Stable id for the picker and for keying view state across selections.
  id: string
  // The course exercise type; selects the build surface.
  type: ChallengeType
  // Plain-language target language in course wording (Sigma = {a, b}, + for union).
  prompt: string
  // The authoritative alphabet for this exercise. Both the reference and the
  // student answer are completed over exactly this Sigma, so a student who omits an
  // edge for some symbol is caught rather than silently passed.
  alphabet: readonly string[]
  // A course-notation regex whose language IS the target. Verified against an
  // explicit accept/reject table in bank.test.ts before it can ship.
  reference: string
}

// What the student submitted: either an automaton built in the editor, or a regex
// typed into the regex input. The grader normalizes both sides to a DFA over the
// exercise alphabet before deciding.
export type StudentInput =
  | { kind: 'automaton'; automaton: Automaton }
  | { kind: 'regex'; src: string }

// The grader outcome. ok:true carries the equivalence verdict (equivalent, or a
// shortest counterexample plus direction). ok:false carries an inline message for
// an empty or unparseable submission, or a malformed reference; it is the
// surfaced-not-thrown path. A too-large construction is neither: it re-throws
// TooLargeError so the view can render its TooLargeNotice instead.
export type GradeResult =
  | { ok: true; verdict: Equivalence }
  | { ok: false; error: string }
