import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { RegexNode } from '@/core/regex/ast'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateDFA } from '@/core/algorithms/simulate'
import { complementDFA } from '@/core/algorithms/complement'
import { DFA } from '@/core/automata/types'

// Property suite for the DFA complement (automata-correctness invariant 7). This
// file IS the proof of CLOSURE-04 for complement: L(complementDFA(A)) = Σ* \ L(A),
// and complement(complement(A)) is language-equivalent to A.
//
// Invariant 7: complement flips accepting and non-accepting states and REQUIRES a
// complete DFA first; complementing an incomplete DFA is the classic silent error.
// complementDFA completes before flipping, so the Σ* \ L(A) law holds. Invariant 8:
// language equivalence is decided by simulateDFA, NEVER by graph shape.
//
// THE METHOD, copied from minimize.property.test.ts and gnfa.property.test.ts:
// exhaustive enumeration of every string over {a, b} up to a bounded length, decided
// per string by simulation. Σ* over the battery is exactly "every string in the
// battery", so Σ* \ L(A) reduces to "accepted by the complement iff NOT accepted by
// A" across the FULL battery (including every string A rejects). The JS RegExp
// engine is never used (threat T-07-TAMPER). The seed is fixed so a counterexample
// reproduces; per the project conventions, a counterexample becomes a named unit test in
// complement.test.ts and complement.ts is fixed -- never loosen the property.

const SYMBOLS = ['a', 'b'] as const

// Length bound for the exhaustive string battery. 2^0 + ... + 2^7 = 255 strings
// over {a, b}: the full bounded language, a decision not a sample.
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

// The working alphabet Σ the battery ranges over. Complement is Σ* \ L, so Σ is a
// property of the language, not of the symbols a given source regex happens to use:
// a symbol-light regex (λ, λ?, a*) yields a DFA whose own alphabet is a strict subset
// of {a, b}, and the complement must still be taken over the full Σ = {a, b}. The
// caller knows Σ here (it is the battery's alphabet), so it is passed to complementDFA.
const SIGMA = new Set(SYMBOLS)

// Bounded recursive AST arbitrary over {a, b}, identical to
// minimize.property.test.ts. The DFA under test is built through the real pipeline
// buildNFA -> nfaToDFA so it is a genuine reachable, complete DFA.
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

describe('complementDFA set semantics (CLOSURE-04, invariant 7)', () => {
  // PROPERTY: L(complement) = Σ* \ L(A). A string is accepted by the complement iff
  // it is NOT accepted by A, over the FULL battery (every string, including those A
  // rejects). The Σ* precondition holds because complementDFA completes first; a
  // pipeline DFA is already complete and complementDFA completes any input regardless.
  // Decided per string by simulateDFA, never by shape. Seeded so a failure reproduces;
  // on a counterexample add a named unit test in complement.test.ts and fix
  // complement.ts, never loosen this.
  it('L(complementDFA(A)) = Sigma* minus L(A) over the bounded battery', () => {
    fc.assert(
      fc.property(regexArb(), (ast) => {
        const A = dfaFromAst(ast)
        const C = complementDFA(A, SIGMA).dfa
        for (const s of STRING_BATTERY) {
          expect(simulateDFA(C, s).accepted).toBe(!simulateDFA(A, s).accepted)
        }
      }),
      { seed: 0xc0de, numRuns: 100 }
    )
  })

  // PROPERTY: complement(complement(A)) is equivalent to A (the skill names this one
  // explicitly). Flipping twice over a complete machine returns the original language
  // for every string in the battery.
  it('complement(complement(A)) is equivalent to A over the bounded battery', () => {
    fc.assert(
      fc.property(regexArb(), (ast) => {
        const A = dfaFromAst(ast)
        // Both flips taken over the same Σ so the round-trip is consistent.
        const CC = complementDFA(complementDFA(A, SIGMA).dfa, SIGMA).dfa
        for (const s of STRING_BATTERY) {
          expect(simulateDFA(CC, s).accepted).toBe(simulateDFA(A, s).accepted)
        }
      }),
      { seed: 0xc0de, numRuns: 100 }
    )
  })

  // NON-VACUITY / precondition witness (threat T-07-VACUOUS): the Σ* \ L(A) law above
  // depends on completion. Build a deliberately INCOMPLETE hand-built DFA over {a, b}:
  // q0 is accepting with a self-loop on 'a' but NO 'b'-edge. The string "b" runs off
  // the missing edge, so the input REJECTS it (simulateDFA returns false on a missing
  // transition). complementDFA completes first (routing (q0,b) to the trap ∅) and then
  // flips, so ∅ becomes accepting and the complement ACCEPTS "b". If completion were
  // skipped -- a flip-before-complete regression -- "b" would have no path and be
  // wrongly REJECTED by the complement, breaking Σ* \ L(A). This is the load-bearing
  // case the Σ* law rests on (the analogue of gnfa.property's dropped-term witness).
  it('completion is load-bearing: complement accepts a string that ran off a missing edge', () => {
    const incomplete: DFA = {
      states: [{ id: 'q0' }],
      transitions: [{ from: 'q0', to: 'q0', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q0'],
      alphabet: new Set(['a', 'b']),
    }

    // The input has no (q0, b) edge, so "b" runs off and is rejected.
    expect(simulateDFA(incomplete, 'b').accepted).toBe(false)

    const complement = complementDFA(incomplete).dfa
    // After complete-then-flip, "b" lands in the now-accepting trap: the complement
    // accepts it. This is exactly Σ* \ L(A): "b" is not in L(input), so it is in the
    // complement. A flip-before-complete bug would wrongly reject it here.
    expect(simulateDFA(complement, 'b').accepted).toBe(true)

    // And "a" (accepted by the input via its self-loop) is rejected by the complement,
    // confirming the flip is a real complement and not an accept-everything machine.
    expect(simulateDFA(incomplete, 'a').accepted).toBe(true)
    expect(simulateDFA(complement, 'a').accepted).toBe(false)
  })
})
