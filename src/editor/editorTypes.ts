import { State, Transition } from '@/core/automata/types'

// The editor's authoritative model. It IS the core automaton shape (State[],
// Transition[], startState, acceptStates) plus two presentation-only extras:
// node positions and the UI selection. The alphabet is NEVER stored here; it is
// derived in toAutomaton from the non-λ transition symbols (Pitfall 2: a Set does
// not survive JSON, so keeping it derived avoids a class of serialization bugs).
//
// Editor edges carry a generated id so the UI can select, relabel, and remove an
// individual edge even when two edges share the same from/to/symbol (parallel
// edges). The id is stripped in toAutomaton; the core never sees it.
export interface EditorEdge extends Transition {
  id: string
}

export interface WorkingAutomaton {
  states: State[]
  transitions: EditorEdge[]
  // null only in the empty-editor degenerate case (no states yet). The first
  // addState makes a non-empty editor always have exactly one start.
  startState: string | null
  acceptStates: string[]
  positions: Record<string, { x: number; y: number }>
  selection: { nodeIds: string[]; edgeIds: string[] }
}

export type EditorAction =
  | { type: 'addState'; x: number; y: number } // reducer generates the id (s0, s1, ...)
  | { type: 'removeState'; id: string } // also drops incident transitions
  | { type: 'renameState'; id: string; label: string }
  | { type: 'setStart'; id: string } // exactly one; replaces previous
  | { type: 'toggleAccept'; id: string }
  | { type: 'addTransition'; from: string; to: string; symbol: string | null } // null => λ
  | { type: 'relabelTransition'; edgeId: string; symbol: string | null }
  | { type: 'removeTransition'; edgeId: string }
  | { type: 'select'; nodeIds: string[]; edgeIds: string[] }
  | { type: 'clearSelection' }

// Ids the renderer reserves for itself: the invisible start-arrow source node and
// the trap state. A generated s{n} id can never equal either, but they are named
// here so the invariant is explicit and testable (Pitfall 4, threat T-04-07).
export const RESERVED_IDS: ReadonlySet<string> = new Set(['∅', '__start_marker__'])

// Returns the lowest s{n} not already used by an existing state. Filling the
// lowest free gap (rather than max+1) keeps ids stable and small after a removal,
// and the s-prefix guarantees no collision with the reserved ids above: user text
// is stored only as a `label`, never as an `id`.
export function nextStateId(existing: State[]): string {
  const used = new Set(existing.map(s => s.id))
  let n = 0
  while (used.has(`s${n}`)) n++
  return `s${n}`
}

// Edge-id analogue of nextStateId over the e{n} namespace. Edge ids are internal
// editor handles only; they never reach the core automaton.
export function nextEdgeId(existing: EditorEdge[]): string {
  const used = new Set(existing.map(e => e.id))
  let n = 0
  while (used.has(`e${n}`)) n++
  return `e${n}`
}
