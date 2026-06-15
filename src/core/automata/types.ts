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

// SAFETY-01. Subset construction and Brzozowski are exponential in the worst
// case; the parser recurses with input nesting. Untrusted or hand-built input
// can therefore hang or overflow the tab. TooLargeError is the single shared
// signal raised when a bounded construction crosses a hard limit, so the caller
// can show one "too large to render" message instead of returning a wrong,
// truncated automaton. A partial result presented as complete is worse than
// none (automata-correctness invariant 8).
export class TooLargeError extends Error {
  readonly kind = 'too-large' as const

  constructor(
    public readonly reason: 'state-cap' | 'time-budget' | 'parser-depth',
    public readonly limit: number,
    // Describes the partial work reached before stopping. Never a usable
    // automaton, only a count to put in the message.
    public readonly partial?: { states: number }
  ) {
    super(
      reason === 'state-cap'
        ? `This automaton is too large to render here (exceeded ${limit} states).`
        : reason === 'time-budget'
          ? `This automaton is too large to render here (construction exceeded ${limit} ms).`
          : `This pattern is too large to render here (nesting exceeded ${limit}).`
    )
    this.name = 'TooLargeError'
  }
}

// The hard limits. MAX_DFA_STATES is the locked EDGE_CASES product decision
// (256 DFA states). TIME_BUDGET_MS and MAX_PARSE_DEPTH are tuned to trip a real
// blow-up fast while clearing every existing test by a wide margin. Frozen so a
// caller cannot silently widen the DoS bound at runtime.
export const BOUNDS = Object.freeze({
  MAX_DFA_STATES: 256,
  TIME_BUDGET_MS: 2000,
  MAX_PARSE_DEPTH: 300,
} as const)
