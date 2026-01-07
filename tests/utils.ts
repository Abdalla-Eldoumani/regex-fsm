import { NFA, DFA } from '@/core/automata/types'

export function createSimpleNFA(): NFA {
  return {
    states: [{ id: 'q0' }, { id: 'q1' }],
    transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
    startState: 'q0',
    acceptStates: ['q1'],
    alphabet: new Set(['a']),
  }
}

export function assertNFAValid(nfa: NFA): void {
  if (!nfa.states.find(s => s.id === nfa.startState)) {
    throw new Error('Start state does not exist')
  }

  nfa.acceptStates.forEach(id => {
    if (!nfa.states.find(s => s.id === id)) {
      throw new Error(`Accept state ${id} does not exist`)
    }
  })

  nfa.transitions.forEach(t => {
    if (!nfa.states.find(s => s.id === t.from)) {
      throw new Error(`Transition from state ${t.from} does not exist`)
    }
    if (!nfa.states.find(s => s.id === t.to)) {
      throw new Error(`Transition to state ${t.to} does not exist`)
    }
  })
}

export function assertDFADeterministic(dfa: DFA): void {
  const stateSymbolPairs = new Set<string>()

  dfa.transitions.forEach(t => {
    const key = `${t.from}:${t.symbol}`
    if (stateSymbolPairs.has(key)) {
      throw new Error(`DFA has multiple transitions from ${t.from} on symbol ${t.symbol}`)
    }
    stateSymbolPairs.add(key)
  })
}
