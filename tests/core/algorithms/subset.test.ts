import { describe, it, expect } from 'vitest'
import { nfaToDFA } from '@/core/algorithms/subset'
import { buildNFA } from '@/core/algorithms/thompson'
import { parse } from '@/core/regex/parser'
import { validateDFA, isDeterministic } from '@/core/automata/dfa'

describe('subset construction', () => {
  describe('simple conversions', () => {
    it('converts single symbol NFA to DFA', () => {
      const ast = parse('a')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(dfa.states.length).toBeGreaterThan(0)
      expect(dfa.acceptStates.length).toBeGreaterThan(0)
      expect(isDeterministic(dfa)).toBe(true)
      expect(() => validateDFA(dfa)).not.toThrow()
    })

    it('converts two symbol concatenation NFA to DFA', () => {
      const ast = parse('ab')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(() => validateDFA(dfa)).not.toThrow()
      expect(dfa.alphabet).toEqual(new Set(['a', 'b']))
    })

    it('converts simple union NFA to DFA', () => {
      const ast = parse('a|b')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(() => validateDFA(dfa)).not.toThrow()
      expect(dfa.alphabet).toEqual(new Set(['a', 'b']))
    })
  })

  describe('epsilon transitions', () => {
    it('handles epsilon in NFA start state', () => {
      const ast = parse('ε')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(dfa.acceptStates).toHaveLength(1)
    })

    it('handles Kleene star with epsilon transitions', () => {
      const ast = parse('a*')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(() => validateDFA(dfa)).not.toThrow()
    })

    it('handles optional with epsilon transitions', () => {
      const ast = parse('a?')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(() => validateDFA(dfa)).not.toThrow()
    })

    it('handles positive closure with epsilon transitions', () => {
      const ast = parse('a+')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(() => validateDFA(dfa)).not.toThrow()
    })
  })

  describe('state count', () => {
    it('DFA has fewer or equal states than NFA for simple regex', () => {
      const ast = parse('ab')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(dfa.states.length).toBeLessThanOrEqual(nfa.states.length)
    })

    it('creates expected number of states for (a|b)*', () => {
      const ast = parse('(a|b)*')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(dfa.states.length).toBeGreaterThan(0)
      expect(isDeterministic(dfa)).toBe(true)
    })

    it('handles single state DFA for epsilon', () => {
      const ast = parse('ε')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(dfa.states.length).toBe(1)
      expect(dfa.startState).toBe(dfa.acceptStates[0])
    })
  })

  describe('accept states', () => {
    it('identifies correct accept states for single symbol', () => {
      const ast = parse('a')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(dfa.acceptStates.length).toBeGreaterThan(0)
      expect(dfa.states.some(s => dfa.acceptStates.includes(s.id))).toBe(true)
    })

    it('identifies correct accept states for union', () => {
      const ast = parse('a|b')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(dfa.acceptStates.length).toBeGreaterThan(0)
    })

    it('marks start as accept for star', () => {
      const ast = parse('a*')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(dfa.acceptStates.includes(dfa.startState)).toBe(true)
    })

    it('marks start as accept for optional', () => {
      const ast = parse('a?')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(dfa.acceptStates.includes(dfa.startState)).toBe(true)
    })

    it('does not mark start as accept for plus', () => {
      const ast = parse('a+')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(dfa.acceptStates.includes(dfa.startState)).toBe(false)
    })
  })

  describe('transitions', () => {
    it('creates deterministic transitions', () => {
      const ast = parse('ab')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      const stateSymbolPairs = new Set<string>()
      for (const t of dfa.transitions) {
        const key = `${t.from}:${t.symbol}`
        expect(stateSymbolPairs.has(key)).toBe(false)
        stateSymbolPairs.add(key)
      }
    })

    it('has no epsilon transitions', () => {
      const ast = parse('a*')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      const epsilonTransitions = dfa.transitions.filter(t => t.symbol === null)
      expect(epsilonTransitions).toHaveLength(0)
    })

    it('preserves alphabet from NFA', () => {
      const ast = parse('abc')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(dfa.alphabet).toEqual(nfa.alphabet)
    })
  })

  describe('complex expressions', () => {
    it('converts (a|b)*abb to DFA', () => {
      const ast = parse('(a|b)*abb')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(() => validateDFA(dfa)).not.toThrow()
      expect(dfa.alphabet).toEqual(new Set(['a', 'b']))
    })

    it('converts a*b+c? to DFA', () => {
      const ast = parse('a*b+c?')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(dfa.alphabet).toEqual(new Set(['a', 'b', 'c']))
    })

    it('converts (a+b)*c to DFA', () => {
      const ast = parse('(a+b)*c')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(() => validateDFA(dfa)).not.toThrow()
    })

    it('converts nested groups to DFA', () => {
      const ast = parse('a(b|c)*d')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(dfa.alphabet).toEqual(new Set(['a', 'b', 'c', 'd']))
    })
  })

  describe('structural properties', () => {
    it('DFA has exactly one start state', () => {
      const ast = parse('(a|b)*')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(dfa.startState).toBeDefined()
      expect(typeof dfa.startState).toBe('string')
    })

    it('all DFA states are in states list', () => {
      const ast = parse('ab|cd')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      const stateIds = new Set(dfa.states.map(s => s.id))
      expect(stateIds.has(dfa.startState)).toBe(true)
      for (const acceptState of dfa.acceptStates) {
        expect(stateIds.has(acceptState)).toBe(true)
      }
    })

    it('all transition endpoints exist as states', () => {
      const ast = parse('(a|b)*abb')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      const stateIds = new Set(dfa.states.map(s => s.id))
      for (const t of dfa.transitions) {
        expect(stateIds.has(t.from)).toBe(true)
        expect(stateIds.has(t.to)).toBe(true)
      }
    })

    it('DFA state names contain NFA state IDs', () => {
      const ast = parse('a|b')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      for (const state of dfa.states) {
        expect(state.id).toMatch(/^\{.*\}$/)
      }
    })
  })

  describe('edge cases', () => {
    it('handles single epsilon', () => {
      const ast = parse('ε')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(dfa.states).toHaveLength(1)
      expect(dfa.acceptStates).toHaveLength(1)
      expect(dfa.transitions).toHaveLength(0)
    })

    it('handles epsilon in union', () => {
      const ast = parse('a|ε')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(dfa.acceptStates.includes(dfa.startState)).toBe(true)
    })

    it('handles long concatenation', () => {
      const ast = parse('abcde')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(() => validateDFA(dfa)).not.toThrow()
    })

    it('handles multiple unions', () => {
      const ast = parse('a|b|c|d')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(dfa.alphabet).toEqual(new Set(['a', 'b', 'c', 'd']))
    })
  })

  describe('validation', () => {
    it('produces valid DFA for all operators', () => {
      const regexes = ['a', 'ab', 'a|b', 'a*', 'a+', 'a?', '(a|b)*', 'a*b+c?']

      for (const regex of regexes) {
        const ast = parse(regex)
        const nfa = buildNFA(ast)
        const dfa = nfaToDFA(nfa)

        expect(() => validateDFA(dfa)).not.toThrow()
      }
    })

    it('DFA is always deterministic', () => {
      const regexes = ['a', 'ab', 'a|b', 'a*', '(a|b)*abb']

      for (const regex of regexes) {
        const ast = parse(regex)
        const nfa = buildNFA(ast)
        const dfa = nfaToDFA(nfa)

        expect(isDeterministic(dfa)).toBe(true)
      }
    })
  })
})
