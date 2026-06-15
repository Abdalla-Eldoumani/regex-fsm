import { describe, it, expect } from 'vitest'
import { TooLargeError, BOUNDS } from '@/core/automata/types'
import { assertWithinBounds } from '@/core/algorithms/bounds'

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
