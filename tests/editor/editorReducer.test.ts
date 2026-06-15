import { describe, it, expect } from 'vitest'
import { editorReducer, initialEditorState } from '@/editor/editorReducer'
import { type WorkingAutomaton, type EditorAction } from '@/editor/editorTypes'
import { toAutomaton } from '@/editor/toAutomaton'
import { simulateNFA } from '@/core/algorithms/simulate'

// Apply a sequence of actions from the initial state, returning the final state.
function run(actions: EditorAction[]): WorkingAutomaton {
  return actions.reduce(editorReducer, initialEditorState)
}

describe('initialEditorState', () => {
  it('is an empty, well-formed editor', () => {
    expect(initialEditorState).toEqual({
      states: [],
      transitions: [],
      startState: null,
      acceptStates: [],
      positions: {},
      selection: { nodeIds: [], edgeIds: [] },
    })
  })
})

describe('editorReducer purity', () => {
  it('never mutates the input state', () => {
    const before = JSON.stringify(initialEditorState)
    editorReducer(initialEditorState, { type: 'addState', x: 1, y: 2 })
    expect(JSON.stringify(initialEditorState)).toBe(before)
  })

  it('returns a new object reference', () => {
    const next = editorReducer(initialEditorState, { type: 'addState', x: 0, y: 0 })
    expect(next).not.toBe(initialEditorState)
  })
})

describe('addState', () => {
  it('appends a state with a generated id at the given position', () => {
    const s = run([{ type: 'addState', x: 10, y: 20 }])
    expect(s.states).toEqual([{ id: 's0' }])
    expect(s.positions.s0).toEqual({ x: 10, y: 20 })
  })

  it('first state added becomes the start automatically', () => {
    const s = run([{ type: 'addState', x: 0, y: 0 }])
    expect(s.startState).toBe('s0')
  })

  it('second state does not steal the start', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'addState', x: 50, y: 0 },
    ])
    expect(s.states.map(st => st.id)).toEqual(['s0', 's1'])
    expect(s.startState).toBe('s0')
  })

  it('generates fresh ids without collision', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'addState', x: 0, y: 0 },
      { type: 'addState', x: 0, y: 0 },
    ])
    expect(s.states.map(st => st.id)).toEqual(['s0', 's1', 's2'])
  })
})

describe('removeState', () => {
  it('removes the state and every incident transition', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 }, // s0
      { type: 'addState', x: 0, y: 0 }, // s1
      { type: 'addState', x: 0, y: 0 }, // s2
      { type: 'addTransition', from: 's0', to: 's1', symbol: 'a' },
      { type: 'addTransition', from: 's1', to: 's2', symbol: 'b' }, // incident on s1
      { type: 'addTransition', from: 's2', to: 's1', symbol: 'a' }, // incident on s1
      { type: 'removeState', id: 's1' },
    ])
    expect(s.states.map(st => st.id)).toEqual(['s0', 's2'])
    // every transition touching s1 is gone; none remain referencing it
    expect(s.transitions.every(t => t.from !== 's1' && t.to !== 's1')).toBe(true)
    expect(s.transitions).toHaveLength(0)
    expect(s.positions.s1).toBeUndefined()
  })

  it('reassigns the start when the removed state was the start', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 }, // s0 (start)
      { type: 'addState', x: 0, y: 0 }, // s1
      { type: 'removeState', id: 's0' },
    ])
    expect(s.startState).toBe('s1')
    expect(s.states.map(st => st.id)).toEqual(['s1'])
  })

  it('start becomes null when the last state is removed', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'removeState', id: 's0' },
    ])
    expect(s.startState).toBeNull()
    expect(s.states).toHaveLength(0)
  })

  it('drops the removed state from acceptStates and selection', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 }, // s0
      { type: 'addState', x: 0, y: 0 }, // s1
      { type: 'toggleAccept', id: 's1' },
      { type: 'select', nodeIds: ['s1'], edgeIds: [] },
      { type: 'removeState', id: 's1' },
    ])
    expect(s.acceptStates).not.toContain('s1')
    expect(s.selection.nodeIds).not.toContain('s1')
  })
})

describe('renameState', () => {
  it('sets the label without changing the id', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'renameState', id: 's0', label: 'start here' },
    ])
    expect(s.states[0]).toEqual({ id: 's0', label: 'start here' })
  })

  it('accepts a reserved-looking label as a label only, never as an id', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'renameState', id: 's0', label: '∅' },
    ])
    expect(s.states[0]).toEqual({ id: 's0', label: '∅' })
    expect(s.states[0].id).toBe('s0')
  })
})

describe('setStart', () => {
  it('moves the start to the given existing state (exactly one start)', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 }, // s0 (auto start)
      { type: 'addState', x: 0, y: 0 }, // s1
      { type: 'setStart', id: 's1' },
    ])
    expect(s.startState).toBe('s1')
  })

  it('ignores setStart for a non-existent state', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'setStart', id: 'nope' },
    ])
    expect(s.startState).toBe('s0')
  })
})

describe('toggleAccept', () => {
  it('adds then removes an id from acceptStates', () => {
    const added = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'toggleAccept', id: 's0' },
    ])
    expect(added.acceptStates).toEqual(['s0'])

    const removed = editorReducer(added, { type: 'toggleAccept', id: 's0' })
    expect(removed.acceptStates).toEqual([])
  })

  it('allows multiple accepting states', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'addState', x: 0, y: 0 },
      { type: 'toggleAccept', id: 's0' },
      { type: 'toggleAccept', id: 's1' },
    ])
    expect(s.acceptStates.sort()).toEqual(['s0', 's1'])
  })
})

describe('addTransition', () => {
  it('appends an edge with a generated id', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'addState', x: 0, y: 0 },
      { type: 'addTransition', from: 's0', to: 's1', symbol: 'a' },
    ])
    expect(s.transitions).toEqual([{ id: 'e0', from: 's0', to: 's1', symbol: 'a' }])
  })

  it('allows a self-loop (from === to)', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'addTransition', from: 's0', to: 's0', symbol: 'a' },
    ])
    expect(s.transitions).toContainEqual({ id: 'e0', from: 's0', to: 's0', symbol: 'a' })
  })

  it('allows parallel edges with the same from/to/symbol (array, not map)', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'addState', x: 0, y: 0 },
      { type: 'addTransition', from: 's0', to: 's1', symbol: 'a' },
      { type: 'addTransition', from: 's0', to: 's1', symbol: 'a' },
    ])
    expect(s.transitions).toHaveLength(2)
    expect(s.transitions[0].id).not.toBe(s.transitions[1].id)
  })

  it('allows a λ-transition (symbol null)', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'addState', x: 0, y: 0 },
      { type: 'addTransition', from: 's0', to: 's1', symbol: null },
    ])
    expect(s.transitions[0].symbol).toBeNull()
  })
})

describe('relabelTransition and removeTransition', () => {
  it('relabels an edge by id', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'addState', x: 0, y: 0 },
      { type: 'addTransition', from: 's0', to: 's1', symbol: 'a' },
      { type: 'relabelTransition', edgeId: 'e0', symbol: 'b' },
    ])
    expect(s.transitions[0].symbol).toBe('b')
  })

  it('relabels an edge to λ (null)', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'addState', x: 0, y: 0 },
      { type: 'addTransition', from: 's0', to: 's1', symbol: 'a' },
      { type: 'relabelTransition', edgeId: 'e0', symbol: null },
    ])
    expect(s.transitions[0].symbol).toBeNull()
  })

  it('removes an edge by id and clears it from selection', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'addState', x: 0, y: 0 },
      { type: 'addTransition', from: 's0', to: 's1', symbol: 'a' },
      { type: 'select', nodeIds: [], edgeIds: ['e0'] },
      { type: 'removeTransition', edgeId: 'e0' },
    ])
    expect(s.transitions).toHaveLength(0)
    expect(s.selection.edgeIds).not.toContain('e0')
  })
})

describe('select and clearSelection', () => {
  it('select updates selection only, no structural change', () => {
    const base = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'addState', x: 0, y: 0 },
    ])
    const sel = editorReducer(base, { type: 'select', nodeIds: ['s0'], edgeIds: [] })
    expect(sel.selection).toEqual({ nodeIds: ['s0'], edgeIds: [] })
    expect(sel.states).toEqual(base.states)
    expect(sel.transitions).toEqual(base.transitions)
  })

  it('clearSelection empties the selection', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'select', nodeIds: ['s0'], edgeIds: [] },
      { type: 'clearSelection' },
    ])
    expect(s.selection).toEqual({ nodeIds: [], edgeIds: [] })
  })
})

// A trap (dead) state is just an ordinary state with no path to an accept state.
// The reducer stores it like any other; trap styling is a later plan's concern.
// Build "strings over {a} that are not empty, with a trap on the empty input":
// s0 --a--> s1 (accept); s0 has no other outgoing edge, so "" lands nowhere
// accepting. Verify language correctness via simulate, never shape.
describe('trap state is expressible', () => {
  it('builds a two-state automaton with a dead path and simulates correctly', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 }, // s0 start
      { type: 'addState', x: 100, y: 0 }, // s1 accept
      { type: 'toggleAccept', id: 's1' },
      { type: 'addTransition', from: 's0', to: 's1', symbol: 'a' },
      // s0 has no b-edge and no self path back to accept: b leads to a (virtual) trap
    ])
    const core = toAutomaton(s)
    expect(simulateNFA(core, 'a').accepted).toBe(true)
    expect(simulateNFA(core, '').accepted).toBe(false)
    expect(simulateNFA(core, 'b').accepted).toBe(false)
    expect(simulateNFA(core, 'aa').accepted).toBe(false)
  })
})
