import { parse, buildNFA } from '@/core/cachedAlgorithms'
import { nfaToDFA } from '@/core/algorithms/subset'
import { equivalence } from '@/core/algorithms/equivalence'
import { TooLargeError, DFA } from '@/core/automata/types'
import { StudentInput, GradeResult, Exercise } from './types'

// Grade a student submission against an exercise by LANGUAGE equivalence and nothing
// else (automata-correctness invariant 8). Both sides are normalized to a DFA over
// the exercise alphabet -- the reference regex through parse -> buildNFA -> nfaToDFA,
// the student answer either the same way (a typed regex) or by determinizing the
// built automaton -- and the verdict is whatever equivalence returns: equivalent, or
// the shortest counterexample plus the direction of the error. There is no
// structural comparison anywhere; two correct answers of different shapes both pass.
//
// Two error channels, deliberately split to mirror the App / ClosureView handling of
// TooLargeNotice versus the inline error box. A too-large construction (the product
// or a determinization crossing the SAFETY-01 cap) RE-THROWS TooLargeError so the
// view can render TooLargeNotice instead of hanging. Everything else -- empty input,
// an unparseable student regex, even a malformed reference (developer data) -- is
// RETURNED as { ok: false, error } so the view shows an inline message and never
// crashes. An empty or startless student automaton (toAutomaton maps a startless
// editor to startState '') is not an error at all: it determinizes over Sigma to the
// trap-only empty-language DFA and is graded, yielding equivalent:false against any
// non-empty reference.
//
// Regex strings flow only through the bespoke parse: user input is never compiled to
// a JS regular expression via the RegExp constructor (threat T-09-04).

// Re-throw a too-large signal so the view surfaces it; otherwise hand back an inline
// message. Keeps the re-throw-vs-return split in one place for both sides.
function asReturnableError(e: unknown): GradeResult {
  if (e instanceof TooLargeError) throw e
  return { ok: false, error: e instanceof Error ? e.message : 'Could not build this automaton.' }
}

export function gradeChallenge(input: StudentInput, exercise: Exercise): GradeResult {
  // The exercise alphabet is authoritative: both sides are completed over exactly
  // this Sigma, so a missing edge for some symbol is caught, not silently passed.
  const sigma = new Set(exercise.alphabet)

  // Reference: a course-notation regex -> NFA -> DFA over Sigma. A reference that
  // fails to parse is developer data, surfaced as an inline error (a too-large
  // reference still re-throws).
  let referenceDFA: DFA
  try {
    referenceDFA = nfaToDFA(buildNFA(parse(exercise.reference)), sigma)
  } catch (e) {
    return asReturnableError(e)
  }

  // Student side: a typed regex through the same parse path, or the built automaton
  // determinized over Sigma. The empty/startless automaton is NOT special-cased to
  // an error; nfaToDFA over Sigma turns it into the empty-language machine.
  let studentDFA: DFA
  try {
    if (input.kind === 'regex') {
      const src = input.src.trim()
      if (!src) return { ok: false, error: 'Enter a regular expression.' }
      studentDFA = nfaToDFA(buildNFA(parse(src)), sigma)
    } else {
      studentDFA = nfaToDFA(input.automaton, sigma)
    }
  } catch (e) {
    return asReturnableError(e)
  }

  // The single grading source. Student first, reference second: the argument order
  // fixes the direction, so acceptedBy 'student' means the student wrongly accepts.
  // A too-large product throws TooLargeError out of here, which is correct -- the
  // view shows TooLargeNotice.
  return { ok: true, verdict: equivalence(studentDFA, referenceDFA, sigma) }
}
