import type { Automaton } from '@/core/automata/types'

// Produce a course-notation prose summary of an automaton for a screen reader.
// Pure: model in, string out, no DOM and no React. It mirrors automatonToCytoscape
// (the model-to-view mapper next to it) and the TransitionTable: the same sorted
// alphabet, the same `t.symbol ?? 'λ'` idiom for the empty-string move, and the same
// empty-set glyph for the trap state id. Because the summary, the diagram, and the
// table all read this one model, they cannot disagree (SKILL: a representation
// presented as the automaton must BE the automaton). Course notation only, never a
// notation-mode parameter: the quintuple (Q, Σ, δ, q₀, A) with A for the accepting
// set, λ for the empty string, and ∅ for an empty set, are the course's symbols.

const LAMBDA = 'λ' // the empty string (CPSC 351 uses λ, not ε)
const EMPTY_SET = '∅' // the empty set / the trap state id

export function automatonToDescription(automaton: Automaton): string {
  // Sorted set notation, matching TransitionTable's Array.from(alphabet).sort().
  const sigma = Array.from(automaton.alphabet).sort()
  const stateIds = automaton.states.map(s => s.id)
  const accept = automaton.acceptStates

  const alphabetText = sigma.length > 0 ? `Σ = {${sigma.join(', ')}}` : `Σ = ${EMPTY_SET}`
  const acceptText = accept.length > 0 ? `A = {${accept.join(', ')}}` : `A = ${EMPTY_SET}`

  // δ as a flat readable list. The λ-move (symbol === null) reads with the lambda
  // glyph; a trap move reads with the empty-set glyph because the trap state id IS
  // that glyph, so no special-casing is needed.
  const moves = automaton.transitions.map(t => {
    const symbol = t.symbol ?? LAMBDA
    return `${t.from} on ${symbol} to ${t.to}`
  })

  // Name every state with no outgoing edge explicitly, rather than letting a reader
  // infer a silent omission. A sink is a real fact about δ.
  const sources = new Set(automaton.transitions.map(t => t.from))
  const sinkNotes = stateIds
    .filter(id => !sources.has(id))
    .map(id => `${id} has no outgoing transitions.`)

  const stateCount = stateIds.length === 1 ? '1 state' : `${stateIds.length} states`
  const stateRoster = stateIds.length > 0 ? `${stateCount}: ${stateIds.join(', ')}.` : 'No states.'

  return [
    'Finite automaton (Q, Σ, δ, q₀, A).',
    `${alphabetText}.`,
    stateRoster,
    `Start state: ${automaton.startState}.`,
    `Accepting set ${acceptText}.`,
    `Transitions: ${moves.length > 0 ? `${moves.join('; ')}.` : 'none.'}`,
    ...sinkNotes,
  ].join(' ')
}
