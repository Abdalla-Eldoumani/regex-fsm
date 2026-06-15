import { describe, it, expect } from 'vitest'
import { resolve } from '@/components/multiview/correspondence'
import type { CorrespondenceMaps } from '@/components/multiview/correspondence'

// Hand-authored maps that model a small concrete construction:
//   NFA states: q0, q1, q2
//   DFA states: {q0,q1} (start+accept), {q2}, trap ∅
//   minimized:  A (merges {q0,q1} only), B (merges {q2} and ∅)
function makeMaps(withFragments = false): CorrespondenceMaps {
  const nfaStateSets = new Map<string, string[]>([
    ['{q0,q1}', ['q0', 'q1']],
    ['{q2}', ['q2']],
    ['∅', []],
  ])
  const mergedStates = new Map<string, string[]>([
    ['A', ['{q0,q1}']],
    ['B', ['{q2}', '∅']],
  ])
  const stateMapping = new Map<string, string>([
    ['{q0,q1}', 'A'],
    ['{q2}', 'B'],
    ['∅', 'B'],
  ])

  if (!withFragments) {
    return { nfaStateSets, mergedStates, stateMapping }
  }

  // Fragment n0 covers q0 and q1 (the regex sub-expression that produced those states)
  const fragments = new Map<string, { stateIds: string[] }>([
    ['n0', { stateIds: ['q0', 'q1'] }],
  ])
  return { nfaStateSets, mergedStates, stateMapping, fragments }
}

describe('correspondence resolver', () => {
  describe('DFA pane as selection source', () => {
    it('resolves a DFA state to its NFA subset', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'dfa', nodeIds: ['{q0,q1}'] }, maps)

      expect(result.nfa.sort()).toEqual(['q0', 'q1'])
    })

    it('resolves a DFA state to its minimized class', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'dfa', nodeIds: ['{q0,q1}'] }, maps)

      expect(result.min).toEqual(['A'])
    })

    it('echoes the selection into the dfa result', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'dfa', nodeIds: ['{q0,q1}'] }, maps)

      expect(result.dfa).toEqual(['{q0,q1}'])
    })

    it('returns empty regex when fragments are absent', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'dfa', nodeIds: ['{q0,q1}'] }, maps)

      expect(result.regex).toEqual([])
    })

    it('trap state resolves to empty NFA subset and min class B', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'dfa', nodeIds: ['∅'] }, maps)

      expect(result.nfa).toEqual([])
      expect(result.min).toEqual(['B'])
    })

    it('multiple DFA states: union of NFA subsets, deduplicated and sorted', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'dfa', nodeIds: ['{q0,q1}', '{q2}'] }, maps)

      expect(result.nfa).toEqual(['q0', 'q1', 'q2'])
      expect(result.min.sort()).toEqual(['A', 'B'])
    })
  })

  describe('min pane as selection source', () => {
    it('resolves min state B to its DFA states', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'min', nodeIds: ['B'] }, maps)

      expect(result.dfa.sort()).toEqual(['{q2}', '∅'])
    })

    it('resolves min state B -> DFA -> NFA (composes through maps)', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'min', nodeIds: ['B'] }, maps)

      // {q2} contributes q2; ∅ contributes nothing
      expect(result.nfa).toEqual(['q2'])
    })

    it('echoes the selection into the min result', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'min', nodeIds: ['B'] }, maps)

      expect(result.min).toEqual(['B'])
    })

    it('min->A correctly resolves to NFA subset of its DFA class', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'min', nodeIds: ['A'] }, maps)

      expect(result.dfa).toEqual(['{q0,q1}'])
      expect(result.nfa.sort()).toEqual(['q0', 'q1'])
    })

    it('multiple min states: union of DFA classes and NFA subsets', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'min', nodeIds: ['A', 'B'] }, maps)

      expect(result.dfa.sort()).toEqual(['{q0,q1}', '{q2}', '∅'])
      expect(result.nfa.sort()).toEqual(['q0', 'q1', 'q2'])
    })
  })

  describe('NFA pane as selection source', () => {
    it('resolves NFA state q2 to DFA states whose subset contains q2', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'nfa', nodeIds: ['q2'] }, maps)

      expect(result.dfa).toEqual(['{q2}'])
    })

    it('NFA->DFA->min composition for q2', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'nfa', nodeIds: ['q2'] }, maps)

      expect(result.min).toEqual(['B'])
    })

    it('echoes the selection into the nfa result', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'nfa', nodeIds: ['q2'] }, maps)

      expect(result.nfa).toEqual(['q2'])
    })

    it('NFA state q0 resolves to DFA states that contain q0', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'nfa', nodeIds: ['q0'] }, maps)

      expect(result.dfa).toEqual(['{q0,q1}'])
      expect(result.min).toEqual(['A'])
    })

    it('multiple NFA states: union of matching DFA states', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'nfa', nodeIds: ['q0', 'q2'] }, maps)

      expect(result.dfa.sort()).toEqual(['{q0,q1}', '{q2}'])
      expect(result.min.sort()).toEqual(['A', 'B'])
    })

    it('returns empty regex when fragments absent', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'nfa', nodeIds: ['q0'] }, maps)

      expect(result.regex).toEqual([])
    })

    it('returns regex node ids when fragment stateIds intersect selection', () => {
      const maps = makeMaps(true)
      const result = resolve({ pane: 'nfa', nodeIds: ['q1'] }, maps)

      // n0 fragment covers q0 and q1; q1 is in the selection -> n0 should appear
      expect(result.regex).toContain('n0')
    })
  })

  describe('regex pane as selection source', () => {
    it('resolves regex node id n0 to NFA states when fragments provided', () => {
      const maps = makeMaps(true)
      const result = resolve({ pane: 'regex', nodeIds: ['n0'] }, maps)

      expect(result.nfa.sort()).toEqual(['q0', 'q1'])
    })

    it('regex->NFA->DFA->min composition', () => {
      const maps = makeMaps(true)
      const result = resolve({ pane: 'regex', nodeIds: ['n0'] }, maps)

      expect(result.dfa).toEqual(['{q0,q1}'])
      expect(result.min).toEqual(['A'])
    })

    it('echoes the selection into the regex result', () => {
      const maps = makeMaps(true)
      const result = resolve({ pane: 'regex', nodeIds: ['n0'] }, maps)

      expect(result.regex).toEqual(['n0'])
    })

    it('without fragments, regex selection yields all-empty except echo', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'regex', nodeIds: ['n0'] }, maps)

      expect(result.nfa).toEqual([])
      expect(result.dfa).toEqual([])
      expect(result.min).toEqual([])
      expect(result.regex).toEqual(['n0'])
    })

    it('without fragments, never throws regardless of node id', () => {
      const maps = makeMaps()
      expect(() =>
        resolve({ pane: 'regex', nodeIds: ['nonexistent', 'also-gone'] }, maps)
      ).not.toThrow()
    })
  })

  describe('absent keys and empty selections', () => {
    it('missing dfaId in nfaStateSets contributes nothing to nfa', () => {
      const maps = makeMaps()
      const result = resolve({ pane: 'dfa', nodeIds: ['ghost'] }, maps)

      expect(result.nfa).toEqual([])
      expect(result.min).toEqual([])
    })

    it('empty nodeIds selection returns all-empty result without throwing', () => {
      const maps = makeMaps()
      expect(() => resolve({ pane: 'dfa', nodeIds: [] }, maps)).not.toThrow()
      const result = resolve({ pane: 'dfa', nodeIds: [] }, maps)
      expect(result.nfa).toEqual([])
      expect(result.dfa).toEqual([])
      expect(result.min).toEqual([])
      expect(result.regex).toEqual([])
    })

    it('output arrays are always de-duplicated and sorted', () => {
      const maps = makeMaps()
      // Select both DFA states that map to min class B -> B should appear once
      const result = resolve({ pane: 'dfa', nodeIds: ['{q2}', '∅'] }, maps)

      const minUniq = [...new Set(result.min)]
      expect(result.min).toEqual(minUniq)
    })
  })
})
