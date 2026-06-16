import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { RegexNode } from '@/core/regex/ast'
import { asuDirectDFA } from '@/core/algorithms/asuDirect'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateDFA } from '@/core/algorithms/simulate'
import { DFA } from '@/core/automata/types'

// Property suite for the ASU direct regex-to-DFA construction. The construction
// builds a DFA from the syntax tree without an intermediate NFA, so the
// independent reference is the Thompson-subset pipeline (buildNFA then nfaToDFA)
// for the same regex. The two DFAs must accept the same language. Equivalence is
// decided by simulateDFA over an exhaustive bounded battery, never by comparing
// state count or shape, and no input is ever compiled to a JS RegExp. The seed is
// fixed so a counterexample reproduces; per the project conventions a
// counterexample becomes a named unit test and the construction is fixed, never
// the property loosened.

const SYMBOLS = ['a', 'b'] as const

// Every string over SYMBOLS with length in [0, maxLength], enumerated in full
// (255 strings over {a, b}): a decision over the bounded language, not a sample.
const MAX_STRING_LENGTH = 7

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
// exhaustive bounded battery, decided by simulation.
function agreeOnLanguage(a: DFA, b: DFA): boolean {
  for (const s of STRING_BATTERY) {
    if (simulateDFA(a, s).accepted !== simulateDFA(b, s).accepted) {
      return false
    }
  }
  return true
}

// Bounded recursive AST arbitrary over {a, b}: union (+), concatenation, Kleene
// star, positive closure (+), optional, and a lambda/empty leaf. maxDepth 4 keeps
// the generated regexes small enough that no construction hits its size bound.
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

describe('asuDirectDFA language properties', () => {
  it('agrees with the Thompson-subset pipeline over the bounded battery', () => {
    fc.assert(
      fc.property(regexArb(), (ast) => {
        const direct = asuDirectDFA(ast, new Set(SYMBOLS)).dfa
        const reference = nfaToDFA(buildNFA(ast))
        expect(agreeOnLanguage(direct, reference)).toBe(true)
      }),
      { seed: 351, numRuns: 100 }
    )
  })
})
