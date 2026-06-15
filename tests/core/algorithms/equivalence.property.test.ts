import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { RegexNode } from '@/core/regex/ast'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateDFA } from '@/core/algorithms/simulate'
import { equivalence } from '@/core/algorithms/equivalence'
import { DFA } from '@/core/automata/types'

// Property suite for language equivalence with the shortest counterexample
// (CHALLENGE-01/02, automata-correctness invariant 8). This file IS the proof that
// the grading primitive is trustworthy: a seeded property test decides each claim
// against a brute-force string battery, never against graph shape.
//
// THE METHOD, copied from product.property.test.ts: exhaustive enumeration of every
// string up to a bounded length over {a, b}, with simulateDFA as the oracle.
// Because the battery is enumerated in full (not sampled), agreement over it is a
// DECISION over the bounded language, not a probabilistic spot check. No input is
// ever compiled to a JS RegExp (threat T-09-02); everything is driven through the
// bespoke pipeline buildNFA -> nfaToDFA. The seed is fixed so any counterexample
// reproduces; per the skill and the root project conventions, a counterexample
// becomes a named unit test in equivalence.test.ts and equivalence.ts is fixed,
// never the other way around. The property is never loosened and no assertion is
// weakened.

const SYMBOLS = ['a', 'b'] as const
const SIGMA = new Set<string>(SYMBOLS)

// Length bound for the exhaustive string battery. 2^0 + ... + 2^7 = 255 strings
// over {a, b}; small enough to enumerate per fast-check run, long enough to expose
// a wrong verdict or a non-minimal counterexample on a reachable product pair.
// Matches product.property.test.ts.
const MAX_STRING_LENGTH = 7

// Every string over SYMBOLS with length in [0, maxLength], enumerated in full.
function allStringsUpTo(maxLength: number): string[] {
  const out: string[] = ['']
  let frontier: string[] = ['']
  for (let len = 1; len <= maxLength; len++) {
    const next: string[] = []
    for (const prefix of frontier) {
      for (const sym of SYMBOLS) {
        const s = prefix + sym
        out.push(s)
        next.push(s)
      }
    }
    frontier = next
  }
  return out
}

const BATTERY = allStringsUpTo(MAX_STRING_LENGTH)

// Bounded recursive AST arbitrary over {a, b}, identical to
// product.property.test.ts: union (+), concatenation, Kleene star, positive closure
// (+), optional, plus a symbol/empty leaf. The DFA under test is built through the
// real pipeline buildNFA -> nfaToDFA so it is a genuine reachable DFA.
function regexArb(): fc.Arbitrary<RegexNode> {
  const leaf: fc.Arbitrary<RegexNode> = fc.oneof(
    fc.constantFrom(...SYMBOLS).map((value) => ({ type: 'symbol', value }) as RegexNode),
    fc.constant({ type: 'empty' } as RegexNode)
  )
  return fc.letrec<{ node: RegexNode }>((tie) => ({
    node: fc.oneof(
      { maxDepth: 4, depthSize: 'small' },
      leaf,
      fc.record({ left: tie('node'), right: tie('node') }).map(
        ({ left, right }) => ({ type: 'concat', left, right }) as RegexNode
      ),
      fc.record({ left: tie('node'), right: tie('node') }).map(
        ({ left, right }) => ({ type: 'union', left, right }) as RegexNode
      ),
      tie('node').map((child) => ({ type: 'star', child }) as RegexNode),
      tie('node').map((child) => ({ type: 'plus', child }) as RegexNode),
      tie('node').map((child) => ({ type: 'optional', child }) as RegexNode)
    ),
  })).node
}

const dfaFromAst = (ast: RegexNode): DFA => nfaToDFA(buildNFA(ast), SIGMA)

// Module-scoped tally of how often PROPERTY 1 took the equivalent branch. The final
// it() asserts it is positive, so the suite fails if the generator never produces an
// equivalent-but-differently-shaped pair: the equivalent branch is demonstrably
// exercised and PROPERTY 1 is not vacuously about unequal pairs only (threat of a
// one-sided property).
let equivalentCount = 0

describe('equivalence properties (CHALLENGE-01/02, invariant 8)', () => {
  // PROPERTY 1: equivalence agrees with brute-force battery comparison. If the
  // verdict is equivalent, the two DFAs must agree on every battery string. If the
  // verdict is a counterexample, that counterexample is within the battery length
  // (the longest distinguishing word is bounded by the product size, far under the
  // battery), so the battery must disagree.
  it('is equivalent iff the two DFAs agree on every battery string', () => {
    fc.assert(
      fc.property(regexArb(), regexArb(), (astA, astB) => {
        const A = dfaFromAst(astA)
        const B = dfaFromAst(astB)
        const agreeOnAll = BATTERY.every(
          (s) => simulateDFA(A, s).accepted === simulateDFA(B, s).accepted
        )
        const v = equivalence(A, B, SIGMA)
        if (v.equivalent) {
          equivalentCount += 1
          expect(agreeOnAll).toBe(true)
        } else {
          expect(agreeOnAll).toBe(false)
        }
      }),
      { seed: 0xe9, numRuns: 100 }
    )
  })

  // PROPERTY 2: when not equivalent, the returned counterexample is genuinely
  // one-sided, the direction matches which side accepts, and the counterexample is
  // minimal length (no strictly shorter battery string distinguishes the two). A is
  // the student, B the reference.
  it('returns a one-sided, correctly-directed, minimal counterexample', () => {
    fc.assert(
      fc.property(regexArb(), regexArb(), (astA, astB) => {
        const A = dfaFromAst(astA)
        const B = dfaFromAst(astB)
        const v = equivalence(A, B, SIGMA)
        if (v.equivalent) return
        const inA = simulateDFA(A, v.counterexample).accepted
        const inB = simulateDFA(B, v.counterexample).accepted
        // One-sided: the counterexample is in exactly one language.
        expect(inA).not.toBe(inB)
        // Direction: 'student' when the student accepts it (wrongly accepts),
        // 'reference' when the reference accepts it (the student wrongly rejects).
        expect(v.acceptedBy).toBe(inA ? 'student' : 'reference')
        // Minimal length: no STRICTLY shorter battery string distinguishes A and B.
        const len = v.counterexample.length
        const shorterDistinguisher = BATTERY.some(
          (s) =>
            s.length < len &&
            simulateDFA(A, s).accepted !== simulateDFA(B, s).accepted
        )
        expect(shorterDistinguisher).toBe(false)
      }),
      { seed: 0xe9, numRuns: 100 }
    )
  })

  // NON-VACUITY: PROPERTY 1 is not secretly about unequal pairs only. The generator
  // must produce equal-but-differently-shaped pairs that return equivalent:true, or
  // the equivalent branch of PROPERTY 1 was never taken. An explicit known-equivalent
  // pair of different shapes also returns equivalent:true, so the equal branch has a
  // concrete witness independent of the generator.
  it('exercises the equivalent branch on equal-but-differently-shaped pairs', () => {
    expect(equivalentCount).toBeGreaterThan(0)
    const sigmaStar = dfaFromAst({ type: 'star' as const, child: { type: 'union', left: { type: 'symbol', value: 'a' }, right: { type: 'symbol', value: 'b' } } } as RegexNode)
    // (a + b)(a + b)* + lambda denotes the same language as (a + b)* with a
    // different shape; the verdict is decided by language, not by shape.
    const sigmaStarOther = dfaFromAst({
      type: 'union',
      left: { type: 'empty' },
      right: {
        type: 'concat',
        left: { type: 'union', left: { type: 'symbol', value: 'a' }, right: { type: 'symbol', value: 'b' } },
        right: { type: 'star', child: { type: 'union', left: { type: 'symbol', value: 'a' }, right: { type: 'symbol', value: 'b' } } },
      },
    } as RegexNode)
    expect(equivalence(sigmaStar, sigmaStarOther, SIGMA)).toEqual({ equivalent: true })
  })
})
