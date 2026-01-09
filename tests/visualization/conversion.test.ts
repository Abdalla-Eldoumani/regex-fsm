import { describe, it, expect } from 'vitest'
import { automatonToCytoscape, updateHighlights } from '@/visualization/cytoscape-config'
import { NFA, DFA } from '@/core/automata/types'

describe('automaton to cytoscape conversion', () => {
  describe('automatonToCytoscape', () => {
    it('converts simple NFA with two states', () => {
      const nfa: NFA = {
        states: [
          { id: 'q0' },
          { id: 'q1' },
        ],
        transitions: [
          { from: 'q0', to: 'q1', symbol: 'a' },
        ],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a']),
      }

      const result = automatonToCytoscape(nfa)

      expect(result.nodes).toHaveLength(2)
      expect(result.edges).toHaveLength(1)

      expect(result.nodes[0].data.id).toBe('q0')
      expect(result.nodes[0].data.isStart).toBe(true)
      expect(result.nodes[0].data.isAccept).toBe(false)

      expect(result.nodes[1].data.id).toBe('q1')
      expect(result.nodes[1].data.isStart).toBe(false)
      expect(result.nodes[1].data.isAccept).toBe(true)

      expect(result.edges[0].data.source).toBe('q0')
      expect(result.edges[0].data.target).toBe('q1')
      expect(result.edges[0].data.label).toBe('a')
    })

    it('converts NFA with epsilon transitions', () => {
      const nfa: NFA = {
        states: [
          { id: 'q0' },
          { id: 'q1' },
        ],
        transitions: [
          { from: 'q0', to: 'q1', symbol: null },
        ],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(),
      }

      const result = automatonToCytoscape(nfa)

      expect(result.edges[0].data.label).toBe('ε')
    })

    it('converts DFA with multiple accept states', () => {
      const dfa: DFA = {
        states: [
          { id: 'q0' },
          { id: 'q1' },
          { id: 'q2' },
        ],
        transitions: [
          { from: 'q0', to: 'q1', symbol: 'a' },
          { from: 'q0', to: 'q2', symbol: 'b' },
        ],
        startState: 'q0',
        acceptStates: ['q1', 'q2'],
        alphabet: new Set(['a', 'b']),
      }

      const result = automatonToCytoscape(dfa)

      expect(result.nodes).toHaveLength(3)
      expect(result.edges).toHaveLength(2)

      const q1 = result.nodes.find(n => n.data.id === 'q1')
      const q2 = result.nodes.find(n => n.data.id === 'q2')

      expect(q1?.data.isAccept).toBe(true)
      expect(q2?.data.isAccept).toBe(true)
    })

    it('uses state labels when available', () => {
      const nfa: NFA = {
        states: [
          { id: 'q0', label: 'Start' },
          { id: 'q1', label: 'Accept' },
        ],
        transitions: [
          { from: 'q0', to: 'q1', symbol: 'a' },
        ],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a']),
      }

      const result = automatonToCytoscape(nfa)

      expect(result.nodes[0].data.label).toBe('Start')
      expect(result.nodes[1].data.label).toBe('Accept')
    })

    it('uses state id as label when label not provided', () => {
      const nfa: NFA = {
        states: [
          { id: 'q0' },
        ],
        transitions: [],
        startState: 'q0',
        acceptStates: [],
        alphabet: new Set(),
      }

      const result = automatonToCytoscape(nfa)

      expect(result.nodes[0].data.label).toBe('q0')
    })

    it('marks self-loops with loop class', () => {
      const nfa: NFA = {
        states: [
          { id: 'q0' },
        ],
        transitions: [
          { from: 'q0', to: 'q0', symbol: 'a' },
        ],
        startState: 'q0',
        acceptStates: ['q0'],
        alphabet: new Set(['a']),
      }

      const result = automatonToCytoscape(nfa)

      expect(result.edges[0].classes).toBe('loop')
    })

    it('generates unique edge ids', () => {
      const nfa: NFA = {
        states: [
          { id: 'q0' },
          { id: 'q1' },
          { id: 'q2' },
        ],
        transitions: [
          { from: 'q0', to: 'q1', symbol: 'a' },
          { from: 'q1', to: 'q2', symbol: 'b' },
          { from: 'q0', to: 'q2', symbol: 'c' },
        ],
        startState: 'q0',
        acceptStates: ['q2'],
        alphabet: new Set(['a', 'b', 'c']),
      }

      const result = automatonToCytoscape(nfa)

      const edgeIds = result.edges.map(e => e.data.id)
      const uniqueIds = new Set(edgeIds)

      expect(edgeIds).toHaveLength(3)
      expect(uniqueIds.size).toBe(3)
    })

    it('handles empty automaton', () => {
      const nfa: NFA = {
        states: [],
        transitions: [],
        startState: '',
        acceptStates: [],
        alphabet: new Set(),
      }

      const result = automatonToCytoscape(nfa)

      expect(result.nodes).toHaveLength(0)
      expect(result.edges).toHaveLength(0)
    })
  })

  describe('updateHighlights', () => {
    it('marks highlighted states as active', () => {
      const elements = {
        nodes: [
          { data: { id: 'q0', label: 'q0' } },
          { data: { id: 'q1', label: 'q1' } },
        ],
        edges: [],
      }

      const result = updateHighlights(elements, ['q0'], [])

      expect(result.nodes[0].data.isActive).toBe(true)
      expect(result.nodes[1].data.isActive).toBe(false)
    })

    it('marks highlighted edges as active', () => {
      const elements = {
        nodes: [],
        edges: [
          { data: { id: 'e0', source: 'q0', target: 'q1', label: 'a' } },
          { data: { id: 'e1', source: 'q1', target: 'q2', label: 'b' } },
        ],
      }

      const result = updateHighlights(elements, [], ['e1'])

      expect(result.edges[0].data.isActive).toBe(false)
      expect(result.edges[1].data.isActive).toBe(true)
    })

    it('handles multiple highlighted states and edges', () => {
      const elements = {
        nodes: [
          { data: { id: 'q0', label: 'q0' } },
          { data: { id: 'q1', label: 'q1' } },
          { data: { id: 'q2', label: 'q2' } },
        ],
        edges: [
          { data: { id: 'e0', source: 'q0', target: 'q1', label: 'a' } },
          { data: { id: 'e1', source: 'q1', target: 'q2', label: 'b' } },
        ],
      }

      const result = updateHighlights(elements, ['q0', 'q2'], ['e0'])

      expect(result.nodes[0].data.isActive).toBe(true)
      expect(result.nodes[1].data.isActive).toBe(false)
      expect(result.nodes[2].data.isActive).toBe(true)
      expect(result.edges[0].data.isActive).toBe(true)
      expect(result.edges[1].data.isActive).toBe(false)
    })

    it('handles empty highlight lists', () => {
      const elements = {
        nodes: [
          { data: { id: 'q0', label: 'q0' } },
        ],
        edges: [
          { data: { id: 'e0', source: 'q0', target: 'q1', label: 'a' } },
        ],
      }

      const result = updateHighlights(elements, [], [])

      expect(result.nodes[0].data.isActive).toBe(false)
      expect(result.edges[0].data.isActive).toBe(false)
    })

    it('preserves original element data', () => {
      const elements = {
        nodes: [
          { data: { id: 'q0', label: 'Start', isStart: true, isAccept: false } },
        ],
        edges: [],
      }

      const result = updateHighlights(elements, [], [])

      expect(result.nodes[0].data.id).toBe('q0')
      expect(result.nodes[0].data.label).toBe('Start')
      expect(result.nodes[0].data.isStart).toBe(true)
      expect(result.nodes[0].data.isAccept).toBe(false)
    })
  })
})
