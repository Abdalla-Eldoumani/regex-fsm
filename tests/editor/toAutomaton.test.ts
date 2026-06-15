import { describe, it, expect } from 'vitest'
import { toAutomaton } from '@/editor/toAutomaton'
import { nextStateId, type WorkingAutomaton } from '@/editor/editorTypes'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateNFA, simulateDFA } from '@/core/algorithms/simulate'
import { minimizeDFA } from '@/core/algorithms/minimize'
import { isDeterministic, validateDFA } from '@/core/automata/dfa'

// A hand-built editor automaton for (a + b): one start state s0 with an a-edge to
// the accepting s1 and a b-edge to the accepting s1. Determinizing it must accept
// exactly the single-symbol strings "a" and "b" and nothing else. This is the
// round-trip anchor Plan 04 reuses.
function aOrB(): WorkingAutomaton {
  return {
    states: [{ id: 's0' }, { id: 's1' }],
    transitions: [
      { id: 'e0', from: 's0', to: 's1', symbol: 'a' },
      { id: 'e1', from: 's0', to: 's1', symbol: 'b' },
    ],
    startState: 's0',
    acceptStates: ['s1'],
    positions: { s0: { x: 0, y: 0 }, s1: { x: 100, y: 0 } },
    selection: { nodeIds: [], edgeIds: [] },
  }
}

describe('toAutomaton', () => {
  it('produces the exact core Automaton shape (drops editor extras)', () => {
    const core = toAutomaton(aOrB())

    // states carry only id (and label when present), never positions
    expect(core.states).toEqual([{ id: 's0' }, { id: 's1' }])
    // transitions carry only {from, to, symbol}, never the editor edge id
    expect(core.transitions).toEqual([
      { from: 's0', to: 's1', symbol: 'a' },
      { from: 's0', to: 's1', symbol: 'b' },
    ])
    expect(core.startState).toBe('s0')
    expect(core.acceptStates).toEqual(['s1'])
    expect(core.alphabet).toEqual(new Set(['a', 'b']))

    // editor-only keys must not leak into the core shape
    expect(core).not.toHaveProperty('positions')
    expect(core).not.toHaveProperty('selection')
    for (const s of core.states) {
      expect(s).not.toHaveProperty('x')
      expect(s).not.toHaveProperty('y')
    }
  })

  it('preserves a state label when present', () => {
    const w = aOrB()
    w.states[1] = { id: 's1', label: 'accept' }
    const core = toAutomaton(w)
    expect(core.states).toContainEqual({ id: 's1', label: 'accept' })
  })

  it('represents the empty editor (no start) with an empty-string startState', () => {
    const empty: WorkingAutomaton = {
      states: [],
      transitions: [],
      startState: null,
      acceptStates: [],
      positions: {},
      selection: { nodeIds: [], edgeIds: [] },
    }
    expect(toAutomaton(empty).startState).toBe('')
  })

  it('does not mutate the working automaton', () => {
    const w = aOrB()
    const before = JSON.stringify(w)
    toAutomaton(w)
    expect(JSON.stringify(w)).toBe(before)
  })

  it('round-trips through nfaToDFA as a valid, deterministic DFA', () => {
    const core = toAutomaton(aOrB())
    const dfa = nfaToDFA(core)

    expect(isDeterministic(dfa)).toBe(true)
    expect(() => validateDFA(dfa)).not.toThrow()
  })

  it('round-trips through simulateNFA and simulateDFA with the (a+b) language', () => {
    const core = toAutomaton(aOrB())
    const dfa = nfaToDFA(core)

    // NFA simulation on the editor output directly
    expect(simulateNFA(core, 'a').accepted).toBe(true)
    expect(simulateNFA(core, 'b').accepted).toBe(true)
    expect(simulateNFA(core, '').accepted).toBe(false)
    expect(simulateNFA(core, 'c').accepted).toBe(false)
    expect(simulateNFA(core, 'ab').accepted).toBe(false)

    // DFA simulation agrees
    expect(simulateDFA(dfa, 'a').accepted).toBe(true)
    expect(simulateDFA(dfa, 'b').accepted).toBe(true)
    expect(simulateDFA(dfa, '').accepted).toBe(false)
    expect(simulateDFA(dfa, 'c').accepted).toBe(false)
  })

  // Warning #2: the must_haves claim the round-trip also passes through
  // minimizeDFA. Determinize, minimize, and assert the minimized DFA accepts the
  // SAME strings the original hand-built automaton accepts (language equivalence,
  // never shape).
  it('minimizeDFA(nfaToDFA(...)) accepts the same language as the hand-built automaton', () => {
    const working = aOrB()
    const core = toAutomaton(working)
    const dfa = nfaToDFA(core)
    const min = minimizeDFA(dfa).dfa

    expect(isDeterministic(min)).toBe(true)
    expect(() => validateDFA(min)).not.toThrow()

    const sample = ['', 'a', 'b', 'c', 'aa', 'ab', 'ba', 'bb', 'abc', 'bbb']
    for (const s of sample) {
      const original = simulateNFA(core, s).accepted
      const minimized = simulateDFA(min, s).accepted
      expect(minimized).toBe(original)
    }
  })

  // EDITOR-02 Σ derivation: λ-moves (symbol null) are never part of the alphabet.
  it('derives the alphabet from non-λ symbols only (λ excluded)', () => {
    const w: WorkingAutomaton = {
      states: [{ id: 's0' }, { id: 's1' }, { id: 's2' }],
      transitions: [
        { id: 'e0', from: 's0', to: 's1', symbol: null }, // λ-move
        { id: 'e1', from: 's1', to: 's2', symbol: 'a' },
      ],
      startState: 's0',
      acceptStates: ['s2'],
      positions: {},
      selection: { nodeIds: [], edgeIds: [] },
    }
    const core = toAutomaton(w)
    expect(core.alphabet).toEqual(new Set(['a']))
    // the λ transition is preserved as symbol null
    expect(core.transitions).toContainEqual({ from: 's0', to: 's1', symbol: null })
  })
})

describe('nextStateId', () => {
  it('returns s0 for an empty state list', () => {
    expect(nextStateId([])).toBe('s0')
  })

  it('returns the first s{n} not already in use', () => {
    expect(nextStateId([{ id: 's0' }, { id: 's1' }])).toBe('s2')
  })

  it('fills the lowest free gap so ids stay stable after a removal', () => {
    // s1 was removed; the next id reuses s1, not s3
    expect(nextStateId([{ id: 's0' }, { id: 's2' }])).toBe('s1')
  })

  it('never collides with reserved ids even if a label looks reserved', () => {
    // user labels are not ids; generation only ever inspects ids
    const id = nextStateId([{ id: 's0', label: '∅' }, { id: 's1', label: '__start_marker__' }])
    expect(id).toBe('s2')
    expect(id).not.toBe('∅')
    expect(id).not.toBe('__start_marker__')
  })
})
