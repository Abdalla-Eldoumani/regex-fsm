export interface State {
  id: string
  label?: string
}

export interface Transition {
  from: string
  to: string
  symbol: string | null
}

export interface NFA {
  states: State[]
  transitions: Transition[]
  startState: string
  acceptStates: string[]
  alphabet: Set<string>
}

export interface DFA {
  states: State[]
  transitions: Transition[]
  startState: string
  acceptStates: string[]
  alphabet: Set<string>
}

export type Automaton = NFA | DFA
