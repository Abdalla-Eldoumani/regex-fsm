import { describe, it, expect } from 'vitest'
import {
  buildAvoidanceDFA,
  buildNotStartsWithDFA,
  buildNotEndsWithDFA,
} from '@/core/algorithms/avoidance'
import { simulateDFA } from '@/core/algorithms/simulate'

describe('buildAvoidanceDFA', () => {
  describe('basic "does not contain" patterns', () => {
    it('should build DFA for "does not contain bba" with alphabet {a, b}', () => {
      const alphabet = new Set(['a', 'b'])
      const result = buildAvoidanceDFA('bba', alphabet)
      const { dfa } = result

      // Should have 4 states: q0, q1, q2, and trap (∅)
      expect(dfa.states.length).toBe(4)
      expect(dfa.startState).toBe('q0')

      // Accept states should be q0, q1, q2 (not the trap state)
      expect(dfa.acceptStates).toContain('q0')
      expect(dfa.acceptStates).toContain('q1')
      expect(dfa.acceptStates).toContain('q2')
      expect(dfa.acceptStates).not.toContain('∅')
    })

    it('should accept empty string (λ)', () => {
      const alphabet = new Set(['a', 'b'])
      const result = buildAvoidanceDFA('bba', alphabet)
      const simResult = simulateDFA(result.dfa, '')
      expect(simResult.accepted).toBe(true)
    })

    it('should accept strings without "bba"', () => {
      const alphabet = new Set(['a', 'b'])
      const result = buildAvoidanceDFA('bba', alphabet)
      const { dfa } = result

      // Test various strings that don't contain "bba"
      expect(simulateDFA(dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(dfa, 'b').accepted).toBe(true)
      expect(simulateDFA(dfa, 'aa').accepted).toBe(true)
      expect(simulateDFA(dfa, 'ab').accepted).toBe(true)
      expect(simulateDFA(dfa, 'ba').accepted).toBe(true)
      expect(simulateDFA(dfa, 'bb').accepted).toBe(true)
      expect(simulateDFA(dfa, 'aab').accepted).toBe(true)
      expect(simulateDFA(dfa, 'aba').accepted).toBe(true)
      expect(simulateDFA(dfa, 'bab').accepted).toBe(true)
      expect(simulateDFA(dfa, 'bbb').accepted).toBe(true)
      expect(simulateDFA(dfa, 'aabb').accepted).toBe(true)
      expect(simulateDFA(dfa, 'abab').accepted).toBe(true)
    })

    it('should reject strings containing "bba"', () => {
      const alphabet = new Set(['a', 'b'])
      const result = buildAvoidanceDFA('bba', alphabet)
      const { dfa } = result

      // Test various strings that contain "bba"
      expect(simulateDFA(dfa, 'bba').accepted).toBe(false)
      expect(simulateDFA(dfa, 'abba').accepted).toBe(false)
      expect(simulateDFA(dfa, 'bbab').accepted).toBe(false)
      expect(simulateDFA(dfa, 'bbaaa').accepted).toBe(false)
      expect(simulateDFA(dfa, 'aabba').accepted).toBe(false)
      expect(simulateDFA(dfa, 'bbabb').accepted).toBe(false)
    })
  })

  describe('single character patterns', () => {
    it('should handle "does not contain a"', () => {
      const alphabet = new Set(['a', 'b'])
      const result = buildAvoidanceDFA('a', alphabet)
      const { dfa } = result

      // Should accept strings with only b's
      expect(simulateDFA(dfa, '').accepted).toBe(true)
      expect(simulateDFA(dfa, 'b').accepted).toBe(true)
      expect(simulateDFA(dfa, 'bb').accepted).toBe(true)
      expect(simulateDFA(dfa, 'bbb').accepted).toBe(true)

      // Should reject strings with any a
      expect(simulateDFA(dfa, 'a').accepted).toBe(false)
      expect(simulateDFA(dfa, 'ab').accepted).toBe(false)
      expect(simulateDFA(dfa, 'ba').accepted).toBe(false)
      expect(simulateDFA(dfa, 'aba').accepted).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle empty pattern (accepts all strings)', () => {
      const alphabet = new Set(['a', 'b'])
      const result = buildAvoidanceDFA('', alphabet)
      const { dfa } = result

      expect(simulateDFA(dfa, '').accepted).toBe(true)
      expect(simulateDFA(dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(dfa, 'ab').accepted).toBe(true)
      expect(simulateDFA(dfa, 'aabbab').accepted).toBe(true)
    })

    it('should handle pattern with repeated characters', () => {
      const alphabet = new Set(['a', 'b'])
      const result = buildAvoidanceDFA('aa', alphabet)
      const { dfa } = result

      // Should accept strings without "aa"
      expect(simulateDFA(dfa, '').accepted).toBe(true)
      expect(simulateDFA(dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(dfa, 'b').accepted).toBe(true)
      expect(simulateDFA(dfa, 'ab').accepted).toBe(true)
      expect(simulateDFA(dfa, 'ba').accepted).toBe(true)
      expect(simulateDFA(dfa, 'aba').accepted).toBe(true)
      expect(simulateDFA(dfa, 'bab').accepted).toBe(true)

      // Should reject strings with "aa"
      expect(simulateDFA(dfa, 'aa').accepted).toBe(false)
      expect(simulateDFA(dfa, 'aab').accepted).toBe(false)
      expect(simulateDFA(dfa, 'baa').accepted).toBe(false)
      expect(simulateDFA(dfa, 'baab').accepted).toBe(false)
    })

    it('should handle larger alphabet', () => {
      const alphabet = new Set(['a', 'b', 'c'])
      const result = buildAvoidanceDFA('abc', alphabet)
      const { dfa } = result

      // Should accept strings without "abc"
      expect(simulateDFA(dfa, '').accepted).toBe(true)
      expect(simulateDFA(dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(dfa, 'ab').accepted).toBe(true)
      expect(simulateDFA(dfa, 'cab').accepted).toBe(true)
      expect(simulateDFA(dfa, 'acb').accepted).toBe(true)

      // Should reject strings with "abc"
      expect(simulateDFA(dfa, 'abc').accepted).toBe(false)
      expect(simulateDFA(dfa, 'aabc').accepted).toBe(false)
      expect(simulateDFA(dfa, 'abcc').accepted).toBe(false)
    })
  })
})

describe('buildNotStartsWithDFA', () => {
  describe('basic "does not start with" patterns', () => {
    it('should build DFA for "does not start with ab"', () => {
      const alphabet = new Set(['a', 'b'])
      const result = buildNotStartsWithDFA('ab', alphabet)
      const { dfa } = result

      expect(dfa.startState).toBe('q0')
    })

    it('should accept empty string', () => {
      const alphabet = new Set(['a', 'b'])
      const result = buildNotStartsWithDFA('ab', alphabet)
      const simResult = simulateDFA(result.dfa, '')
      expect(simResult.accepted).toBe(true)
    })

    it('should accept strings not starting with pattern', () => {
      const alphabet = new Set(['a', 'b'])
      const result = buildNotStartsWithDFA('ab', alphabet)
      const { dfa } = result

      // Should accept strings not starting with "ab"
      expect(simulateDFA(dfa, 'b').accepted).toBe(true)
      expect(simulateDFA(dfa, 'ba').accepted).toBe(true)
      expect(simulateDFA(dfa, 'bb').accepted).toBe(true)
      expect(simulateDFA(dfa, 'aa').accepted).toBe(true)
      expect(simulateDFA(dfa, 'aab').accepted).toBe(true)
    })

    it('should reject strings starting with pattern', () => {
      const alphabet = new Set(['a', 'b'])
      const result = buildNotStartsWithDFA('ab', alphabet)
      const { dfa } = result

      // Should reject strings starting with "ab"
      expect(simulateDFA(dfa, 'ab').accepted).toBe(false)
      expect(simulateDFA(dfa, 'aba').accepted).toBe(false)
      expect(simulateDFA(dfa, 'abb').accepted).toBe(false)
      expect(simulateDFA(dfa, 'abab').accepted).toBe(false)
    })
  })

  describe('single character patterns', () => {
    it('should handle "does not start with a"', () => {
      const alphabet = new Set(['a', 'b'])
      const result = buildNotStartsWithDFA('a', alphabet)
      const { dfa } = result

      // Should accept strings not starting with 'a'
      expect(simulateDFA(dfa, '').accepted).toBe(true)
      expect(simulateDFA(dfa, 'b').accepted).toBe(true)
      expect(simulateDFA(dfa, 'ba').accepted).toBe(true)
      expect(simulateDFA(dfa, 'bb').accepted).toBe(true)

      // Should reject strings starting with 'a'
      expect(simulateDFA(dfa, 'a').accepted).toBe(false)
      expect(simulateDFA(dfa, 'ab').accepted).toBe(false)
      expect(simulateDFA(dfa, 'aa').accepted).toBe(false)
    })
  })
})

describe('buildNotEndsWithDFA', () => {
  describe('basic "does not end with" patterns', () => {
    it('should build DFA for "does not end with ab"', () => {
      const alphabet = new Set(['a', 'b'])
      const result = buildNotEndsWithDFA('ab', alphabet)
      const { dfa } = result

      expect(dfa.startState).toBe('q0')
    })

    it('should accept empty string', () => {
      const alphabet = new Set(['a', 'b'])
      const result = buildNotEndsWithDFA('ab', alphabet)
      const simResult = simulateDFA(result.dfa, '')
      expect(simResult.accepted).toBe(true)
    })

    it('should accept strings not ending with pattern', () => {
      const alphabet = new Set(['a', 'b'])
      const result = buildNotEndsWithDFA('ab', alphabet)
      const { dfa } = result

      // Should accept strings not ending with "ab"
      expect(simulateDFA(dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(dfa, 'b').accepted).toBe(true)
      expect(simulateDFA(dfa, 'aa').accepted).toBe(true)
      expect(simulateDFA(dfa, 'ba').accepted).toBe(true)
      expect(simulateDFA(dfa, 'bb').accepted).toBe(true)
      expect(simulateDFA(dfa, 'aba').accepted).toBe(true)
      expect(simulateDFA(dfa, 'abb').accepted).toBe(true)
    })

    it('should reject strings ending with pattern', () => {
      const alphabet = new Set(['a', 'b'])
      const result = buildNotEndsWithDFA('ab', alphabet)
      const { dfa } = result

      // Should reject strings ending with "ab"
      expect(simulateDFA(dfa, 'ab').accepted).toBe(false)
      expect(simulateDFA(dfa, 'aab').accepted).toBe(false)
      expect(simulateDFA(dfa, 'bab').accepted).toBe(false)
      expect(simulateDFA(dfa, 'abab').accepted).toBe(false)
    })
  })

  describe('single character patterns', () => {
    it('should handle "does not end with a"', () => {
      const alphabet = new Set(['a', 'b'])
      const result = buildNotEndsWithDFA('a', alphabet)
      const { dfa } = result

      // Should accept strings not ending with 'a'
      expect(simulateDFA(dfa, '').accepted).toBe(true)
      expect(simulateDFA(dfa, 'b').accepted).toBe(true)
      expect(simulateDFA(dfa, 'ab').accepted).toBe(true)
      expect(simulateDFA(dfa, 'bb').accepted).toBe(true)

      // Should reject strings ending with 'a'
      expect(simulateDFA(dfa, 'a').accepted).toBe(false)
      expect(simulateDFA(dfa, 'ba').accepted).toBe(false)
      expect(simulateDFA(dfa, 'aa').accepted).toBe(false)
    })
  })

  describe('overlapping patterns', () => {
    it('should handle pattern "aba" correctly', () => {
      const alphabet = new Set(['a', 'b'])
      const result = buildNotEndsWithDFA('aba', alphabet)
      const { dfa } = result

      // Should accept strings not ending with "aba"
      expect(simulateDFA(dfa, '').accepted).toBe(true)
      expect(simulateDFA(dfa, 'ab').accepted).toBe(true)
      expect(simulateDFA(dfa, 'abb').accepted).toBe(true)
      expect(simulateDFA(dfa, 'abab').accepted).toBe(true)

      // Should reject strings ending with "aba"
      expect(simulateDFA(dfa, 'aba').accepted).toBe(false)
      expect(simulateDFA(dfa, 'aaba').accepted).toBe(false)
      expect(simulateDFA(dfa, 'baba').accepted).toBe(false)
    })
  })
})

describe('DFA structure validation', () => {
  it('avoidance DFA should be complete (all states have transitions for all symbols)', () => {
    const alphabet = new Set(['a', 'b'])
    const result = buildAvoidanceDFA('bba', alphabet)
    const { dfa } = result

    // Each state should have exactly |alphabet| transitions
    const transitionCount = new Map<string, number>()
    for (const state of dfa.states) {
      transitionCount.set(state.id, 0)
    }

    for (const transition of dfa.transitions) {
      const count = transitionCount.get(transition.from) || 0
      transitionCount.set(transition.from, count + 1)
    }

    for (const [stateId, count] of transitionCount) {
      expect(count).toBe(alphabet.size)
    }
  })

  it('trap state should have self-loops for all symbols', () => {
    const alphabet = new Set(['a', 'b'])
    const result = buildAvoidanceDFA('bba', alphabet)
    const { dfa } = result

    // Find trap state transitions
    const trapTransitions = dfa.transitions.filter((t) => t.from === '∅')
    expect(trapTransitions.length).toBe(alphabet.size)

    for (const t of trapTransitions) {
      expect(t.to).toBe('∅')
    }
  })
})
