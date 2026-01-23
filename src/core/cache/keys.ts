import { RegexNode } from '../regex/ast'
import { NFA, DFA, Automaton } from '../automata/types'

/**
 * Generate deterministic cache key for a regex AST.
 * Uses JSON serialization for consistency.
 */
export function astKey(ast: RegexNode): string {
  return JSON.stringify(ast)
}

/**
 * Generate deterministic cache key for Thompson construction.
 * Input is the AST, output is NFA.
 */
export function thompsonKey(ast: RegexNode): string {
  return `thompson:${astKey(ast)}`
}

/**
 * Serialize an automaton to a stable string for cache key generation.
 * Handles Set<string> alphabet serialization.
 */
function serializeAutomaton(automaton: Automaton): string {
  return JSON.stringify({
    states: automaton.states.map(s => s.id).sort(),
    transitions: automaton.transitions
      .map(t => `${t.from}-${t.symbol ?? 'λ'}-${t.to}`)
      .sort(),
    startState: automaton.startState,
    acceptStates: [...automaton.acceptStates].sort(),
    alphabet: [...automaton.alphabet].sort()
  })
}

/**
 * Generate deterministic cache key for subset construction (NFA → DFA).
 * Includes alphabet since it affects the generated DFA.
 */
export function subsetKey(nfa: NFA, alphabet?: Set<string>): string {
  const alphabetPart = alphabet ? [...alphabet].sort().join('') : 'auto'
  return `subset:${serializeAutomaton(nfa)}:${alphabetPart}`
}

/**
 * Generate deterministic cache key for DFA minimization.
 * Includes naming preference since it affects state names.
 */
export function minimizeKey(dfa: DFA, useLetterNames = false): string {
  return `minimize:${serializeAutomaton(dfa)}:${useLetterNames}`
}

/**
 * Generate cache key for regex parsing.
 */
export function parseKey(regex: string): string {
  return `parse:${regex}`
}

/**
 * Generate cache key for layout positions.
 * Based on automaton structure (states + transitions).
 */
export function layoutKey(automaton: Automaton): string {
  return `layout:${serializeAutomaton(automaton)}`
}
