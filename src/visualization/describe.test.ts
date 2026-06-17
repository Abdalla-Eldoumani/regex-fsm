import { describe, it, expect } from 'vitest'
import { automatonToDescription } from './describe'
import type { Automaton } from '@/core/automata/types'

// This suite proves automatonToDescription renders an automaton as a course-notation
// prose summary for a screen reader: the quintuple (Q, Σ, δ, q₀, A), the sorted
// alphabet, the state roster, the start state, the accept set A (with ∅ for an empty
// set), and δ as a readable move list (λ for the empty-string move, the empty-set
// glyph for the trap). It is the same model the TransitionTable renders, so the
// summary matches the diagram exactly (SKILL: a representation presented as the
// automaton must BE the automaton). Substring assertions, never an exact-string
// match, so the connective wording stays free to read naturally.

describe('automatonToDescription', () => {
  it('renders the quintuple, the sorted alphabet, the start, the accept set A, and δ', () => {
    // A 2-state DFA over {a, b}: q0 on a to q1, q0 on b to q0, q1 accepting.
    const dfa: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [
        { from: 'q0', to: 'q1', symbol: 'a' },
        { from: 'q0', to: 'q0', symbol: 'b' },
      ],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a', 'b']),
    }
    const text = automatonToDescription(dfa)
    // The quintuple is announced.
    expect(text).toContain('(Q, Σ, δ, q₀, A)')
    // The alphabet is sorted set notation.
    expect(text).toContain('Σ = {a, b}')
    // The state roster names the count and the ids.
    expect(text).toContain('2 states')
    expect(text).toContain('q0')
    expect(text).toContain('q1')
    // The start state from automaton.startState.
    expect(text).toContain('Start state: q0')
    // The accept set uses A and set notation for a non-empty set.
    expect(text).toContain('A = {q1}')
    // δ reads as from-symbol-to moves.
    expect(text).toContain('q0 on a to q1')
    expect(text).toContain('q0 on b to q0')
  })

  it('sorts the alphabet regardless of Set insertion order', () => {
    const dfa: Automaton = {
      states: [{ id: 'q0' }],
      transitions: [],
      startState: 'q0',
      acceptStates: [],
      // Insertion order is b before a; the summary must still read {a, b}.
      alphabet: new Set(['b', 'a']),
    }
    expect(automatonToDescription(dfa)).toContain('Σ = {a, b}')
  })

  it('uses ∅ for an empty alphabet', () => {
    const automaton: Automaton = {
      states: [{ id: 'q0' }],
      transitions: [],
      startState: 'q0',
      acceptStates: [],
      alphabet: new Set<string>(),
    }
    expect(automatonToDescription(automaton)).toContain('Σ = ∅')
  })

  it('uses λ for an empty-string move and ∅ for an empty accept set', () => {
    const nfa: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      // symbol null is the λ-move.
      transitions: [{ from: 'q0', to: 'q1', symbol: null }],
      startState: 'q0',
      acceptStates: [],
      alphabet: new Set<string>(),
    }
    const text = automatonToDescription(nfa)
    expect(text).toContain('q0 on λ to q1')
    expect(text).toContain('A = ∅')
  })

  it('reads the trap state ∅ as a real state with its self-moves', () => {
    // The trap state id is the literal empty-set glyph (subset construction).
    const dfa: Automaton = {
      states: [{ id: 'q0' }, { id: '∅' }],
      transitions: [
        { from: 'q0', to: '∅', symbol: 'a' },
        { from: '∅', to: '∅', symbol: 'a' },
      ],
      startState: 'q0',
      acceptStates: ['q0'],
      alphabet: new Set(['a']),
    }
    const text = automatonToDescription(dfa)
    // The trap is named as a state and its move reads with the empty-set glyph.
    expect(text).toContain('∅')
    expect(text).toContain('∅ on a to ∅')
  })

  it('names a state with no outgoing transitions instead of omitting it', () => {
    const dfa: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a']),
    }
    const text = automatonToDescription(dfa)
    // q1 has no outgoing edge; that fact is stated, not silently dropped.
    expect(text).toContain('q1 has no outgoing transitions')
  })

  it('is derived purely from the model: the alphabet, start, accept, and one δ move all appear together', () => {
    // Build one automaton and assert the summary surfaces the same facts the
    // TransitionTable would render for it (alphabet, start, accept, a δ move). This
    // pins that the function reads only the Automaton model, no second data source.
    const automaton: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
      transitions: [
        { from: 'q0', to: 'q1', symbol: 'a' },
        { from: 'q1', to: 'q2', symbol: 'b' },
      ],
      startState: 'q0',
      acceptStates: ['q2'],
      alphabet: new Set(['a', 'b']),
    }
    const text = automatonToDescription(automaton)
    expect(text).toContain('Σ = {a, b}')
    expect(text).toContain('Start state: q0')
    expect(text).toContain('A = {q2}')
    expect(text).toContain('q0 on a to q1')
    expect(text).toContain('q1 on b to q2')
  })
})
