import { describe, it, expect } from 'vitest'
import { parse, buildNFA } from '@/core/cachedAlgorithms'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateDFA } from '@/core/algorithms/simulate'
import { equivalence } from '@/core/algorithms/equivalence'
import { FIND_THE_BUG } from '@/core/challenges/findTheBug'
import { Automaton } from '@/core/automata/types'

// Find-the-bug correctness (CHALLENGE-04). Every curated broken machine must be
// provably broken and provably fixable, decided by language equivalence and
// simulateDFA, never by shape. For each exercise this suite asserts two things:
//
//   1. The broken machine is NON-equivalent to its reference, with a SPECIFIC shortest
//      counterexample and direction. The broken machine is the first argument to
//      equivalence (the student side) and the reference the second, so acceptedBy
//      'reference' means the broken machine wrongly REJECTS the counterexample.
//   2. A hand-authored CORRECT fix is language-equivalent to the reference, so the bug
//      is reachable: a small edit turns the machine right.
//
// The reference flows only through the bespoke parse -> buildNFA -> nfaToDFA pipeline;
// nothing is compiled to a JavaScript regular expression.

// Determinize over exactly the exercise alphabet so a missing edge is caught, not
// silently passed.
function determinize(a: Automaton, alphabet: readonly string[]) {
  return nfaToDFA(a, new Set(alphabet))
}
function referenceDFA(reference: string, alphabet: readonly string[]) {
  return nfaToDFA(buildNFA(parse(reference)), new Set(alphabet))
}

// The pinned expectation per exercise id: the exact counterexample and direction the
// grader must return, plus a corrected Automaton whose language must match the
// reference. Authored by hand; verified against the actual algorithms below.
interface Expectation {
  counterexample: string
  acceptedBy: 'student' | 'reference'
  fix: (broken: Automaton) => Automaton
}

const EXPECT: Record<string, Expectation> = {
  // The proper-prefix bug: q2 (after "ab") is wrongly non-accepting, so "ab" is
  // wrongly rejected. Fix: add q2 to the accepting set.
  'bug-not-starts-abc': {
    counterexample: 'ab',
    acceptedBy: 'reference',
    fix: broken => ({ ...broken, acceptStates: ['q0', 'q1', 'q2', 'ok'] }),
  },
  // The lost-pending-a bug: q1 -a-> q0 forgets a pending start, so "aab" (which ends
  // in ab) is wrongly rejected. Fix: q1 -a-> q1 (the new a is a fresh pending start).
  'bug-ends-ab': {
    counterexample: 'aab',
    acceptedBy: 'reference',
    fix: broken => ({
      ...broken,
      transitions: broken.transitions.map(t =>
        t.from === 'q1' && t.symbol === 'a' ? { ...t, to: 'q1' } : t
      ),
    }),
  },
}

describe('find-the-bug set', () => {
  it('gives every exercise a unique id, a parseable reference, and an expectation', () => {
    const ids = FIND_THE_BUG.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const e of FIND_THE_BUG) {
      expect(() => parse(e.reference)).not.toThrow()
      expect(EXPECT[e.id], `missing pinned expectation for ${e.id}`).toBeDefined()
    }
  })

  it('covers at least two distinct broken machines', () => {
    expect(FIND_THE_BUG.length).toBeGreaterThanOrEqual(2)
  })

  for (const e of FIND_THE_BUG) {
    describe(e.id, () => {
      const exp = EXPECT[e.id]

      it('broken machine is non-equivalent with the pinned counterexample and direction', () => {
        const v = equivalence(
          determinize(e.broken, e.alphabet),
          referenceDFA(e.reference, e.alphabet),
          new Set(e.alphabet)
        )
        expect(v).toEqual({
          equivalent: false,
          counterexample: exp.counterexample,
          acceptedBy: exp.acceptedBy,
        })
      })

      it('the counterexample is genuinely one-sided (broken vs reference disagree on it)', () => {
        // Non-vacuity: simulate the counterexample on each side and confirm exactly one
        // accepts, matching the reported direction. acceptedBy 'reference' means the
        // reference accepts it and the broken machine does not.
        const inBroken = simulateDFA(determinize(e.broken, e.alphabet), exp.counterexample).accepted
        const inReference = simulateDFA(referenceDFA(e.reference, e.alphabet), exp.counterexample).accepted
        expect(inBroken).not.toBe(inReference)
        expect(exp.acceptedBy).toBe(inBroken ? 'student' : 'reference')
      })

      it('the hand-authored fix is language-equivalent to the reference', () => {
        const fixed = exp.fix(e.broken)
        const v = equivalence(
          determinize(fixed, e.alphabet),
          referenceDFA(e.reference, e.alphabet),
          new Set(e.alphabet)
        )
        expect(v).toEqual({ equivalent: true })
      })
    })
  }
})
