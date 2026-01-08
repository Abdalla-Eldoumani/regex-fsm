import { describe, it, expect } from 'vitest'
import { epsilonClosure } from '@/core/algorithms/epsilon'
import { NFA } from '@/core/automata/types'

describe('epsilon closure', () => {
  describe('basic cases', () => {
    it('returns input state if no epsilon transitions', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a']),
      }

      const closure = epsilonClosure(nfa, ['q0'])
      expect(closure).toEqual(new Set(['q0']))
    })

    it('returns multiple input states if no epsilon transitions', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
        transitions: [
          { from: 'q0', to: 'q1', symbol: 'a' },
          { from: 'q1', to: 'q2', symbol: 'b' },
        ],
        startState: 'q0',
        acceptStates: ['q2'],
        alphabet: new Set(['a', 'b']),
      }

      const closure = epsilonClosure(nfa, ['q0', 'q2'])
      expect(closure).toEqual(new Set(['q0', 'q2']))
    })

    it('returns empty set for empty input', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }],
        transitions: [],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(),
      }

      const closure = epsilonClosure(nfa, [])
      expect(closure).toEqual(new Set())
    })
  })

  describe('epsilon chains', () => {
    it('follows single epsilon transition', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [{ from: 'q0', to: 'q1', symbol: null }],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(),
      }

      const closure = epsilonClosure(nfa, ['q0'])
      expect(closure).toEqual(new Set(['q0', 'q1']))
    })

    it('follows chain of epsilon transitions', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
        transitions: [
          { from: 'q0', to: 'q1', symbol: null },
          { from: 'q1', to: 'q2', symbol: null },
        ],
        startState: 'q0',
        acceptStates: ['q2'],
        alphabet: new Set(),
      }

      const closure = epsilonClosure(nfa, ['q0'])
      expect(closure).toEqual(new Set(['q0', 'q1', 'q2']))
    })

    it('follows long chain of epsilon transitions', () => {
      const nfa: NFA = {
        states: [
          { id: 'q0' },
          { id: 'q1' },
          { id: 'q2' },
          { id: 'q3' },
          { id: 'q4' },
        ],
        transitions: [
          { from: 'q0', to: 'q1', symbol: null },
          { from: 'q1', to: 'q2', symbol: null },
          { from: 'q2', to: 'q3', symbol: null },
          { from: 'q3', to: 'q4', symbol: null },
        ],
        startState: 'q0',
        acceptStates: ['q4'],
        alphabet: new Set(),
      }

      const closure = epsilonClosure(nfa, ['q0'])
      expect(closure).toEqual(new Set(['q0', 'q1', 'q2', 'q3', 'q4']))
    })
  })

  describe('epsilon branching', () => {
    it('follows multiple epsilon transitions from one state', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
        transitions: [
          { from: 'q0', to: 'q1', symbol: null },
          { from: 'q0', to: 'q2', symbol: null },
        ],
        startState: 'q0',
        acceptStates: ['q1', 'q2'],
        alphabet: new Set(),
      }

      const closure = epsilonClosure(nfa, ['q0'])
      expect(closure).toEqual(new Set(['q0', 'q1', 'q2']))
    })

    it('follows branching and merging epsilon paths', () => {
      const nfa: NFA = {
        states: [
          { id: 'q0' },
          { id: 'q1' },
          { id: 'q2' },
          { id: 'q3' },
        ],
        transitions: [
          { from: 'q0', to: 'q1', symbol: null },
          { from: 'q0', to: 'q2', symbol: null },
          { from: 'q1', to: 'q3', symbol: null },
          { from: 'q2', to: 'q3', symbol: null },
        ],
        startState: 'q0',
        acceptStates: ['q3'],
        alphabet: new Set(),
      }

      const closure = epsilonClosure(nfa, ['q0'])
      expect(closure).toEqual(new Set(['q0', 'q1', 'q2', 'q3']))
    })
  })

  describe('epsilon cycles', () => {
    it('handles simple epsilon cycle without infinite loop', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [
          { from: 'q0', to: 'q1', symbol: null },
          { from: 'q1', to: 'q0', symbol: null },
        ],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(),
      }

      const closure = epsilonClosure(nfa, ['q0'])
      expect(closure).toEqual(new Set(['q0', 'q1']))
    })

    it('handles self-loop epsilon transition', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }],
        transitions: [{ from: 'q0', to: 'q0', symbol: null }],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(),
      }

      const closure = epsilonClosure(nfa, ['q0'])
      expect(closure).toEqual(new Set(['q0']))
    })

    it('handles complex cycle with branching', () => {
      const nfa: NFA = {
        states: [
          { id: 'q0' },
          { id: 'q1' },
          { id: 'q2' },
          { id: 'q3' },
        ],
        transitions: [
          { from: 'q0', to: 'q1', symbol: null },
          { from: 'q1', to: 'q2', symbol: null },
          { from: 'q2', to: 'q0', symbol: null },
          { from: 'q1', to: 'q3', symbol: null },
        ],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(),
      }

      const closure = epsilonClosure(nfa, ['q0'])
      expect(closure).toEqual(new Set(['q0', 'q1', 'q2', 'q3']))
    })
  })

  describe('mixed transitions', () => {
    it('only follows epsilon transitions, not symbol transitions', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
        transitions: [
          { from: 'q0', to: 'q1', symbol: null },
          { from: 'q1', to: 'q2', symbol: 'a' },
        ],
        startState: 'q0',
        acceptStates: ['q2'],
        alphabet: new Set(['a']),
      }

      const closure = epsilonClosure(nfa, ['q0'])
      expect(closure).toEqual(new Set(['q0', 'q1']))
    })

    it('follows epsilon paths among symbol transitions', () => {
      const nfa: NFA = {
        states: [
          { id: 'q0' },
          { id: 'q1' },
          { id: 'q2' },
          { id: 'q3' },
        ],
        transitions: [
          { from: 'q0', to: 'q1', symbol: 'a' },
          { from: 'q0', to: 'q2', symbol: null },
          { from: 'q2', to: 'q3', symbol: null },
          { from: 'q3', to: 'q1', symbol: 'b' },
        ],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a', 'b']),
      }

      const closure = epsilonClosure(nfa, ['q0'])
      expect(closure).toEqual(new Set(['q0', 'q2', 'q3']))
    })
  })

  describe('multiple starting states', () => {
    it('computes closure from multiple starting points', () => {
      const nfa: NFA = {
        states: [
          { id: 'q0' },
          { id: 'q1' },
          { id: 'q2' },
          { id: 'q3' },
        ],
        transitions: [
          { from: 'q0', to: 'q1', symbol: null },
          { from: 'q2', to: 'q3', symbol: null },
        ],
        startState: 'q0',
        acceptStates: ['q1', 'q3'],
        alphabet: new Set(),
      }

      const closure = epsilonClosure(nfa, ['q0', 'q2'])
      expect(closure).toEqual(new Set(['q0', 'q1', 'q2', 'q3']))
    })

    it('merges overlapping closures', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
        transitions: [
          { from: 'q0', to: 'q2', symbol: null },
          { from: 'q1', to: 'q2', symbol: null },
        ],
        startState: 'q0',
        acceptStates: ['q2'],
        alphabet: new Set(),
      }

      const closure = epsilonClosure(nfa, ['q0', 'q1'])
      expect(closure).toEqual(new Set(['q0', 'q1', 'q2']))
    })
  })

  describe('edge cases', () => {
    it('handles state with no outgoing transitions', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [{ from: 'q0', to: 'q1', symbol: null }],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(),
      }

      const closure = epsilonClosure(nfa, ['q1'])
      expect(closure).toEqual(new Set(['q1']))
    })

    it('handles NFA with no transitions', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }],
        transitions: [],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(),
      }

      const closure = epsilonClosure(nfa, ['q0'])
      expect(closure).toEqual(new Set(['q0']))
    })

    it('handles fully connected epsilon graph', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
        transitions: [
          { from: 'q0', to: 'q1', symbol: null },
          { from: 'q0', to: 'q2', symbol: null },
          { from: 'q1', to: 'q0', symbol: null },
          { from: 'q1', to: 'q2', symbol: null },
          { from: 'q2', to: 'q0', symbol: null },
          { from: 'q2', to: 'q1', symbol: null },
        ],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(),
      }

      const closure = epsilonClosure(nfa, ['q0'])
      expect(closure).toEqual(new Set(['q0', 'q1', 'q2']))
    })
  })
})
