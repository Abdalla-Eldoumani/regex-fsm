/**
 * Cached versions of core algorithms.
 * Uses LRU cache with localStorage persistence for performance.
 */

import { parse as parseOriginal } from './regex/parser'
import { buildNFA as buildNFAOriginal } from './algorithms/thompson'
import { nfaToDFA as nfaToDFAOriginal } from './algorithms/subset'
import { algorithmCache } from './cache'
import { RegexNode } from './regex/ast'
import { NFA, DFA } from './automata/types'

// MinimizationResult type (minimize.ts may not exist yet)
export interface MinimizationResult {
  dfa: DFA
  stateMapping: Map<string, string>
  mergedStates: Map<string, string[]>
  description: string
}

/**
 * Parse a regex string to AST with caching.
 */
export function parse(regex: string): RegexNode {
  const cached = algorithmCache.getParsed(regex)
  if (cached) return cached

  const ast = parseOriginal(regex)
  algorithmCache.setParsed(regex, ast)
  return ast
}

/**
 * Build NFA from AST with caching.
 */
export function buildNFA(ast: RegexNode): NFA {
  const cached = algorithmCache.getNFA(ast)
  if (cached) return cached

  const nfa = buildNFAOriginal(ast)
  algorithmCache.setNFA(ast, nfa)
  return nfa
}

/**
 * Convert NFA to DFA with caching.
 */
export function nfaToDFA(nfa: NFA, alphabet?: Set<string>): DFA {
  const cached = algorithmCache.getDFA(nfa, alphabet)
  if (cached) return cached

  const dfa = nfaToDFAOriginal(nfa, alphabet)
  algorithmCache.setDFA(nfa, alphabet, dfa)
  return dfa
}

/**
 * Minimize DFA with caching.
 * Note: Actual minimization not implemented yet - returns DFA as-is.
 */
export function minimizeDFA(dfa: DFA, useLetterNames = false): MinimizationResult {
  const cached = algorithmCache.getMinimized(dfa, useLetterNames)
  if (cached) return cached

  // Stub implementation - returns DFA unchanged
  // TODO: Implement actual Moore's algorithm minimization
  const result: MinimizationResult = {
    dfa: dfa,
    stateMapping: new Map(dfa.states.map(s => [s.id, s.id])),
    mergedStates: new Map(dfa.states.map(s => [s.id, [s.id]])),
    description: 'Minimization not yet implemented'
  }
  algorithmCache.setMinimized(dfa, useLetterNames, result)
  return result
}

/**
 * Clear all algorithm caches.
 */
export function clearCache(): void {
  algorithmCache.clear()
}

/**
 * Get cache statistics for debugging.
 */
export function getCacheStats() {
  return algorithmCache.getStats()
}

// Re-export original algorithms with suffix for direct access
export {
  parseOriginal,
  buildNFAOriginal,
  nfaToDFAOriginal
}
