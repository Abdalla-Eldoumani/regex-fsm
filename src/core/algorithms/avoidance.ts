import { DFA, State, Transition } from '../automata/types'

/**
 * Result of building an avoidance DFA
 */
export interface AvoidanceDFAResult {
  dfa: DFA
  description: string
}

/**
 * Compute the KMP failure function for a pattern.
 * failure[i] = length of longest proper prefix of pattern[0..i] that is also a suffix
 */
function computeFailureFunction(pattern: string): number[] {
  const n = pattern.length
  const failure = new Array(n).fill(0)

  let k = 0
  for (let i = 1; i < n; i++) {
    while (k > 0 && pattern[k] !== pattern[i]) {
      k = failure[k - 1]
    }
    if (pattern[k] === pattern[i]) {
      k++
    }
    failure[i] = k
  }

  return failure
}

/**
 * Get the next state when reading a character from a given state.
 * Uses KMP failure function to find the longest prefix that matches.
 */
function getNextState(pattern: string, failure: number[], state: number, char: string): number {
  let j = state

  while (j > 0 && pattern[j] !== char) {
    j = failure[j - 1]
  }

  if (pattern[j] === char) {
    return j + 1
  }

  return 0
}

/**
 * Build a DFA that accepts all strings NOT containing the pattern as a substring.
 *
 * Algorithm (based on KMP failure function):
 * - States q0, q1, ..., qn track how many characters of the pattern have been matched
 * - State qn (full match) is the trap/reject state
 * - All other states (q0 to qn-1) are accepting states
 * - Transitions use failure function to handle partial matches
 *
 * @param pattern The substring pattern to avoid
 * @param alphabet The set of symbols in the alphabet
 * @returns DFA accepting strings that don't contain the pattern
 */
export function buildAvoidanceDFA(
  pattern: string,
  alphabet: Set<string>
): AvoidanceDFAResult {
  // Handle edge case: empty pattern
  if (!pattern) {
    // Empty pattern matches everywhere - no string avoids it except the empty set
    // But convention: empty pattern means "accept all strings"
    const trapState: State = { id: '∅', label: '∅' }
    const startState: State = { id: 'q0', label: 'q0' }
    const transitions: Transition[] = []

    // Self-loops on start for all alphabet symbols
    for (const symbol of alphabet) {
      transitions.push({ from: 'q0', to: 'q0', symbol })
    }

    return {
      dfa: {
        states: [startState, trapState],
        transitions,
        startState: 'q0',
        acceptStates: ['q0'],
        alphabet,
      },
      description: `DFA accepting all strings (empty pattern to avoid)`,
    }
  }

  const n = pattern.length
  const failure = computeFailureFunction(pattern)

  // Create n+1 states: q0 to qn
  // q0..q(n-1) are accepting (haven't matched full pattern)
  // qn is trap state (matched full pattern)
  const states: State[] = []
  const acceptStates: string[] = []

  for (let i = 0; i <= n; i++) {
    const stateId = i === n ? '∅' : `q${i}`
    const label = i === n ? '∅' : `q${i}`
    states.push({ id: stateId, label })

    if (i < n) {
      acceptStates.push(stateId)
    }
  }

  // Build transitions
  const transitions: Transition[] = []

  for (let i = 0; i <= n; i++) {
    const fromState = i === n ? '∅' : `q${i}`

    for (const symbol of alphabet) {
      let toState: string

      if (i === n) {
        // Trap state: stay in trap
        toState = '∅'
      } else {
        const nextState = getNextState(pattern, failure, i, symbol)
        toState = nextState === n ? '∅' : `q${nextState}`
      }

      transitions.push({ from: fromState, to: toState, symbol })
    }
  }

  return {
    dfa: {
      states,
      transitions,
      startState: 'q0',
      acceptStates,
      alphabet,
    },
    description: `DFA accepting strings that do not contain "${pattern}"`,
  }
}

/**
 * Build a DFA that accepts all strings NOT starting with the pattern.
 *
 * @param pattern The prefix pattern to avoid
 * @param alphabet The set of symbols in the alphabet
 * @returns DFA accepting strings that don't start with the pattern
 */
export function buildNotStartsWithDFA(
  pattern: string,
  alphabet: Set<string>
): AvoidanceDFAResult {
  if (!pattern) {
    // Empty pattern matches empty prefix - but every string starts with empty string
    // So no string avoids starting with empty - reject all except λ
    // Actually, per convention, we'll accept all strings
    const startState: State = { id: 'q0', label: 'q0' }
    const transitions: Transition[] = []

    for (const symbol of alphabet) {
      transitions.push({ from: 'q0', to: 'q0', symbol })
    }

    return {
      dfa: {
        states: [startState],
        transitions,
        startState: 'q0',
        acceptStates: ['q0'],
        alphabet,
      },
      description: `DFA accepting all strings (empty pattern)`,
    }
  }

  const n = pattern.length

  // States:
  // q0..q(n-1): tracking prefix match progress
  // qn (trap): matched full prefix, reject forever
  // qA: accepted (didn't match full prefix, accept all remaining)
  const states: State[] = []
  const acceptStates: string[] = []

  // Prefix tracking states. Each qi means i characters of the prefix have been
  // read so far, so qi has NOT yet matched the full pattern. A string that ends
  // in any qi is a proper prefix of the pattern (or diverges later), so it does
  // not start with the full pattern and must be accepted. Mirrors the all-non-trap
  // accepting convention of buildAvoidanceDFA and buildNotEndsWithDFA.
  for (let i = 0; i < n; i++) {
    states.push({ id: `q${i}`, label: `q${i}` })
    acceptStates.push(`q${i}`)
  }

  // Trap state (matched the full prefix): the only non-accepting state.
  states.push({ id: '∅', label: '∅' })

  // Accept state (diverged from the prefix, can accept anything)
  states.push({ id: 'qA', label: 'qA' })
  acceptStates.push('qA')

  const transitions: Transition[] = []

  // Prefix tracking transitions
  for (let i = 0; i < n; i++) {
    for (const symbol of alphabet) {
      if (pattern[i] === symbol) {
        // Continue matching prefix
        if (i === n - 1) {
          // Matched full prefix - go to trap
          transitions.push({ from: `q${i}`, to: '∅', symbol })
        } else {
          transitions.push({ from: `q${i}`, to: `q${i + 1}`, symbol })
        }
      } else {
        // Diverged from prefix - go to accept state
        transitions.push({ from: `q${i}`, to: 'qA', symbol })
      }
    }
  }

  // Accept state: stay forever
  for (const symbol of alphabet) {
    transitions.push({ from: 'qA', to: 'qA', symbol })
  }

  // Trap state: stay forever
  for (const symbol of alphabet) {
    transitions.push({ from: '∅', to: '∅', symbol })
  }

  return {
    dfa: {
      states,
      transitions,
      startState: 'q0',
      acceptStates,
      alphabet,
    },
    description: `DFA accepting strings that do not start with "${pattern}"`,
  }
}

/**
 * Build a DFA that accepts all strings NOT ending with the pattern.
 *
 * This is more complex - we need to track whether the pattern could be at the end.
 * Uses similar KMP-based approach.
 *
 * @param pattern The suffix pattern to avoid
 * @param alphabet The set of symbols in the alphabet
 * @returns DFA accepting strings that don't end with the pattern
 */
export function buildNotEndsWithDFA(
  pattern: string,
  alphabet: Set<string>
): AvoidanceDFAResult {
  if (!pattern) {
    // Accept all strings
    const startState: State = { id: 'q0', label: 'q0' }
    const transitions: Transition[] = []

    for (const symbol of alphabet) {
      transitions.push({ from: 'q0', to: 'q0', symbol })
    }

    return {
      dfa: {
        states: [startState],
        transitions,
        startState: 'q0',
        acceptStates: ['q0'],
        alphabet,
      },
      description: `DFA accepting all strings (empty pattern)`,
    }
  }

  const n = pattern.length
  const failure = computeFailureFunction(pattern)

  // States: q0..qn where state qi means "last i characters matched the first i of pattern"
  // Accept states: all except qn (which means we just matched the full suffix)
  const states: State[] = []
  const acceptStates: string[] = []

  for (let i = 0; i <= n; i++) {
    const stateId = `q${i}`
    states.push({ id: stateId, label: stateId })

    if (i < n) {
      acceptStates.push(stateId)
    }
  }

  // Build transitions using KMP logic
  const transitions: Transition[] = []

  for (let i = 0; i <= n; i++) {
    for (const symbol of alphabet) {
      // When at state qi and reading symbol, find new state
      let j = i

      // If we just completed the pattern (i === n), we need to find
      // where we could be after failing to extend
      if (i === n) {
        j = failure[n - 1]
      }

      // Now apply the symbol
      while (j > 0 && pattern[j] !== symbol) {
        j = failure[j - 1]
      }

      if (pattern[j] === symbol) {
        j++
      }

      transitions.push({ from: `q${i}`, to: `q${j}`, symbol })
    }
  }

  return {
    dfa: {
      states,
      transitions,
      startState: 'q0',
      acceptStates,
      alphabet,
    },
    description: `DFA accepting strings that do not end with "${pattern}"`,
  }
}
