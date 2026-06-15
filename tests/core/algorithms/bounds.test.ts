import { describe, it, expect } from 'vitest'
import { TooLargeError, BOUNDS } from '@/core/automata/types'
import type { NFA } from '@/core/automata/types'
import { assertWithinBounds } from '@/core/algorithms/bounds'
import { nfaToDFA } from '@/core/algorithms/subset'
import { buildNFA } from '@/core/algorithms/thompson'
import { parse } from '@/core/regex/parser'
import { simulateDFA } from '@/core/algorithms/simulate'

// A literal NFA whose determinization is exactly 2^n states: q0 self-loops on
// a and b, then a chain q0 -a-> q1 -(a|b)-> q2 ... -> qn accepts the strings
// whose nth-from-last symbol is 'a'. Built directly (not via regex) so the test
// is a pure subset-construction blow-up. n=9 gives 512 DFA states, past the 256
// cap. The subset construction must throw before finishing, never hang.
function nthFromEndIsA(n: number): NFA {
  const states = Array.from({ length: n + 1 }, (_, i) => ({ id: `q${i}` }))
  const transitions = [
    { from: 'q0', to: 'q0', symbol: 'a' },
    { from: 'q0', to: 'q0', symbol: 'b' },
    { from: 'q0', to: 'q1', symbol: 'a' },
  ]
  for (let i = 1; i < n; i++) {
    transitions.push({ from: `q${i}`, to: `q${i + 1}`, symbol: 'a' })
    transitions.push({ from: `q${i}`, to: `q${i + 1}`, symbol: 'b' })
  }
  return {
    states,
    transitions,
    startState: 'q0',
    acceptStates: [`q${n}`],
    alphabet: new Set(['a', 'b']),
  }
}

// SAFETY-01. These tests pin the shared DoS bound. A small automaton must never
// trip the cap (the existing exact-acceptance suite is the regression net); a
// known 2^n blow-up must throw, never hang and never return a partial result.

describe('TooLargeError', () => {
  it('carries the documented fields and a message naming the limit', () => {
    const err = new TooLargeError('state-cap', 256, { states: 257 })

    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('TooLargeError')
    expect(err.reason).toBe('state-cap')
    expect(err.limit).toBe(256)
    expect(err.partial).toEqual({ states: 257 })
    expect(err.message).toContain('256')
  })

  it('names the time-budget reason and its limit in the message', () => {
    const err = new TooLargeError('time-budget', 2000)

    expect(err.reason).toBe('time-budget')
    expect(err.limit).toBe(2000)
    expect(err.partial).toBeUndefined()
    expect(err.message).toContain('2000')
  })

  it('names the parser-depth reason and its limit in the message', () => {
    const err = new TooLargeError('parser-depth', 300)

    expect(err.reason).toBe('parser-depth')
    expect(err.limit).toBe(300)
    expect(err.message).toContain('300')
  })

  it('interpolates no user input as code (plain text only)', () => {
    const err = new TooLargeError('state-cap', 256, { states: 257 })

    expect(err.message).not.toContain('<')
    expect(err.message).not.toContain('>')
  })
})

describe('BOUNDS', () => {
  it('locks the EDGE_CASES product decision: 256 DFA states', () => {
    expect(BOUNDS.MAX_DFA_STATES).toBe(256)
  })

  it('carries a wall-clock budget and a parser-depth bound', () => {
    expect(BOUNDS.TIME_BUDGET_MS).toBe(2000)
    expect(BOUNDS.MAX_PARSE_DEPTH).toBe(300)
  })

  it('is frozen so the bound cannot be mutated at runtime', () => {
    expect(Object.isFrozen(BOUNDS)).toBe(true)
  })
})

describe('assertWithinBounds', () => {
  const now = () => performance.now()

  it('returns without throwing when the count is below the cap', () => {
    expect(() => assertWithinBounds(255, BOUNDS.TIME_BUDGET_MS, now())).not.toThrow()
  })

  it('returns without throwing exactly at the cap (cap fires on strictly greater)', () => {
    expect(() => assertWithinBounds(256, BOUNDS.TIME_BUDGET_MS, now())).not.toThrow()
  })

  it('throws a state-cap TooLargeError when the count exceeds the cap', () => {
    expect(() => assertWithinBounds(257, BOUNDS.TIME_BUDGET_MS, now())).toThrow(TooLargeError)

    try {
      assertWithinBounds(257, BOUNDS.TIME_BUDGET_MS, now())
    } catch (err) {
      expect(err).toBeInstanceOf(TooLargeError)
      expect((err as TooLargeError).reason).toBe('state-cap')
      expect((err as TooLargeError).limit).toBe(BOUNDS.MAX_DFA_STATES)
      expect((err as TooLargeError).partial).toEqual({ states: 257 })
    }
  })

  it('throws a time-budget TooLargeError when the wall clock is exceeded', () => {
    // A start time far in the past forces the elapsed check past the budget.
    const longAgo = now() - (BOUNDS.TIME_BUDGET_MS + 1000)

    expect(() => assertWithinBounds(10, BOUNDS.TIME_BUDGET_MS, longAgo)).toThrow(TooLargeError)

    try {
      assertWithinBounds(10, BOUNDS.TIME_BUDGET_MS, longAgo)
    } catch (err) {
      expect((err as TooLargeError).reason).toBe('time-budget')
      expect((err as TooLargeError).limit).toBe(BOUNDS.TIME_BUDGET_MS)
      expect((err as TooLargeError).partial).toEqual({ states: 10 })
    }
  })
})

describe('nfaToDFA bound (the additive cap)', () => {
  it('throws TooLargeError on a 2^n blow-up instead of hanging', () => {
    const blowUp = nthFromEndIsA(9) // 512 DFA states uncapped

    expect(() => nfaToDFA(blowUp)).toThrow(TooLargeError)

    try {
      nfaToDFA(blowUp)
    } catch (err) {
      expect(err).toBeInstanceOf(TooLargeError)
      expect((err as TooLargeError).reason).toBe('state-cap')
      expect((err as TooLargeError).limit).toBe(BOUNDS.MAX_DFA_STATES)
    }
  })

  it('throws fast, not after grinding through every state', () => {
    const blowUp = nthFromEndIsA(9)
    const start = performance.now()

    expect(() => nfaToDFA(blowUp)).toThrow(TooLargeError)

    // The cap stops construction just past 256 states; this is far below the
    // 2000ms time budget. A generous ceiling proves "no hang" without being
    // flaky on a slow CI box.
    expect(performance.now() - start).toBeLessThan(1000)
  })

  it('never fires below the cap: (a|b)*abb keeps its exact 5-state DFA', () => {
    // 5 is the measured state count before this change. The cap is additive:
    // it must not alter this value. If this number ever changes, the cap is
    // not additive and subset.ts is wrong (do not edit this expectation).
    const dfa = nfaToDFA(buildNFA(parse('(a|b)*abb')))

    expect(dfa.states.length).toBe(5)
    expect(dfa.states.length).toBeLessThan(BOUNDS.MAX_DFA_STATES)
  })

  it('never fires below the cap: (a|b)*abb acceptance is unchanged', () => {
    const dfa = nfaToDFA(buildNFA(parse('(a|b)*abb')))

    for (const s of ['abb', 'aabb', 'babb']) {
      expect(simulateDFA(dfa, s).accepted).toBe(true)
    }
    for (const s of ['ab', 'aab', 'aba']) {
      expect(simulateDFA(dfa, s).accepted).toBe(false)
    }
  })
})

describe('the cap is dormant for normal inputs (additive proof)', () => {
  // A representative spread of small regexes. None determinizes near 256
  // states, so none may throw and each DFA stays well under the cap. This is
  // the explicit additive-property check that backs the full-suite regression
  // net: it proves the guard does nothing on the inputs students actually use.
  const regexes = [
    'a',
    'ab',
    'a|b',
    'a*',
    'a+',
    'a?',
    '(a|b)*',
    '(a|b)*abb',
    'a*b+c?',
    'ab|cd',
    'a(b|c)*d',
  ]

  it.each(regexes)('builds %s without tripping the cap', (regex) => {
    let dfa
    expect(() => {
      dfa = nfaToDFA(buildNFA(parse(regex)))
    }).not.toThrow()
    expect(dfa!.states.length).toBeLessThan(BOUNDS.MAX_DFA_STATES)
  })
})
