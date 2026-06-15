import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { RegexNode } from '@/core/regex/ast'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { minimizeDFA } from '@/core/algorithms/minimize'
import { simulateDFA } from '@/core/algorithms/simulate'
import { DFA } from '@/core/automata/types'

// Property suite for DFA minimization (automata-correctness invariants 5 and 8).
//
// Invariant 5: minimization preserves the language EXACTLY, removes unreachable
// states first, merges equivalent states, and the result is unique up to
// renaming. Invariant 8: equivalence is decided by the equivalence machinery,
// NEVER by graph shape or state count.
//
// There is no product-construction equivalence helper in the codebase yet, so we
// use the SKILL-accepted fallback: exhaustive enumeration of every string up to a
// bounded length over the alphabet, asserting acceptance agrees on each. Because
// the set is enumerated in full (not sampled), this is a decision over the bounded
// language, not a probabilistic spot check. No input is ever compiled to a JS
// RegExp (threat T-03-04); we drive everything through the bespoke pipeline.

const SYMBOLS = ['a', 'b'] as const

// Length bound for the exhaustive string battery. 2^0 + ... + 2^7 = 255 strings
// over {a, b}; small enough to enumerate per fast-check run, long enough to expose
// a wrongly merged state (a counterexample for a 7-or-fewer-state minimal DFA is
// reachable within this bound).
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

// Two DFAs agree on the language iff acceptance matches for every string in the
// exhaustive bounded battery. Decided by simulation (the equivalence machinery),
// never by comparing shapes or counts.
function agreeOnLanguage(a: DFA, b: DFA): boolean {
  for (const s of STRING_BATTERY) {
    if (simulateDFA(a, s).accepted !== simulateDFA(b, s).accepted) {
      return false
    }
  }
  return true
}

// Bounded recursive AST arbitrary over {a, b}, mirroring tests/core/regex/
// property.test.ts: union (+), concatenation, Kleene star, positive closure (+),
// optional, plus a λ/empty leaf. The DFA under test is built through the real
// parse-free pipeline buildNFA -> nfaToDFA so it is a genuine reachable DFA.
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

describe('minimizeDFA properties', () => {
  // Property A: language equivalence by the equivalence machinery, not by shape.
  // Seeded so a counterexample reproduces deterministically; if this ever fails,
  // add the failing AST as a named unit test and fix the algorithm. Do not loosen.
  it('minimize(A) accepts a string iff A does (over the bounded battery)', () => {
    fc.assert(
      fc.property(regexArb(), (ast) => {
        const dfa = dfaFromAst(ast)
        const min = minimizeDFA(dfa).dfa
        expect(agreeOnLanguage(min, dfa)).toBe(true)
      }),
      { seed: 42, numRuns: 100 }
    )
  })

  // Property B: determinize-then-minimize is idempotent up to equivalence. A
  // second minimize yields the same language AND the same state count (a minimal
  // DFA is already minimal, so it cannot shrink further).
  it('minimizing twice is idempotent up to equivalence and state count', () => {
    fc.assert(
      fc.property(regexArb(), (ast) => {
        const dfa = dfaFromAst(ast)
        const once = minimizeDFA(dfa).dfa
        const twice = minimizeDFA(once).dfa
        expect(agreeOnLanguage(twice, once)).toBe(true)
        expect(twice.states.length).toBe(once.states.length)
      }),
      { seed: 42, numRuns: 100 }
    )
  })

  // Property C: minimization never grows the state count (it removes unreachable
  // states and merges equivalent ones). Asserted as a <= relation against the
  // input's own size, NEVER a hardcoded minimal-state number.
  it('minimize never increases the state count', () => {
    fc.assert(
      fc.property(regexArb(), (ast) => {
        const dfa = dfaFromAst(ast)
        const min = minimizeDFA(dfa).dfa
        expect(min.states.length).toBeLessThanOrEqual(dfa.states.length)
      }),
      { seed: 42, numRuns: 100 }
    )
  })
})
