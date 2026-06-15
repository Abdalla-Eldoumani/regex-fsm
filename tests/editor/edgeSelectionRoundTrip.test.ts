import { describe, it, expect } from 'vitest'
import { editorReducer, initialEditorState } from '@/editor/editorReducer'
import { type WorkingAutomaton, type EditorAction } from '@/editor/editorTypes'
import { toAutomaton } from '@/editor/toAutomaton'
import { automatonToCytoscape } from '@/visualization/cytoscape-config'

// BL-01 regression. The editor's canvas selection path reports the Cytoscape edge
// id; the panel then relabels/removes the transition whose editor id matches that
// string. If Cytoscape renders edges with array-index ids (`e${i}`) while the
// reducer allocates editor ids by lowest-free-gap, the two namespaces diverge after
// a deletion and a click mutates the WRONG edge. This test reproduces that exact
// scenario at the conversion boundary: it builds the working automaton with the
// reducer, renders it the way the editable path does (passing the editor ids into
// automatonToCytoscape), reads the id the Nth rendered edge would report on select,
// dispatches the panel action with that id, and decides correctness by the resulting
// transition SET, never by an id string.

function run(actions: EditorAction[]): WorkingAutomaton {
  return actions.reduce(editorReducer, initialEditorState)
}

// The rendered (non-start-arrow) edge ids, in the same order the editor feeds them.
// This mirrors EditorView: automatonToCytoscape(toAutomaton(working), editorIds).
function renderedEditorEdgeIds(w: WorkingAutomaton): string[] {
  const core = toAutomaton(w)
  const editorIds = w.transitions.map(t => t.id)
  const { edges } = automatonToCytoscape(core, editorIds)
  return edges.filter(e => e.data.id !== '__start_arrow__').map(e => e.data.id)
}

// The id the OLD index-id scheme would have rendered for each edge: position in the
// transition array. Used only to PROVE the bug exists on the old scheme.
function renderedIndexEdgeIds(w: WorkingAutomaton): string[] {
  return w.transitions.map((_t, i) => `e${i}`)
}

// A from/to/symbol signature for an edge, so we can assert WHICH edge changed by its
// identity rather than by its id string. Symbols are unique in these fixtures, so the
// signature uniquely identifies the edge the user clicked.
function sig(t: { from: string; to: string; symbol: string | null }): string {
  return `${t.from}->${t.to}:${t.symbol ?? 'λ'}`
}

// Build the audit's scenario: three edges with distinct symbols, delete the MIDDLE
// one, add a fourth. The reducer refills the freed gap, so array index and editor id
// diverge. Edges (array order after the churn): a(e0), c(e2), d(e1).
function buildChurnedState(): WorkingAutomaton {
  return run([
    { type: 'addState', x: 0, y: 0 }, // s0
    { type: 'addState', x: 100, y: 0 }, // s1
    { type: 'addTransition', from: 's0', to: 's1', symbol: 'a' }, // e0
    { type: 'addTransition', from: 's0', to: 's1', symbol: 'b' }, // e1 (middle)
    { type: 'addTransition', from: 's0', to: 's1', symbol: 'c' }, // e2
    { type: 'removeTransition', edgeId: 'e1' }, // survivors: a(e0), c(e2)
    { type: 'addTransition', from: 's0', to: 's1', symbol: 'd' }, // nextEdgeId -> e1
  ])
}

describe('BL-01 edge-selection round-trip', () => {
  it('the churn actually diverges the index ids from the editor ids', () => {
    // Guards the fixture: if these ever coincide the test below is vacuous.
    const w = buildChurnedState()
    expect(w.transitions.map(t => t.id)).toEqual(['e0', 'e2', 'e1'])
    expect(renderedEditorEdgeIds(w)).toEqual(['e0', 'e2', 'e1'])
    expect(renderedIndexEdgeIds(w)).toEqual(['e0', 'e1', 'e2'])
    // The second rendered edge is where the two schemes disagree.
    expect(renderedEditorEdgeIds(w)[1]).not.toBe(renderedIndexEdgeIds(w)[1])
  })

  it('removing the edge reported for rendered index N removes the SAME edge (fixed scheme)', () => {
    const w = buildChurnedState()
    const targetIndex = 1 // the user clicks the second edge on the canvas
    const clickedSig = sig(w.transitions[targetIndex]) // s0->s1:c

    // The id Cytoscape reports on select for that edge, under the editor-id render.
    const reportedId = renderedEditorEdgeIds(w)[targetIndex]

    // The panel dispatches removeTransition with the reported id.
    const after = editorReducer(w, { type: 'removeTransition', edgeId: reportedId })

    const remaining = after.transitions.map(sig)
    // The clicked edge is gone; nothing else was touched.
    expect(remaining).not.toContain(clickedSig)
    expect(after.transitions).toHaveLength(w.transitions.length - 1)
    expect(remaining.sort()).toEqual(['s0->s1:a', 's0->s1:d'])
  })

  it('relabeling the edge reported for rendered index N relabels the SAME edge (fixed scheme)', () => {
    const w = buildChurnedState()
    const targetIndex = 1 // clicks the 'c' edge
    const reportedId = renderedEditorEdgeIds(w)[targetIndex]

    const after = editorReducer(w, { type: 'relabelTransition', edgeId: reportedId, symbol: 'Z' })

    // The clicked edge now reads Z; the other two are untouched.
    expect(after.transitions[targetIndex].symbol).toBe('Z')
    expect(after.transitions.map(sig).sort()).toEqual(['s0->s1:Z', 's0->s1:a', 's0->s1:d'])
  })

  it('would mutate the WRONG edge under the old array-index id scheme', () => {
    // This is the fail-before assertion: it demonstrates that the pre-fix
    // index-id render reports an id that, when removed, deletes a DIFFERENT edge
    // than the one at the clicked position. If a regression reverts the fix, the
    // earlier tests fail; this test documents exactly why.
    const w = buildChurnedState()
    const targetIndex = 1
    const clickedSig = sig(w.transitions[targetIndex]) // s0->s1:c

    const oldReportedId = renderedIndexEdgeIds(w)[targetIndex] // 'e1'
    const after = editorReducer(w, { type: 'removeTransition', edgeId: oldReportedId })

    const remaining = after.transitions.map(sig)
    // The clicked 'c' edge SURVIVES (bug) and the unclicked 'd' edge is removed.
    expect(remaining).toContain(clickedSig)
    expect(remaining.sort()).toEqual(['s0->s1:a', 's0->s1:c'])
  })
})
