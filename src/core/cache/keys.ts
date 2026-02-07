import { RegexNode } from '../regex/ast'
import { NFA, DFA, Automaton } from '../automata/types'

/**
 * Fast string hash (djb2) for cache key generation.
 */
function hashStr(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

/**
 * Generate deterministic cache key for a regex AST.
 * Uses JSON serialization for consistency.
 */
export function astKey(ast: RegexNode): string {
  return JSON.stringify(ast)
}

/**
 * Generate deterministic cache key for Thompson construction.
 * Uses a hash of the AST string instead of the full JSON.
 */
export function thompsonKey(ast: RegexNode): string {
  return `thompson:${hashStr(astKey(ast))}`
}

/**
 * Serialize an automaton to a stable string for cache key generation.
 * Uses hashing to keep keys short.
 */
function serializeAutomaton(automaton: Automaton): string {
  const raw = JSON.stringify({
    states: automaton.states.map(s => s.id).sort(),
    transitions: automaton.transitions
      .map(t => `${t.from}-${t.symbol ?? 'λ'}-${t.to}`)
      .sort(),
    startState: automaton.startState,
    acceptStates: [...automaton.acceptStates].sort(),
    alphabet: [...automaton.alphabet].sort()
  })
  return hashStr(raw)
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
