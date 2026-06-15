import { NFA, DFA, State, Transition, BOUNDS } from '../automata/types'
import { lambdaClosure } from './lambda'
import { assertWithinBounds } from './bounds'

// DFA produced by the subset construction paired with the mapping that drove it.
// nfaStateSets: each DFA state id -> sorted list of NFA state ids it represents.
// The trap state '∅' maps to [] (empty subset). Returned as sibling data so the
// NFA/DFA types are not mutated (NFA/DFA are shared correctness contracts).
export interface SubsetCorrespondence {
  dfa: DFA
  nfaStateSets: Map<string, string[]>
}

function move(nfa: NFA, stateIds: Set<string>, symbol: string): Set<string> {
  const result = new Set<string>()

  for (const stateId of stateIds) {
    nfa.transitions
      .filter(t => t.from === stateId && t.symbol === symbol)
      .forEach(t => result.add(t.to))
  }

  return result
}

function stateSetToString(stateIds: Set<string>): string {
  return `{${Array.from(stateIds).sort().join(',')}}`
}

function stateSetEquals(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const item of a) {
    if (!b.has(item)) return false
  }
  return true
}

function findExistingState(
  dfaStates: Map<string, Set<string>>,
  stateSet: Set<string>
): string | null {
  for (const [key, existingSet] of dfaStates) {
    if (stateSetEquals(existingSet, stateSet)) {
      return key
    }
  }
  return null
}

// Single internal implementation of the powerset (subset) construction.
// Both public exports call this; neither duplicates the worklist.
//
// SAFETY-01. The worklist loop is unbounded: a 2^n NFA determinizes to 2^n
// DFA states and would otherwise hang the tab. assertWithinBounds throws
// TooLargeError when the discovered-state count crosses BOUNDS.MAX_DFA_STATES
// or the wall-clock budget is spent. The guard only ever throws; it never
// alters the success path, so every construction below 256 states is
// byte-identical to before this refactor (the exact-acceptance suite proves it).
//
// collectCorrespondence controls whether the DFA-state -> NFA-state-set map is
// built. nfaToDFA passes false to avoid the extra Map allocation; the result
// field is only populated when true (nfaToDFAWithCorrespondence path).
function runSubsetConstruction(
  nfa: NFA,
  customAlphabet?: Set<string>,
  collectCorrespondence?: boolean
): { dfa: DFA; nfaStateSets?: Map<string, string[]> } {
  const dfaStates = new Map<string, Set<string>>()
  const dfaTransitions: Transition[] = []
  const worklist: Set<string>[] = []

  const startClosure = lambdaClosure(nfa, [nfa.startState])
  const startStateName = stateSetToString(startClosure)
  dfaStates.set(startStateName, startClosure)
  worklist.push(startClosure)

  const alphabet = customAlphabet || nfa.alphabet

  const TRAP_STATE = '∅'
  let trapStateNeeded = false

  const startedAt = performance.now()

  while (worklist.length > 0) {
    // Time budget first, in case a construction stays under the state cap but
    // grinds (degenerate lambda structure). count here is the states found so
    // far; the start state is already seeded, so it is never zero.
    assertWithinBounds(dfaStates.size, BOUNDS.TIME_BUDGET_MS, startedAt)

    const currentSet = worklist.pop()!
    const currentName = stateSetToString(currentSet)

    for (const symbol of alphabet) {
      const moveResult = move(nfa, currentSet, symbol)
      const targetClosure = lambdaClosure(nfa, Array.from(moveResult))

      if (targetClosure.size === 0) {
        trapStateNeeded = true
        dfaTransitions.push({ from: currentName, to: TRAP_STATE, symbol })
        continue
      }

      let targetName = findExistingState(dfaStates, targetClosure)

      if (targetName === null) {
        targetName = stateSetToString(targetClosure)
        dfaStates.set(targetName, targetClosure)
        worklist.push(targetClosure)
        // Check AFTER recording a newly discovered state, never on the success
        // path of a small build. The cap fires on strictly greater than 256,
        // so a DFA that lands exactly at the cap is still produced; only a true
        // blow-up (e.g. 2^n) trips it. Throws TooLargeError; never truncates.
        assertWithinBounds(dfaStates.size, BOUNDS.TIME_BUDGET_MS, startedAt)
      }

      dfaTransitions.push({ from: currentName, to: targetName, symbol })
    }
  }

  if (trapStateNeeded) {
    dfaStates.set(TRAP_STATE, new Set())
    for (const symbol of alphabet) {
      dfaTransitions.push({ from: TRAP_STATE, to: TRAP_STATE, symbol })
    }
  }

  const states: State[] = Array.from(dfaStates.keys()).map(id => ({ id }))

  const acceptStates: string[] = []
  for (const [stateName, stateSet] of dfaStates) {
    for (const nfaAccept of nfa.acceptStates) {
      if (stateSet.has(nfaAccept)) {
        acceptStates.push(stateName)
        break
      }
    }
  }

  const dfa: DFA = {
    states,
    transitions: dfaTransitions,
    startState: startStateName,
    acceptStates,
    alphabet: new Set(alphabet),
  }

  if (!collectCorrespondence) return { dfa }

  // Convert the internal Set<string> map to sorted string[] for the public surface
  // (no Set in the public shape; matches the cache's array convention).
  // The trap state '∅' maps to [] (empty subset).
  const nfaStateSets = new Map<string, string[]>()
  for (const [dfaId, nfaSet] of dfaStates) {
    nfaStateSets.set(dfaId, Array.from(nfaSet).sort())
  }

  return { dfa, nfaStateSets }
}

export function nfaToDFA(nfa: NFA, customAlphabet?: Set<string>): DFA {
  return runSubsetConstruction(nfa, customAlphabet).dfa
}

export function nfaToDFAWithCorrespondence(
  nfa: NFA,
  customAlphabet?: Set<string>
): SubsetCorrespondence {
  const { dfa, nfaStateSets } = runSubsetConstruction(nfa, customAlphabet, true)
  return { dfa, nfaStateSets: nfaStateSets! }
}
