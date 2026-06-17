import { Automaton, State } from '@/core/automata/types'
import { WorkingAutomaton, EditorEdge, nextEdgeId } from './editorTypes'

// The inverse of toAutomaton. Takes a core Automaton and produces the editor's
// WorkingAutomaton so a given machine can be loaded into the hand editor instead of
// always starting empty (the find-the-bug pre-load path).
//
// Three things make this a faithful inverse. The alphabet is intentionally NOT
// stored: the working model never carries Sigma, because toAutomaton derives it from
// the non-lambda transition symbols on the way back out. Each transition is given a
// fresh editor edge id so the UI can select and relabel an individual edge even when
// two edges share the same from/to/symbol (a parallel edge); the ids never reach the
// core. The empty start state '' is mapped to null, mirroring toAutomaton's null ->
// '' mapping for the empty editor, so the round trip is exact on the degenerate case.
//
// Positions are synthetic and deterministic: a fixed-width grid laid out by state
// index. Every state gets a position so the renderer does not run its own layout and
// the loaded machine renders stably in the same place every time. Pure; the input is
// never mutated.

// A small fixed grid width. Four columns keeps a typical hand-built machine compact
// without states stacking on one row.
const GRID_COLUMNS = 4
const GRID_ORIGIN = 120
const GRID_STEP = 160

export function loadAutomaton(a: Automaton): WorkingAutomaton {
  // Copy each state, keeping the optional label only when set (matches toAutomaton,
  // which copies label only when present). New objects; the input states are untouched.
  const states: State[] = a.states.map(s =>
    s.label !== undefined ? { id: s.id, label: s.label } : { id: s.id }
  )

  // Give every transition a unique editor edge id. Folding nextEdgeId over the
  // accumulating list yields e0, e1, ... and guarantees no collision even across
  // parallel edges, because each new id is computed against the ids assigned so far.
  const transitions: EditorEdge[] = []
  for (const t of a.transitions) {
    const id = nextEdgeId(transitions)
    transitions.push({ id, from: t.from, to: t.to, symbol: t.symbol })
  }

  // Synthetic deterministic layout: one entry per state, by index, on a fixed grid.
  const positions: Record<string, { x: number; y: number }> = {}
  a.states.forEach((s, i) => {
    positions[s.id] = {
      x: GRID_ORIGIN + (i % GRID_COLUMNS) * GRID_STEP,
      y: GRID_ORIGIN + Math.floor(i / GRID_COLUMNS) * GRID_STEP,
    }
  })

  return {
    states,
    transitions,
    // '' is the empty-editor degenerate start (toAutomaton maps a startless editor to
    // ''); invert it back to null so loading then exporting is a fixed point.
    startState: a.startState === '' ? null : a.startState,
    acceptStates: [...a.acceptStates],
    positions,
    selection: { nodeIds: [], edgeIds: [] },
  }
}
