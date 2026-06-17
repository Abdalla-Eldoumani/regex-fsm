import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  buildAvoidanceDFA,
  buildNotStartsWithDFA,
  buildNotEndsWithDFA,
} from '@/core/algorithms/avoidance'
import { simulateDFA } from '@/core/algorithms/simulate'

// Property suite for the avoidance DFA family (does-not-contain, not-starts-with,
// not-ends-with). Each construction claims to recognize exactly one language, so
// the reference here is a plain string predicate that IS that language: the
// predicate decides membership directly, never by compiling input to a JS RegExp
// and never through the NFA pipeline, so a construction bug cannot hide behind a
// shared implementation. Acceptance is decided by simulateDFA over an exhaustive
// bounded battery, so this is a decision over the bounded language rather than a
// probabilistic spot check. Seeds are fixed so a counterexample reproduces; per
// the project conventions a counterexample becomes a named unit test and the
// construction is fixed, never the property loosened.

const SYMBOLS = ['a', 'b'] as const

// Every string over SYMBOLS with length in [0, maxLength], enumerated in full.
// 2^0 + ... + 2^7 = 255 strings over {a, b}: small enough to enumerate per run,
// long enough to expose an accept-set error in any short pattern.
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

// The three language predicates. Each one is the spec for its construction.
function doesNotContain(pattern: string, w: string): boolean {
  return !w.includes(pattern)
}

function doesNotStartWith(pattern: string, w: string): boolean {
  return !w.startsWith(pattern)
}

function doesNotEndWith(pattern: string, w: string): boolean {
  return !w.endsWith(pattern)
}

// A non-empty pattern over {a, b}, length 1 to 4. Built from an array of single
// symbols joined to a string, the known-good arbitrary already used in the regex
// property suite, so it does not depend on a specific fast-check string-unit API.
const patternArb = fc
  .array(fc.constantFrom(...SYMBOLS), { minLength: 1, maxLength: 4 })
  .map((chars) => chars.join(''))

describe('avoidance DFA family language properties', () => {
  it('buildNotStartsWithDFA accepts w iff w does not start with the pattern', () => {
    fc.assert(
      fc.property(patternArb, (pattern) => {
        const { dfa } = buildNotStartsWithDFA(pattern, new Set(SYMBOLS))
        for (const w of STRING_BATTERY) {
          expect(simulateDFA(dfa, w).accepted).toBe(doesNotStartWith(pattern, w))
        }
      }),
      { seed: 14, numRuns: 100 }
    )
  })

  it('buildAvoidanceDFA accepts w iff w does not contain the pattern', () => {
    fc.assert(
      fc.property(patternArb, (pattern) => {
        const { dfa } = buildAvoidanceDFA(pattern, new Set(SYMBOLS))
        for (const w of STRING_BATTERY) {
          expect(simulateDFA(dfa, w).accepted).toBe(doesNotContain(pattern, w))
        }
      }),
      { seed: 14, numRuns: 100 }
    )
  })

  it('buildNotEndsWithDFA accepts w iff w does not end with the pattern', () => {
    fc.assert(
      fc.property(patternArb, (pattern) => {
        const { dfa } = buildNotEndsWithDFA(pattern, new Set(SYMBOLS))
        for (const w of STRING_BATTERY) {
          expect(simulateDFA(dfa, w).accepted).toBe(doesNotEndWith(pattern, w))
        }
      }),
      { seed: 14, numRuns: 100 }
    )
  })
})
