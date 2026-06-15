import { Automaton } from '@/core/automata/types'
import { WorkingAutomaton } from './editorTypes'

// The EDITOR-03 contract. Strips the editor-only extras (positions, selection,
// per-edge ids) and returns exactly the core Automaton shape every algorithm
// consumes: {states, transitions, startState, acceptStates, alphabet}. Pure; no
// Cytoscape, no React, no mutation of the input.
export function toAutomaton(w: WorkingAutomaton): Automaton {
  // Σ is derived solely from the non-λ transition symbols (course Σ derivation).
  // λ (symbol === null) is the empty-string move and is never an alphabet member;
  // a trap-bound automaton with only λ-moves therefore has an empty alphabet.
  const alphabet = new Set<string>()
  for (const t of w.transitions) {
    if (t.symbol !== null) alphabet.add(t.symbol)
  }

  return {
    // copy each state, keeping label only when set (matches createState)
    states: w.states.map(s => (s.label !== undefined ? { id: s.id, label: s.label } : { id: s.id })),
    // drop the editor edge id; keep the core {from, to, symbol}
    transitions: w.transitions.map(t => ({ from: t.from, to: t.to, symbol: t.symbol })),
    // '' is how the empty automaton's start is represented elsewhere (the
    // visualization conversion test asserts an empty startState renders no
    // start arrow), so an editor with no start maps to '' rather than null.
    startState: w.startState ?? '',
    acceptStates: [...w.acceptStates],
    alphabet,
  }
}
