import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { RegexNode } from '@/core/regex/ast'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateDFA } from '@/core/algorithms/simulate'
import { productDFA } from '@/core/algorithms/product'
import { DFA } from '@/core/automata/types'

// Property suite for the product DFA (automata-correctness invariant 7). This file
// IS the proof of CLOSURE-04 for union and intersection: the construction is only
// trustworthy if a seeded property test decides each set-semantics law over the
// full bounded language.
//
// Invariant 7: closure constructions preserve their set semantics. Product for
// union accepts when EITHER component accepts; for intersection, when BOTH do.
// Invariant 8: language equivalence is decided by the equivalence machinery
// (simulateDFA), NEVER by graph shape or state count.
//
// THE METHOD, copied from minimize.property.test.ts and gnfa.property.test.ts:
// exhaustive enumeration of every string up to a bounded length over {a, b},
// asserting acceptance agrees on each. Because the set is enumerated in full (not
// sampled), this is a DECISION over the bounded language, not a probabilistic spot
// check. No input is ever compiled to a JS RegExp (threat T-07-TAMPER); everything
// is driven through the bespoke pipeline. The seed is fixed so any counterexample
// reproduces; per the project conventions, a counterexample becomes a
// named unit test in product.test.ts and the ALGORITHM in product.ts is fixed --
// the property is never loosened and no assertion is weakened.

const SYMBOLS = ['a', 'b'] as const

// Length bound for the exhaustive string battery. 2^0 + ... + 2^7 = 255 strings
// over {a, b}; small enough to enumerate per fast-check run, long enough to expose
// a wrong accept condition on a reachable product pair.
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

const STRING_BATTERY = allStringsUpTo(MAX_STRING_LENGTH)

// Bounded recursive AST arbitrary over {a, b}, identical to
// minimize.property.test.ts: union (+), concatenation, Kleene star, positive
// closure (+), optional, plus a λ/empty leaf. The DFA under test is built through
// the real pipeline buildNFA -> nfaToDFA so it is a genuine reachable DFA.
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

function dfaFromAst(ast: RegexNode): DFA {
  return nfaToDFA(buildNFA(ast))
}

describe('productDFA set semantics (CLOSURE-04, invariant 7)', () => {
  // PROPERTY: L(union) = L(A) union L(B). A string is accepted by the union product
  // iff it is accepted by A OR by B. Decided per string by simulateDFA over the full
  // battery, never by shape. Seeded so a failure reproduces; on a counterexample add
  // a named unit test in product.test.ts and fix product.ts, never loosen this.
  it('L(productDFA(A,B,union)) = L(A) union L(B) over the bounded battery', () => {
    fc.assert(
      fc.property(regexArb(), regexArb(), (astA, astB) => {
        const A = dfaFromAst(astA)
        const B = dfaFromAst(astB)
        const U = productDFA(A, B, 'union').dfa
        for (const s of STRING_BATTERY) {
          const expected = simulateDFA(A, s).accepted || simulateDFA(B, s).accepted
          expect(simulateDFA(U, s).accepted).toBe(expected)
        }
      }),
      { seed: 0xc105, numRuns: 100 }
    )
  })

  // PROPERTY: L(intersection) = L(A) intersect L(B). Same shape, the accept condition
  // is AND. The accepting condition is the only union/intersection difference, so this
  // and the union law together pin down both modes.
  it('L(productDFA(A,B,intersection)) = L(A) intersect L(B) over the bounded battery', () => {
    fc.assert(
      fc.property(regexArb(), regexArb(), (astA, astB) => {
        const A = dfaFromAst(astA)
        const B = dfaFromAst(astB)
        const I = productDFA(A, B, 'intersection').dfa
        for (const s of STRING_BATTERY) {
          const expected = simulateDFA(A, s).accepted && simulateDFA(B, s).accepted
          expect(simulateDFA(I, s).accepted).toBe(expected)
        }
      }),
      { seed: 0xc105, numRuns: 100 }
    )
  })

  // PROPERTY: product-union is commutative in language (the skill names this one
  // explicitly). L(A union B) = L(B union A) for every string in the battery. Swapping
  // the operands must not change the recognized language even though it changes the
  // pair labels and the discovery order.
  it('product-union is commutative in language: L(A union B) = L(B union A)', () => {
    fc.assert(
      fc.property(regexArb(), regexArb(), (astA, astB) => {
        const A = dfaFromAst(astA)
        const B = dfaFromAst(astB)
        const AB = productDFA(A, B, 'union').dfa
        const BA = productDFA(B, A, 'union').dfa
        for (const s of STRING_BATTERY) {
          expect(simulateDFA(AB, s).accepted).toBe(simulateDFA(BA, s).accepted)
        }
      }),
      { seed: 0xc105, numRuns: 100 }
    )
  })

  // NON-VACUITY (threat T-07-VACUOUS): the union law above is not vacuously true.
  // Take A = "a" and B = "b", two single-symbol DFAs whose languages differ. The
  // correct union accepts "b" (a string only B accepts). Under an AND accept
  // condition -- i.e. if union were wrongly built as intersection -- "b" would be
  // REJECTED, because A does not accept "b". This `it` proves the union law fails
  // under the deliberate AND break without modifying product.ts: it asserts both the
  // correct union acceptance AND the contrasting AND-result inline, so the law has
  // teeth. (Mirrors the Phase 6 dropped-term non-vacuity discipline.)
  it('union law is non-vacuous: union accepts a B-only string that an AND condition would reject', () => {
    const A = dfaFromAst({ type: 'symbol', value: 'a' })
    const B = dfaFromAst({ type: 'symbol', value: 'b' })

    const aAcceptsB = simulateDFA(A, 'b').accepted
    const bAcceptsB = simulateDFA(B, 'b').accepted
    // Precondition for the contrast: only B accepts "b".
    expect(aAcceptsB).toBe(false)
    expect(bAcceptsB).toBe(true)

    const union = productDFA(A, B, 'union').dfa
    // The correct union (OR) accepts "b".
    expect(simulateDFA(union, 'b').accepted).toBe(true)

    // The contrast: an AND accept condition would reject "b" (A does not accept it),
    // so the union law is not satisfied trivially -- it genuinely depends on OR.
    const andCondition = aAcceptsB && bAcceptsB
    expect(andCondition).toBe(false)

    // The intersection product realizes that AND condition, confirming the contrast
    // is the real construction and not a hand-computed straw man.
    const intersection = productDFA(A, B, 'intersection').dfa
    expect(simulateDFA(intersection, 'b').accepted).toBe(false)
  })
})
