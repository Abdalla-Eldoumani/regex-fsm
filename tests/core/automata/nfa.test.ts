import { describe, it, expect } from 'vitest'
import {
  createStateIdGenerator,
  createState,
  createNFAFragment,
  mergeNFAs,
  addTransition,
  addState,
} from '@/core/automata/nfa'
import { NFA } from '@/core/automata/types'

describe('nfa utilities', () => {
  describe('createStateIdGenerator', () => {
    it('generates sequential state IDs', () => {
      const gen = createStateIdGenerator()
      expect(gen()).toBe('q0')
      expect(gen()).toBe('q1')
      expect(gen()).toBe('q2')
    })

    it('generates independent sequences for different generators', () => {
      const gen1 = createStateIdGenerator()
      const gen2 = createStateIdGenerator()

      expect(gen1()).toBe('q0')
      expect(gen2()).toBe('q0')
      expect(gen1()).toBe('q1')
      expect(gen2()).toBe('q1')
    })

    it('generates unique IDs in sequence', () => {
      const gen = createStateIdGenerator()
      const ids = new Set<string>()

      for (let i = 0; i < 100; i++) {
        const id = gen()
        expect(ids.has(id)).toBe(false)
        ids.add(id)
      }

      expect(ids.size).toBe(100)
    })
  })

  describe('createState', () => {
    it('creates state with ID only', () => {
      const state = createState('q0')
      expect(state).toEqual({ id: 'q0' })
    })

    it('creates state with ID and label', () => {
      const state = createState('q0', 'Start')
      expect(state).toEqual({ id: 'q0', label: 'Start' })
    })

    it('creates state with empty label', () => {
      const state = createState('q1', '')
      expect(state).toEqual({ id: 'q1' })
    })

    it('creates multiple states with different IDs', () => {
      const s1 = createState('q0')
      const s2 = createState('q1')
      expect(s1.id).not.toBe(s2.id)
    })
  })

  describe('createNFAFragment', () => {
    it('creates minimal NFA fragment', () => {
      const states = [{ id: 'q0' }, { id: 'q1' }]
      const transitions = [{ from: 'q0', to: 'q1', symbol: 'a' }]
      const alphabet = new Set(['a'])

      const fragment = createNFAFragment(states, transitions, 'q0', 'q1', alphabet)

      expect(fragment.start).toBe('q0')
      expect(fragment.accept).toBe('q1')
      expect(fragment.nfa.states).toEqual(states)
      expect(fragment.nfa.transitions).toEqual(transitions)
      expect(fragment.nfa.startState).toBe('q0')
      expect(fragment.nfa.acceptStates).toEqual(['q1'])
      expect(fragment.nfa.alphabet).toEqual(alphabet)
    })

    it('creates NFA fragment with epsilon transition', () => {
      const states = [{ id: 'q0' }, { id: 'q1' }]
      const transitions = [{ from: 'q0', to: 'q1', symbol: null }]
      const alphabet = new Set<string>()

      const fragment = createNFAFragment(states, transitions, 'q0', 'q1', alphabet)

      expect(fragment.nfa.transitions[0].symbol).toBeNull()
      expect(fragment.nfa.alphabet.size).toBe(0)
    })

    it('creates NFA fragment with multiple states', () => {
      const states = [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }, { id: 'q3' }]
      const transitions = [
        { from: 'q0', to: 'q1', symbol: 'a' },
        { from: 'q1', to: 'q2', symbol: null },
        { from: 'q2', to: 'q3', symbol: 'b' },
      ]
      const alphabet = new Set(['a', 'b'])

      const fragment = createNFAFragment(states, transitions, 'q0', 'q3', alphabet)

      expect(fragment.nfa.states).toHaveLength(4)
      expect(fragment.nfa.transitions).toHaveLength(3)
    })

    it('creates NFA fragment with multiple symbols in alphabet', () => {
      const states = [{ id: 'q0' }, { id: 'q1' }]
      const transitions = [{ from: 'q0', to: 'q1', symbol: 'a' }]
      const alphabet = new Set(['a', 'b', 'c'])

      const fragment = createNFAFragment(states, transitions, 'q0', 'q1', alphabet)

      expect(fragment.nfa.alphabet).toEqual(new Set(['a', 'b', 'c']))
    })
  })

  describe('mergeNFAs', () => {
    it('merges two simple NFAs', () => {
      const nfa1: NFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a']),
      }

      const nfa2: NFA = {
        states: [{ id: 'q2' }, { id: 'q3' }],
        transitions: [{ from: 'q2', to: 'q3', symbol: 'b' }],
        startState: 'q2',
        acceptStates: ['q3'],
        alphabet: new Set(['b']),
      }

      const merged = mergeNFAs(nfa1, nfa2)

      expect(merged.states).toHaveLength(4)
      expect(merged.transitions).toHaveLength(2)
      expect(merged.startState).toBe('q0')
      expect(merged.acceptStates).toEqual(['q1', 'q3'])
      expect(merged.alphabet).toEqual(new Set(['a', 'b']))
    })

    it('preserves first NFA start state', () => {
      const nfa1: NFA = {
        states: [{ id: 'q0' }],
        transitions: [],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(),
      }

      const nfa2: NFA = {
        states: [{ id: 'q1' }],
        transitions: [],
        startState: 'q1',
        acceptStates: [],
        alphabet: new Set(),
      }

      const merged = mergeNFAs(nfa1, nfa2)
      expect(merged.startState).toBe('q0')
    })

    it('combines accept states from both NFAs', () => {
      const nfa1: NFA = {
        states: [{ id: 'q0' }],
        transitions: [],
        startState: 'q0',
        acceptStates: ['q0'],
        alphabet: new Set(),
      }

      const nfa2: NFA = {
        states: [{ id: 'q1' }],
        transitions: [],
        startState: 'q1',
        acceptStates: ['q1'],
        alphabet: new Set(),
      }

      const merged = mergeNFAs(nfa1, nfa2)
      expect(merged.acceptStates).toEqual(['q0', 'q1'])
    })

    it('merges alphabets without duplicates', () => {
      const nfa1: NFA = {
        states: [{ id: 'q0' }],
        transitions: [],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(['a', 'b']),
      }

      const nfa2: NFA = {
        states: [{ id: 'q1' }],
        transitions: [],
        startState: 'q1',
        acceptStates: [],
        alphabet: new Set(['b', 'c']),
      }

      const merged = mergeNFAs(nfa1, nfa2)
      expect(merged.alphabet).toEqual(new Set(['a', 'b', 'c']))
    })

    it('merges NFAs with epsilon transitions', () => {
      const nfa1: NFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [{ from: 'q0', to: 'q1', symbol: null }],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(),
      }

      const nfa2: NFA = {
        states: [{ id: 'q2' }, { id: 'q3' }],
        transitions: [{ from: 'q2', to: 'q3', symbol: null }],
        startState: 'q2',
        acceptStates: ['q3'],
        alphabet: new Set(),
      }

      const merged = mergeNFAs(nfa1, nfa2)
      expect(merged.transitions).toHaveLength(2)
      expect(merged.transitions.every(t => t.symbol === null)).toBe(true)
    })

    it('handles empty NFAs', () => {
      const nfa1: NFA = {
        states: [],
        transitions: [],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(),
      }

      const nfa2: NFA = {
        states: [{ id: 'q1' }],
        transitions: [],
        startState: 'q1',
        acceptStates: [],
        alphabet: new Set(),
      }

      const merged = mergeNFAs(nfa1, nfa2)
      expect(merged.states).toHaveLength(1)
    })
  })

  describe('addTransition', () => {
    it('adds transition to empty NFA', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(),
      }

      const updated = addTransition(nfa, 'q0', 'q1', 'a')

      expect(updated.transitions).toHaveLength(1)
      expect(updated.transitions[0]).toEqual({ from: 'q0', to: 'q1', symbol: 'a' })
    })

    it('adds transition to existing transitions', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
        transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
        startState: 'q0',
        acceptStates: ['q2'],
        alphabet: new Set(['a']),
      }

      const updated = addTransition(nfa, 'q1', 'q2', 'b')

      expect(updated.transitions).toHaveLength(2)
      expect(updated.transitions[1]).toEqual({ from: 'q1', to: 'q2', symbol: 'b' })
    })

    it('adds epsilon transition', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(),
      }

      const updated = addTransition(nfa, 'q0', 'q1', null)

      expect(updated.transitions[0].symbol).toBeNull()
    })

    it('does not mutate original NFA', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(),
      }

      const updated = addTransition(nfa, 'q0', 'q1', 'a')

      expect(nfa.transitions).toHaveLength(0)
      expect(updated.transitions).toHaveLength(1)
    })

    it('preserves other NFA properties', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }, { id: 'q1' }],
        transitions: [],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a']),
      }

      const updated = addTransition(nfa, 'q0', 'q1', 'a')

      expect(updated.states).toEqual(nfa.states)
      expect(updated.startState).toBe(nfa.startState)
      expect(updated.acceptStates).toEqual(nfa.acceptStates)
      expect(updated.alphabet).toEqual(nfa.alphabet)
    })
  })

  describe('addState', () => {
    it('adds state to empty NFA', () => {
      const nfa: NFA = {
        states: [],
        transitions: [],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(),
      }

      const updated = addState(nfa, { id: 'q0' })

      expect(updated.states).toHaveLength(1)
      expect(updated.states[0]).toEqual({ id: 'q0' })
    })

    it('adds state to existing states', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }],
        transitions: [],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(),
      }

      const updated = addState(nfa, { id: 'q1' })

      expect(updated.states).toHaveLength(2)
      expect(updated.states[1]).toEqual({ id: 'q1' })
    })

    it('adds state with label', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }],
        transitions: [],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(),
      }

      const updated = addState(nfa, { id: 'q1', label: 'Accept' })

      expect(updated.states[1]).toEqual({ id: 'q1', label: 'Accept' })
    })

    it('does not mutate original NFA', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }],
        transitions: [],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(),
      }

      const updated = addState(nfa, { id: 'q1' })

      expect(nfa.states).toHaveLength(1)
      expect(updated.states).toHaveLength(2)
    })

    it('preserves other NFA properties', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }],
        transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a']),
      }

      const updated = addState(nfa, { id: 'q2' })

      expect(updated.transitions).toEqual(nfa.transitions)
      expect(updated.startState).toBe(nfa.startState)
      expect(updated.acceptStates).toEqual(nfa.acceptStates)
      expect(updated.alphabet).toEqual(nfa.alphabet)
    })
  })

  describe('immutability', () => {
    it('mergeNFAs does not mutate inputs', () => {
      const nfa1: NFA = {
        states: [{ id: 'q0' }],
        transitions: [],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(['a']),
      }

      const nfa2: NFA = {
        states: [{ id: 'q1' }],
        transitions: [],
        startState: 'q1',
        acceptStates: [],
        alphabet: new Set(['b']),
      }

      const originalNfa1States = nfa1.states.length
      const originalNfa2States = nfa2.states.length

      mergeNFAs(nfa1, nfa2)

      expect(nfa1.states).toHaveLength(originalNfa1States)
      expect(nfa2.states).toHaveLength(originalNfa2States)
    })

    it('addTransition creates new array', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }],
        transitions: [],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(),
      }

      const updated = addTransition(nfa, 'q0', 'q0', 'a')

      expect(updated.transitions).not.toBe(nfa.transitions)
    })

    it('addState creates new array', () => {
      const nfa: NFA = {
        states: [{ id: 'q0' }],
        transitions: [],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(),
      }

      const updated = addState(nfa, { id: 'q1' })

      expect(updated.states).not.toBe(nfa.states)
    })
  })
})
