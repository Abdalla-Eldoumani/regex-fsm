import { NFA, DFA } from '../automata/types'
import { epsilonClosure } from './epsilon'

export interface SimulationStep {
  position: number
  symbol: string | null
  currentStates: string[]
  nextStates: string[]
}

export interface SimulationResult {
  accepted: boolean
  steps: SimulationStep[]
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

export function simulateNFA(nfa: NFA, input: string): SimulationResult {
  const steps: SimulationStep[] = []

  let currentStates = epsilonClosure(nfa, [nfa.startState])

  steps.push({
    position: 0,
    symbol: null,
    currentStates: [nfa.startState],
    nextStates: Array.from(currentStates).sort(),
  })

  for (let i = 0; i < input.length; i++) {
    const symbol = input[i]
    const prevStates = currentStates

    const moveResult = move(nfa, currentStates, symbol)
    currentStates = epsilonClosure(nfa, Array.from(moveResult))

    steps.push({
      position: i + 1,
      symbol,
      currentStates: Array.from(prevStates).sort(),
      nextStates: Array.from(currentStates).sort(),
    })
  }

  const accepted = Array.from(currentStates).some(state =>
    nfa.acceptStates.includes(state)
  )

  return { accepted, steps }
}

export function simulateDFA(dfa: DFA, input: string): SimulationResult {
  const steps: SimulationStep[] = []

  let currentState = dfa.startState

  steps.push({
    position: 0,
    symbol: null,
    currentStates: [],
    nextStates: [currentState],
  })

  for (let i = 0; i < input.length; i++) {
    const symbol = input[i]
    const prevState = currentState

    const transition = dfa.transitions.find(
      t => t.from === currentState && t.symbol === symbol
    )

    if (!transition) {
      steps.push({
        position: i + 1,
        symbol,
        currentStates: [prevState],
        nextStates: [],
      })

      return { accepted: false, steps }
    }

    currentState = transition.to

    steps.push({
      position: i + 1,
      symbol,
      currentStates: [prevState],
      nextStates: [currentState],
    })
  }

  const accepted = dfa.acceptStates.includes(currentState)

  return { accepted, steps }
}
