import { describe, it, expect } from 'vitest'
import { dfaStateForNfaSet } from '@/core/algorithms/dfaStateForNfaSet'
import { nfaToDFAWithCorrespondence } from '@/core/algorithms/subset'
import { simulateNFA } from '@/core/algorithms/simulate'
import type { NFA } from '@/core/automata/types'

// dfaStateForNfaSet is the pure per-step bridge for the side-by-side synced run
// (SIM-03): given the nfaStateSets correspondence from the subset construction and
// the NFA active set at a step, it returns the single determinized DFA state whose
// subset IS that set. The teaching claim is that the determinized state equals the
// lambda-closed set of reachable NFA states, so this lookup is an identity over the
// subset construction; the test pins it against a REAL correspondence, never a
// fabricated map.

// The ends-in-ab preset: q0 has TWO a-transitions (q0->q0 self-loop and q0->q1),
// so reading 'a' from {q0} yields the active set {q0,q1} -- a genuine branching
// step where the active set has more than one state. This is the case the SIM-03
// correspondence must hold at, so it anchors the lookup test.
const endsInAbNfa: NFA = {
  states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
  transitions: [
    { from: 'q0', to: 'q0', symbol: 'a' },
    { from: 'q0', to: 'q0', symbol: 'b' },
    { from: 'q0', to: 'q1', symbol: 'a' },
    { from: 'q1', to: 'q2', symbol: 'b' },
  ],
  startState: 'q0',
  acceptStates: ['q2'],
  alphabet: new Set(['a', 'b']),
}

describe('dfaStateForNfaSet', () => {
  it('maps an NFA active set to the determinized DFA state whose subset equals it', () => {
    const { nfaStateSets } = nfaToDFAWithCorrespondence(endsInAbNfa)
    const run = simulateNFA(endsInAbNfa, 'a')

    // After reading 'a' the active set is the branching set {q0,q1}.
    const activeSet = run.steps[run.steps.length - 1].nextStates
    expect(activeSet.length).toBeGreaterThan(1)

    const dfaState = dfaStateForNfaSet(nfaStateSets, activeSet)
    expect(dfaState).not.toBeNull()

    // The returned DFA state's own subset must equal the active set, set for set.
    const subset = nfaStateSets.get(dfaState!)!
    expect([...subset].sort()).toEqual([...activeSet].sort())
  })

  it('returns the matching state at every step of a branching run', () => {
    const { nfaStateSets } = nfaToDFAWithCorrespondence(endsInAbNfa)
    const run = simulateNFA(endsInAbNfa, 'aab')

    for (const step of run.steps) {
      const dfaState = dfaStateForNfaSet(nfaStateSets, step.nextStates)
      expect(dfaState).not.toBeNull()
      const subset = nfaStateSets.get(dfaState!)!
      expect([...subset].sort()).toEqual([...step.nextStates].sort())
    }
  })

  it('matches regardless of input ordering (order-independent set compare)', () => {
    const { nfaStateSets } = nfaToDFAWithCorrespondence(endsInAbNfa)

    // {q0,q1} is a real determinized state for this NFA. The lookup must find it
    // whether the caller passes the ids sorted or reversed -- the compare is by
    // set membership, not by join order, so a future ordering change cannot break it.
    const sorted = dfaStateForNfaSet(nfaStateSets, ['q0', 'q1'])
    const reversed = dfaStateForNfaSet(nfaStateSets, ['q1', 'q0'])
    expect(sorted).not.toBeNull()
    expect(reversed).toBe(sorted)
  })

  it('maps the empty active set to the trap state whose entry is empty', () => {
    // A custom alphabet that the NFA does not fully use forces a trap state ('∅')
    // whose nfaStateSets entry is []. The empty active set must resolve to it.
    const { dfa, nfaStateSets } = nfaToDFAWithCorrespondence(endsInAbNfa, new Set(['a', 'b', 'c']))
    expect(dfa.states.some(s => s.id === '∅')).toBe(true)

    const trap = dfaStateForNfaSet(nfaStateSets, [])
    expect(trap).toBe('∅')
    expect(nfaStateSets.get(trap!)).toEqual([])
  })

  it('returns null when no DFA state has the empty subset and the set is empty', () => {
    // Without a trap state there is no entry equal to []; the empty set has no match.
    const { dfa, nfaStateSets } = nfaToDFAWithCorrespondence(endsInAbNfa)
    expect(dfa.states.some(s => s.id === '∅')).toBe(false)
    expect(dfaStateForNfaSet(nfaStateSets, [])).toBeNull()
  })

  it('returns null for a set that no determinized state represents', () => {
    const { nfaStateSets } = nfaToDFAWithCorrespondence(endsInAbNfa)
    // q9 is not a state of this NFA, so no subset contains it.
    expect(dfaStateForNfaSet(nfaStateSets, ['q9'])).toBeNull()
  })

  it('matches exactly: a strict subset does not match a superset state', () => {
    const { nfaStateSets } = nfaToDFAWithCorrespondence(endsInAbNfa)

    // {q0,q1} is a determinized state but {q0} alone is the start state, a different
    // determinized state. Looking up {q0,q1,q2} (a superset that no state equals)
    // must NOT match the {q0,q1} state; the compare is equality, not containment.
    const superset = dfaStateForNfaSet(nfaStateSets, ['q0', 'q1', 'q2'])
    if (superset !== null) {
      const subset = nfaStateSets.get(superset)!
      expect([...subset].sort()).toEqual(['q0', 'q1', 'q2'])
    } else {
      expect(superset).toBeNull()
    }
  })
})
