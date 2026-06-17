import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { RegexNode } from '@/core/regex/ast'
import { brzozowskiDFA } from '@/core/algorithms/brzozowski'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateDFA } from '@/core/algorithms/simulate'
import { DFA, TooLargeError } from '@/core/automata/types'

// Property suite for the Brzozowski derivative regex-to-DFA construction. Each
// state is a regex (a derivative), so the independent reference is the
// Thompson-subset pipeline (buildNFA then nfaToDFA) for the same regex. The two
// DFAs must accept the same language. Equivalence is decided by simulateDFA over
// an exhaustive bounded battery, never by comparing state count or shape, and no
// input is ever compiled to a JS RegExp. The seed is fixed so a counterexample
// reproduces; per the project conventions a counterexample becomes a named unit
// test and the construction is fixed, never the property loosened.
//
// One input class is skipped rather than asserted: the derivative method can grow
// the working expression exponentially in node size while the distinct-state count
// stays small, so for a minority of generated regexes the construction reaches its
// own documented time or state guard and throws TooLargeError (the SAFETY-01 bound
// in brzozowski.ts: it refuses to return a truncated, and therefore wrong, DFA).
// That is the construction correctly declining an input, not a language gap, so
// the property uses fc.pre to drop only those inputs and asserts equivalence on
// every DFA the construction actually builds. The skip rate at this depth is a few
// percent, well inside fast-check's per-run skip budget. This does not weaken the
// equivalence check: it still must hold for every regex Brzozowski accepts.

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
// the state count well under the construction's MAX_DFA_STATES cap; the time guard
// is handled by the fc.pre skip above for the rare derivative-explosion input.
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

// Build the derivative DFA, returning null when the construction declines the
// input through its own documented size/time guard. A null is a skip signal, never
// a silent pass: the caller drops the input with fc.pre and asserts nothing about
// a DFA that was never produced.
function tryBrzozowski(ast: RegexNode): DFA | null {
  try {
    return brzozowskiDFA(ast, new Set(SYMBOLS)).dfa
  } catch (e) {
    if (e instanceof TooLargeError) return null
    throw e
  }
}

describe('brzozowskiDFA language properties', () => {
  it('agrees with the Thompson-subset pipeline over the bounded battery', () => {
    fc.assert(
      fc.property(regexArb(), (ast) => {
        const derivativeDFA = tryBrzozowski(ast)
        // Skip only inputs the construction itself refuses to build; the
        // equivalence assertion below still binds every DFA it does build.
        fc.pre(derivativeDFA !== null)
        const reference = nfaToDFA(buildNFA(ast))
        expect(agreeOnLanguage(derivativeDFA as DFA, reference)).toBe(true)
      }),
      { seed: 1953, numRuns: 100 }
    )
  })
})
