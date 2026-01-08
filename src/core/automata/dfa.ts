import { DFA } from './types'

export function isDeterministic(dfa: DFA): boolean {
  const stateSymbolPairs = new Set<string>()

  for (const transition of dfa.transitions) {
    if (transition.symbol === null) {
      return false
    }

    const key = `${transition.from}:${transition.symbol}`
    if (stateSymbolPairs.has(key)) {
      return false
    }
    stateSymbolPairs.add(key)
  }

  return true
}

export function validateDFA(dfa: DFA): void {
  const stateIds = new Set(dfa.states.map(s => s.id))

  if (!stateIds.has(dfa.startState)) {
    throw new Error(`Start state ${dfa.startState} not found in states`)
  }

  for (const acceptState of dfa.acceptStates) {
    if (!stateIds.has(acceptState)) {
      throw new Error(`Accept state ${acceptState} not found in states`)
    }
  }

  for (const transition of dfa.transitions) {
    if (!stateIds.has(transition.from)) {
      throw new Error(`Transition from state ${transition.from} not found in states`)
    }
    if (!stateIds.has(transition.to)) {
      throw new Error(`Transition to state ${transition.to} not found in states`)
    }
  }

  if (!isDeterministic(dfa)) {
    throw new Error('DFA is not deterministic')
  }
}
