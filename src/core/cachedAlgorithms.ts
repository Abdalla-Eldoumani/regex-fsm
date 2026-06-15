/**
 * Cached versions of core algorithms.
 * Uses LRU cache with localStorage persistence for performance.
 */

import { parse as parseOriginal } from './regex/parser'
import { buildNFA as buildNFAOriginal } from './algorithms/thompson'
import { nfaToDFA as nfaToDFAOriginal } from './algorithms/subset'
import { minimizeDFA as minimizeDFAOriginal } from './algorithms/minimize'
import type { MinimizationResult } from './algorithms/minimize'
import { algorithmCache } from './cache'
import { RegexNode } from './regex/ast'
import { NFA, DFA } from './automata/types'

// Re-export the canonical MinimizationResult so existing importers of it from
// this module keep compiling. The type is owned by algorithms/minimize.ts; the
// former local duplicate here was a structural triplicate (logged tech debt).
export type { MinimizationResult }

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
 * Delegates to the real Moore partition-refinement implementation in
 * algorithms/minimize.ts; the cache only memoizes its result.
 */
export function minimizeDFA(dfa: DFA, useLetterNames = false): MinimizationResult {
  const cached = algorithmCache.getMinimized(dfa, useLetterNames)
  if (cached) return cached

  const result = minimizeDFAOriginal(dfa, useLetterNames)
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

// Direct regex-to-DFA algorithms (no caching needed - they're already fast)
export { asuDirectDFA } from './algorithms/asuDirect'
export type { ASUResult } from './algorithms/asuDirect'
export { brzozowskiDFA } from './algorithms/brzozowski'
export type { BrzozowskiResult } from './algorithms/brzozowski'

// Re-export original algorithms with suffix for direct access
export {
  parseOriginal,
  buildNFAOriginal,
  nfaToDFAOriginal,
  minimizeDFAOriginal
}
