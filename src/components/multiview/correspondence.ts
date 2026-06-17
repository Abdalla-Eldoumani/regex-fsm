// Pure cross-pane correspondence resolver (no React, no Cytoscape).
//
// Implements the controller data-flow described in 05-RESEARCH.md:
// a selection in one pane is mapped to corresponding element ids in the
// other panes by composing the three construction-provided maps. The view
// receives id arrays and stays dumb; it never re-derives the mapping.
//
// Where a correspondence is not defined (fragments absent, or an id that
// is not present in a map) the resolver returns [] rather than guessing.
// This satisfies VIEW-02 "where a correspondence exists" and prevents the
// view from breaking when a pane has not yet been wired (graceful absence).

export type Pane = 'regex' | 'nfa' | 'dfa' | 'min'

export interface CorrespondenceMaps {
  // dfaId -> sorted list of NFA state ids it represents (from subset construction)
  nfaStateSets: Map<string, string[]>
  // minId  -> list of DFA state ids it was merged from (from minimization)
  mergedStates: Map<string, string[]>
  // dfaId  -> minId (inverse of mergedStates, from minimization stateMapping)
  stateMapping: Map<string, string>
  // regex node id -> {stateIds} (optional; from Thompson correspondence)
  // absent when buildNFAWithCorrespondence was not used or regex pane is not rendered
  fragments?: Map<string, { stateIds: string[] }>
}

export interface Selection {
  pane: Pane
  nodeIds: string[]
}

export interface ResolvedHighlights {
  regex: string[]
  nfa: string[]
  dfa: string[]
  min: string[]
}

// Deduplicate and sort a string array for deterministic output.
function dedup(ids: string[]): string[] {
  return [...new Set(ids)].sort()
}

// DFA ids -> NFA ids via nfaStateSets union.
function dfaToNfa(dfaIds: string[], maps: CorrespondenceMaps): string[] {
  const result: string[] = []
  for (const dfaId of dfaIds) {
    const subset = maps.nfaStateSets.get(dfaId)
    if (subset) result.push(...subset)
  }
  return dedup(result)
}

// DFA ids -> min ids via stateMapping.
function dfaToMin(dfaIds: string[], maps: CorrespondenceMaps): string[] {
  const result: string[] = []
  for (const dfaId of dfaIds) {
    const minId = maps.stateMapping.get(dfaId)
    if (minId !== undefined) result.push(minId)
  }
  return dedup(result)
}

// NFA ids -> DFA ids: every DFA state whose nfaStateSets entry intersects the selection.
function nfaToDfa(nfaIds: string[], maps: CorrespondenceMaps): string[] {
  const selected = new Set(nfaIds)
  const result: string[] = []
  for (const [dfaId, subset] of maps.nfaStateSets) {
    if (subset.some(id => selected.has(id))) {
      result.push(dfaId)
    }
  }
  return dedup(result)
}

// NFA ids -> regex node ids: every fragment whose stateIds intersects the selection.
function nfaToRegex(nfaIds: string[], maps: CorrespondenceMaps): string[] {
  if (!maps.fragments) return []
  const selected = new Set(nfaIds)
  const result: string[] = []
  for (const [nodeId, frag] of maps.fragments) {
    if (frag.stateIds.some(id => selected.has(id))) {
      result.push(nodeId)
    }
  }
  return dedup(result)
}

// Given a selection in one pane, return the corresponding element ids in
// all four panes (including the selected pane, which always echoes itself).
// Never throws: missing map entries yield empty arrays; absent fragments
// yield empty regex results.
export function resolve(
  selection: Selection,
  maps: CorrespondenceMaps
): ResolvedHighlights {
  const { pane, nodeIds } = selection

  switch (pane) {
    case 'dfa': {
      const nfa = dfaToNfa(nodeIds, maps)
      const min = dfaToMin(nodeIds, maps)
      const regex = nfaToRegex(nfa, maps)
      return { regex, nfa, dfa: dedup(nodeIds), min }
    }

    case 'min': {
      // min -> DFA (mergedStates), then DFA -> NFA, then NFA -> regex
      const dfaIds: string[] = []
      for (const minId of nodeIds) {
        const merged = maps.mergedStates.get(minId)
        if (merged) dfaIds.push(...merged)
      }
      const dfa = dedup(dfaIds)
      const nfa = dfaToNfa(dfa, maps)
      const regex = nfaToRegex(nfa, maps)
      return { regex, nfa, dfa, min: dedup(nodeIds) }
    }

    case 'nfa': {
      // NFA -> DFA (intersection), then DFA -> min, then NFA -> regex
      const dfa = nfaToDfa(nodeIds, maps)
      const min = dfaToMin(dfa, maps)
      const regex = nfaToRegex(nodeIds, maps)
      return { regex, nfa: dedup(nodeIds), dfa, min }
    }

    case 'regex': {
      // regex -> NFA (union of fragment stateIds), then NFA -> DFA -> min
      if (!maps.fragments) {
        return { regex: dedup(nodeIds), nfa: [], dfa: [], min: [] }
      }
      const nfaIds: string[] = []
      for (const nodeId of nodeIds) {
        const frag = maps.fragments.get(nodeId)
        if (frag) nfaIds.push(...frag.stateIds)
      }
      const nfa = dedup(nfaIds)
      const dfa = nfaToDfa(nfa, maps)
      const min = dfaToMin(dfa, maps)
      return { regex: dedup(nodeIds), nfa, dfa, min }
    }
  }
}
