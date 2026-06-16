// dfaStateForNfaSet: the pure per-step lookup that drives the side-by-side synced
// run (SIM-03). Given the nfaStateSets correspondence from the subset construction
// (Map<dfaStateId, sorted NFA-state-id[]>) and the NFA active set at one step, it
// returns the single determinized DFA state whose subset IS that set, or null when
// no state represents it.
//
// Why this is an identity, not a search: the determinized state reached after
// consuming i symbols is, by the subset construction, the lambda-closure of the move
// set -- which is exactly how simulateNFA computes nextStates. So the highlighted DFA
// state's subset equals the NFA active set at every step. That is the teaching point
// the side-by-side view makes literal; this function only resolves the set to its id.
//
// The compare is by SET MEMBERSHIP (size + every member present), not by join order.
// nfaStateSets values and simulateNFA nextStates are both sorted ascending today, so
// a join-compare would also work, but an order-independent compare cannot be silently
// broken by a future ordering change (the T-10-10 tampering mitigation). The empty
// set resolves to the trap state whose entry is [] when one exists, else null.

// Compare a candidate NFA-state subset (from nfaStateSets, a string[]) against the
// active set (also a string[]) as sets: same size and every active member present.
// activeMembers is passed as a Set so the inner check is O(1) per element.
function subsetEqualsActive(subset: string[], activeMembers: Set<string>): boolean {
  if (subset.length !== activeMembers.size) return false
  for (const id of subset) {
    if (!activeMembers.has(id)) return false
  }
  return true
}

export function dfaStateForNfaSet(
  nfaStateSets: Map<string, string[]>,
  activeSet: string[]
): string | null {
  const activeMembers = new Set(activeSet)

  for (const [dfaStateId, subset] of nfaStateSets) {
    if (subsetEqualsActive(subset, activeMembers)) {
      return dfaStateId
    }
  }

  return null
}
