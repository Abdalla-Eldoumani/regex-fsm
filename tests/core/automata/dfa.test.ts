import { describe, it, expect } from 'vitest'
import { isDeterministic, validateDFA } from '@/core/automata/dfa'
import { DFA } from '@/core/automata/types'

describe('dfa utilities', () => {
  describe('isDeterministic', () => {
    it('returns true for simple deterministic DFA', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a']),
      }

      expect(isDeterministic(dfa)).toBe(true)
    })

    it('returns true for DFA with multiple transitions from different states', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
        transitions: [
          { from: 'q0', to: 'q1', symbol: 'a' },
          { from: 'q1', to: 'q2', symbol: 'a' },
        ],
        startState: 'q0',
        acceptStates: ['q2'],
        alphabet: new Set(['a']),
      }

      expect(isDeterministic(dfa)).toBe(true)
    })

    it('returns true for DFA with different symbols from same state', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
        transitions: [
          { from: 'q0', to: 'q1', symbol: 'a' },
          { from: 'q0', to: 'q2', symbol: 'b' },
        ],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a', 'b']),
      }

      expect(isDeterministic(dfa)).toBe(true)
    })

    it('returns false for DFA with multiple transitions on same symbol', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
        transitions: [
          { from: 'q0', to: 'q1', symbol: 'a' },
          { from: 'q0', to: 'q2', symbol: 'a' },
        ],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a']),
      }

      expect(isDeterministic(dfa)).toBe(false)
    })

    it('returns false for DFA with epsilon transition', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [{ from: 'q0', to: 'q1', symbol: null }],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(),
      }

      expect(isDeterministic(dfa)).toBe(false)
    })

    it('returns true for DFA with no transitions', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }],
        transitions: [],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(),
      }

      expect(isDeterministic(dfa)).toBe(true)
    })

    it('returns true for complete DFA', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [
          { from: 'q0', to: 'q0', symbol: 'a' },
          { from: 'q0', to: 'q1', symbol: 'b' },
          { from: 'q1', to: 'q0', symbol: 'a' },
          { from: 'q1', to: 'q1', symbol: 'b' },
        ],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a', 'b']),
      }

      expect(isDeterministic(dfa)).toBe(true)
    })

    it('handles self-loops correctly', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }],
        transitions: [{ from: 'q0', to: 'q0', symbol: 'a' }],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(['a']),
      }

      expect(isDeterministic(dfa)).toBe(true)
    })

    it('detects nondeterminism with multiple self-loops', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }],
        transitions: [
          { from: 'q0', to: 'q0', symbol: 'a' },
          { from: 'q0', to: 'q0', symbol: 'a' },
        ],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(['a']),
      }

      expect(isDeterministic(dfa)).toBe(false)
    })
  })

  describe('validateDFA', () => {
    it('validates simple valid DFA', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a']),
      }

      expect(() => validateDFA(dfa)).not.toThrow()
    })

    it('validates DFA with no accept states', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }],
        transitions: [],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(),
      }

      expect(() => validateDFA(dfa)).not.toThrow()
    })

    it('validates complete DFA', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [
          { from: 'q0', to: 'q0', symbol: 'a' },
          { from: 'q0', to: 'q1', symbol: 'b' },
          { from: 'q1', to: 'q0', symbol: 'a' },
          { from: 'q1', to: 'q1', symbol: 'b' },
        ],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a', 'b']),
      }

      expect(() => validateDFA(dfa)).not.toThrow()
    })

    it('throws when start state not in states', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }],
        transitions: [],
        startState: 'q1',
        acceptStates: [],
        alphabet: new Set(),
      }

      expect(() => validateDFA(dfa)).toThrow('Start state q1 not found in states')
    })

    it('throws when accept state not in states', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }],
        transitions: [],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(),
      }

      expect(() => validateDFA(dfa)).toThrow('Accept state q1 not found in states')
    })

    it('throws when transition from state not in states', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [{ from: 'q2', to: 'q1', symbol: 'a' }],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(['a']),
      }

      expect(() => validateDFA(dfa)).toThrow('Transition from state q2 not found in states')
    })

    it('throws when transition to state not in states', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [{ from: 'q0', to: 'q2', symbol: 'a' }],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(['a']),
      }

      expect(() => validateDFA(dfa)).toThrow('Transition to state q2 not found in states')
    })

    it('throws when DFA has epsilon transition', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [{ from: 'q0', to: 'q1', symbol: null }],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(),
      }

      expect(() => validateDFA(dfa)).toThrow('DFA is not deterministic')
    })

    it('throws when DFA has multiple transitions on same symbol', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
        transitions: [
          { from: 'q0', to: 'q1', symbol: 'a' },
          { from: 'q0', to: 'q2', symbol: 'a' },
        ],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a']),
      }

      expect(() => validateDFA(dfa)).toThrow('DFA is not deterministic')
    })

    it('validates DFA with multiple accept states', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
        transitions: [
          { from: 'q0', to: 'q1', symbol: 'a' },
          { from: 'q0', to: 'q2', symbol: 'b' },
        ],
        startState: 'q0',
        acceptStates: ['q1', 'q2'],
        alphabet: new Set(['a', 'b']),
      }

      expect(() => validateDFA(dfa)).not.toThrow()
    })

    it('throws when one of multiple accept states not in states', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [],
        startState: 'q0',
        acceptStates: ['q1', 'q2'],
        alphabet: new Set(),
      }

      expect(() => validateDFA(dfa)).toThrow('Accept state q2 not found in states')
    })

    it('validates DFA with self-loops', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }],
        transitions: [{ from: 'q0', to: 'q0', symbol: 'a' }],
        startState: 'q0',
        acceptStates: ['q0'],
        alphabet: new Set(['a']),
      }

      expect(() => validateDFA(dfa)).not.toThrow()
    })

    it('validates DFA where start state is also accept state', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }],
        transitions: [],
        startState: 'q0',
        acceptStates: ['q0'],
        alphabet: new Set(),
      }

      expect(() => validateDFA(dfa)).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('validates minimal DFA with single state', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }],
        transitions: [],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(),
      }

      expect(isDeterministic(dfa)).toBe(true)
      expect(() => validateDFA(dfa)).not.toThrow()
    })

    it('handles DFA with large number of transitions', () => {
      const states = Array.from({ length: 10 }, (_, i) => ({ id: `q${i}` }))
      const transitions = []

      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          transitions.push({ from: `q${i}`, to: `q${j}`, symbol: `s${j}` })
        }
      }

      const dfa: DFA = {
        states,
        transitions,
        startState: 'q0',
        acceptStates: ['q9'],
        alphabet: new Set(transitions.map(t => t.symbol as string)),
      }

      expect(isDeterministic(dfa)).toBe(true)
      expect(() => validateDFA(dfa)).not.toThrow()
    })

    it('detects nondeterminism in complex DFA', () => {
      const dfa: DFA = {
        states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
        transitions: [
          { from: 'q0', to: 'q1', symbol: 'a' },
          { from: 'q0', to: 'q1', symbol: 'b' },
          { from: 'q0', to: 'q2', symbol: 'a' },
        ],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a', 'b']),
      }

      expect(isDeterministic(dfa)).toBe(false)
    })

    it('validates DFA with labels on states', () => {
      const dfa: DFA = {
        states: [
          { id: 'q0', label: 'Start' },
          { id: 'q1', label: 'Accept' },
        ],
        transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a']),
      }

      expect(() => validateDFA(dfa)).not.toThrow()
    })
  })
})
