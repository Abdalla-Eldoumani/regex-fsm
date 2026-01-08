import { State, NFA, Transition } from './types'

export function createStateIdGenerator(): () => string {
  let counter = 0
  return () => `q${counter++}`
}

export function createState(id: string, label?: string): State {
  return label ? { id, label } : { id }
}

export interface NFAFragment {
  nfa: NFA
  start: string
  accept: string
}

export function createNFAFragment(
  states: State[],
  transitions: Transition[],
  start: string,
  accept: string,
  alphabet: Set<string>
): NFAFragment {
  return {
    nfa: {
      states,
      transitions,
      startState: start,
      acceptStates: [accept],
      alphabet,
    },
    start,
    accept,
  }
}

export function mergeNFAs(nfa1: NFA, nfa2: NFA): NFA {
  return {
    states: [...nfa1.states, ...nfa2.states],
    transitions: [...nfa1.transitions, ...nfa2.transitions],
    startState: nfa1.startState,
    acceptStates: [...nfa1.acceptStates, ...nfa2.acceptStates],
    alphabet: new Set([...nfa1.alphabet, ...nfa2.alphabet]),
  }
}

export function addTransition(
  nfa: NFA,
  from: string,
  to: string,
  symbol: string | null
): NFA {
  return {
    ...nfa,
    transitions: [...nfa.transitions, { from, to, symbol }],
  }
}

export function addState(nfa: NFA, state: State): NFA {
  return {
    ...nfa,
    states: [...nfa.states, state],
  }
}
