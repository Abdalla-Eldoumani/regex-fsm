import { describe, it, expect } from 'vitest'
import { loadAutomaton } from '@/editor/loadAutomaton'
import { toAutomaton } from '@/editor/toAutomaton'
import { nfaToDFA } from '@/core/algorithms/subset'
import { equivalence } from '@/core/algorithms/equivalence'
import { Automaton } from '@/core/automata/types'

// loadAutomaton is the inverse of toAutomaton: it takes a core Automaton and builds
// the editor's working state (the find-the-bug pre-load path). These tests prove the
// round trip preserves LANGUAGE (decided by equivalence, never by shape) and the full
// structure: the start state, the accept set, and the transition MULTISET including
// duplicate parallel edges. They also pin the editor-specific guarantees a valid
// working state needs: a position for every state, a unique id per edge, and the
// empty-start '' <-> null mapping.

// A representative machine over Sigma = {a, b}: q0 start, q0 -a-> q1, q1 -b-> q2
// (accepting), with a self-loop on q0 for b and a back edge q2 -a-> q1. It also has a
// PARALLEL EDGE: two q0 -a-> q1 transitions on the same symbol, so the multiset
// comparison below is non-vacuous (a dropped or merged duplicate would be caught).
function representative(): Automaton {
  return {
    states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2', label: 'done' }],
    transitions: [
      { from: 'q0', to: 'q1', symbol: 'a' },
      { from: 'q0', to: 'q1', symbol: 'a' }, // parallel edge: same from/to/symbol
      { from: 'q0', to: 'q0', symbol: 'b' },
      { from: 'q1', to: 'q2', symbol: 'b' },
      { from: 'q2', to: 'q1', symbol: 'a' },
    ],
    startState: 'q0',
    acceptStates: ['q2'],
    alphabet: new Set(['a', 'b']),
  }
}

// Map a transition list to sorted "from|to|symbol" triples. Sorting an ARRAY (never a
// Set) keeps duplicates, so a dropped or duplicated parallel edge changes the result.
function tripleMultiset(ts: { from: string; to: string; symbol: string | null }[]): string[] {
  return ts.map(t => `${t.from}|${t.to}|${t.symbol}`).sort()
}

describe('loadAutomaton', () => {
  it('round-trips through toAutomaton as a language-equivalent automaton', () => {
    const a = representative()
    const back = toAutomaton(loadAutomaton(a))
    const sigma = new Set(['a', 'b'])
    const v = equivalence(nfaToDFA(a, sigma), nfaToDFA(back, sigma), sigma)
    expect(v).toEqual({ equivalent: true })
  })

  it('preserves the start state and the accept set across the round trip', () => {
    const a = representative()
    const back = toAutomaton(loadAutomaton(a))
    expect(back.startState).toBe('q0')
    expect([...back.acceptStates].sort()).toEqual(['q2'])
  })

  it('preserves the transition multiset including the parallel edge', () => {
    const a = representative()
    const back = toAutomaton(loadAutomaton(a))
    // The sorted triple arrays must be deeply equal: same edges, same duplicates.
    expect(tripleMultiset(back.transitions)).toEqual(tripleMultiset(a.transitions))
    // Non-vacuity guard: the input really does carry a duplicate, so the comparison
    // is testing multiset equality, not mere set equality.
    const triples = tripleMultiset(a.transitions)
    expect(triples.length).toBe(5)
    expect(new Set(triples).size).toBe(4)
  })

  it('keeps each state label and assigns a position to every state', () => {
    const a = representative()
    const w = loadAutomaton(a)
    expect(w.states).toContainEqual({ id: 'q2', label: 'done' })
    for (const s of a.states) {
      expect(w.positions[s.id]).toBeDefined()
      expect(typeof w.positions[s.id].x).toBe('number')
      expect(typeof w.positions[s.id].y).toBe('number')
    }
  })

  it('gives every transition a unique editor edge id', () => {
    const w = loadAutomaton(representative())
    const ids = w.transitions.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBe(5)
  })

  it('starts the loaded machine with no selection', () => {
    const w = loadAutomaton(representative())
    expect(w.selection).toEqual({ nodeIds: [], edgeIds: [] })
  })

  it('maps an empty-string start state to null (the empty-editor degenerate case)', () => {
    const empty: Automaton = {
      states: [],
      transitions: [],
      startState: '',
      acceptStates: [],
      alphabet: new Set(),
    }
    expect(loadAutomaton(empty).startState).toBeNull()
  })

  it('does not mutate the input automaton', () => {
    const a = representative()
    const before = JSON.stringify({
      states: a.states,
      transitions: a.transitions,
      startState: a.startState,
      acceptStates: a.acceptStates,
    })
    loadAutomaton(a)
    const after = JSON.stringify({
      states: a.states,
      transitions: a.transitions,
      startState: a.startState,
      acceptStates: a.acceptStates,
    })
    expect(after).toBe(before)
  })
})
