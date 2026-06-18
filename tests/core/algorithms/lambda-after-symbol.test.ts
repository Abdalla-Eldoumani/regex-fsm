import { describe, it, expect } from 'vitest'
import { simulateNFA, simulateDFA } from '@/core/algorithms/simulate'
import { nfaToDFA } from '@/core/algorithms/subset'
import type { NFA } from '@/core/automata/types'

// Every buildNFA-sourced test stays green even if the lambda-closure that runs
// AFTER a symbol step is dropped, because Thompson never builds an accept state
// with an outgoing lambda edge. These hand-built automata are the only guard for
// course-correctness invariant 3 (a configuration is always its full
// lambda-closure) across both NFA simulation and subset construction.

// q0 --a--> q1 --lambda--> q2(accept). Reading "a" lands on q1; only the closure
// reaches the accepting q2.
function symbolThenLambda(): NFA {
  return {
    states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
    transitions: [
      { from: 'q0', to: 'q1', symbol: 'a' },
      { from: 'q1', to: 'q2', symbol: null },
    ],
    startState: 'q0',
    acceptStates: ['q2'],
    alphabet: new Set(['a']),
  }
}

// q0 --lambda--> q1(accept). The empty string is in the language only if the
// start configuration is closed before acceptance is checked.
function startLambda(): NFA {
  return {
    states: [{ id: 'q0' }, { id: 'q1' }],
    transitions: [{ from: 'q0', to: 'q1', symbol: null }],
    startState: 'q0',
    acceptStates: ['q1'],
    alphabet: new Set(['a']),
  }
}

// q0 --a--> q1 --lambda--> q2 --lambda--> q3(accept), with a q2 --lambda--> q1
// back edge so the post-symbol closure must follow a chain and terminate on a
// cycle rather than loop forever.
function symbolThenLambdaChain(): NFA {
  return {
    states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }, { id: 'q3' }],
    transitions: [
      { from: 'q0', to: 'q1', symbol: 'a' },
      { from: 'q1', to: 'q2', symbol: null },
      { from: 'q2', to: 'q3', symbol: null },
      { from: 'q2', to: 'q1', symbol: null },
    ],
    startState: 'q0',
    acceptStates: ['q3'],
    alphabet: new Set(['a']),
  }
}

describe('lambda closure after a symbol step (invariant 3)', () => {
  describe('NFA simulation', () => {
    it('reaches an accept state through a lambda move after consuming a symbol', () => {
      const nfa = symbolThenLambda()
      expect(simulateNFA(nfa, 'a').accepted).toBe(true)
      expect(simulateNFA(nfa, '').accepted).toBe(false)
      expect(simulateNFA(nfa, 'aa').accepted).toBe(false)
    })

    it('closes the start configuration before checking the empty string', () => {
      const nfa = startLambda()
      expect(simulateNFA(nfa, '').accepted).toBe(true)
      expect(simulateNFA(nfa, 'a').accepted).toBe(false)
    })

    it('follows a lambda chain with a cycle after a symbol without looping forever', () => {
      const nfa = symbolThenLambdaChain()
      expect(simulateNFA(nfa, 'a').accepted).toBe(true)
      expect(simulateNFA(nfa, '').accepted).toBe(false)
    })
  })

  describe('subset construction', () => {
    it('makes the post-symbol DFA subset accepting via the lambda closure', () => {
      const dfa = nfaToDFA(symbolThenLambda())
      expect(simulateDFA(dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(dfa, '').accepted).toBe(false)
    })

    it('puts the lambda-closed start set into the start DFA state', () => {
      const dfa = nfaToDFA(startLambda())
      // The empty string is in the language, so the start DFA state is accepting.
      expect(dfa.acceptStates).toContain(dfa.startState)
      expect(simulateDFA(dfa, '').accepted).toBe(true)
    })

    it('agrees with NFA simulation across the lambda-chain automaton', () => {
      const nfa = symbolThenLambdaChain()
      const dfa = nfaToDFA(nfa)
      for (const s of ['', 'a', 'aa', 'aaa']) {
        expect(simulateDFA(dfa, s).accepted).toBe(simulateNFA(nfa, s).accepted)
      }
    })
  })
})
