import { describe, it, expect } from 'vitest'
import { editorReducer, initialEditorState } from './editorReducer'

// The keyboard Add-state button (EditorPanel) dispatches the existing addState
// action with a position it synthesizes from the current state count, never from
// user text. These tests pin the reducer contract that button relies on: the id
// is assigned by the reducer (not the action), the first state becomes the start
// automatically (invariant 2), a later add leaves the start where it is, and the
// synthesized x/y lands in positions[id]. The reducer is the unit under test; the
// button itself is exercised by the editor end-to-end suite.
describe('editorReducer addState with a synthesized position', () => {
  it('adds exactly one state on a single addState', () => {
    const next = editorReducer(initialEditorState, { type: 'addState', x: 120, y: 120 })
    expect(next.states).toHaveLength(1)
  })

  it('assigns the id by nextStateId, ignoring any value in the action', () => {
    // The action shape carries only x and y; the id is the reducer's to assign.
    // From the empty editor the lowest free id is s0.
    const next = editorReducer(initialEditorState, { type: 'addState', x: 200, y: 80 })
    expect(next.states[0].id).toBe('s0')

    // A second add takes the next lowest free id.
    const after = editorReducer(next, { type: 'addState', x: 340, y: 80 })
    expect(after.states.map(s => s.id)).toEqual(['s0', 's1'])
  })

  it('makes the first added state the start automatically (invariant 2)', () => {
    expect(initialEditorState.startState).toBeNull()
    const next = editorReducer(initialEditorState, { type: 'addState', x: 120, y: 120 })
    expect(next.startState).toBe('s0')
  })

  it('does not move the start when a second state is added', () => {
    const first = editorReducer(initialEditorState, { type: 'addState', x: 120, y: 120 })
    const second = editorReducer(first, { type: 'addState', x: 260, y: 120 })
    // The start stays on the first state; the new state is not the start.
    expect(second.startState).toBe('s0')
  })

  it('records the synthesized x and y in positions under the assigned id', () => {
    const next = editorReducer(initialEditorState, { type: 'addState', x: 260, y: 400 })
    expect(next.positions['s0']).toEqual({ x: 260, y: 400 })
  })

  it('does not mutate the input state', () => {
    const before = initialEditorState
    const beforeStateCount = before.states.length
    editorReducer(before, { type: 'addState', x: 10, y: 20 })
    // The shared initial state object is untouched (src immutability rule).
    expect(before.states).toHaveLength(beforeStateCount)
    expect(before.startState).toBeNull()
  })
})
