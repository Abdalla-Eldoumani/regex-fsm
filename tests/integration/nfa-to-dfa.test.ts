import { describe, it, expect } from 'vitest'
import { parse } from '@/core/regex/parser'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateNFA, simulateDFA } from '@/core/algorithms/simulate'
import { isDeterministic, validateDFA } from '@/core/automata/dfa'

describe('NFA to DFA integration', () => {
  describe('determinism verification', () => {
    it('produces deterministic DFA from simple NFA', () => {
      const nfa = buildNFA(parse('a'))
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(() => validateDFA(dfa)).not.toThrow()
    })

    it('produces deterministic DFA from nondeterministic NFA', () => {
      const nfa = buildNFA(parse('a|b'))
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(() => validateDFA(dfa)).not.toThrow()
    })

    it('produces deterministic DFA with epsilon transitions', () => {
      const nfa = buildNFA(parse('(a|b)*'))
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(() => validateDFA(dfa)).not.toThrow()
    })

    it('eliminates epsilon transitions', () => {
      const nfa = buildNFA(parse('a*'))
      const dfa = nfaToDFA(nfa)

      const hasEpsilon = dfa.transitions.some(t => t.symbol === null)
      expect(hasEpsilon).toBe(false)
    })

    it('has no duplicate transitions', () => {
      const nfa = buildNFA(parse('(a|b)(c|d)'))
      const dfa = nfaToDFA(nfa)

      const transitionKeys = new Set<string>()
      dfa.transitions.forEach(t => {
        const key = `${t.from}:${t.symbol}`
        expect(transitionKeys.has(key)).toBe(false)
        transitionKeys.add(key)
      })
    })
  })

  describe('language equivalence', () => {
    it('accepts same strings as NFA for single symbol', () => {
      const nfa = buildNFA(parse('a'))
      const dfa = nfaToDFA(nfa)

      const testStrings = ['', 'a', 'b', 'aa']
      testStrings.forEach(str => {
        const nfaResult = simulateNFA(nfa, str)
        const dfaResult = simulateDFA(dfa, str)
        expect(dfaResult.accepted).toBe(nfaResult.accepted)
      })
    })

    it('accepts same strings as NFA for union', () => {
      const nfa = buildNFA(parse('a|b'))
      const dfa = nfaToDFA(nfa)

      const testStrings = ['', 'a', 'b', 'c', 'ab', 'ba']
      testStrings.forEach(str => {
        const nfaResult = simulateNFA(nfa, str)
        const dfaResult = simulateDFA(dfa, str)
        expect(dfaResult.accepted).toBe(nfaResult.accepted)
      })
    })

    it('accepts same strings as NFA for concatenation', () => {
      const nfa = buildNFA(parse('abc'))
      const dfa = nfaToDFA(nfa)

      const testStrings = ['', 'a', 'ab', 'abc', 'abcd', 'xyz']
      testStrings.forEach(str => {
        const nfaResult = simulateNFA(nfa, str)
        const dfaResult = simulateDFA(dfa, str)
        expect(dfaResult.accepted).toBe(nfaResult.accepted)
      })
    })

    it('accepts same strings as NFA for star', () => {
      const nfa = buildNFA(parse('a*'))
      const dfa = nfaToDFA(nfa)

      const testStrings = ['', 'a', 'aa', 'aaa', 'aaaa', 'b', 'ab']
      testStrings.forEach(str => {
        const nfaResult = simulateNFA(nfa, str)
        const dfaResult = simulateDFA(dfa, str)
        expect(dfaResult.accepted).toBe(nfaResult.accepted)
      })
    })

    it('accepts same strings as NFA for plus', () => {
      const nfa = buildNFA(parse('a+'))
      const dfa = nfaToDFA(nfa)

      const testStrings = ['', 'a', 'aa', 'aaa', 'b']
      testStrings.forEach(str => {
        const nfaResult = simulateNFA(nfa, str)
        const dfaResult = simulateDFA(dfa, str)
        expect(dfaResult.accepted).toBe(nfaResult.accepted)
      })
    })

    it('accepts same strings as NFA for optional', () => {
      const nfa = buildNFA(parse('a?'))
      const dfa = nfaToDFA(nfa)

      const testStrings = ['', 'a', 'aa', 'b']
      testStrings.forEach(str => {
        const nfaResult = simulateNFA(nfa, str)
        const dfaResult = simulateDFA(dfa, str)
        expect(dfaResult.accepted).toBe(nfaResult.accepted)
      })
    })

    it('accepts same strings as NFA for complex pattern', () => {
      const nfa = buildNFA(parse('(a|b)*abb'))
      const dfa = nfaToDFA(nfa)

      const testStrings = [
        '', 'a', 'ab', 'abb', 'aabb', 'babb', 'ababb',
        'abababb', 'aba', 'abba', 'abbb', 'xyz'
      ]
      testStrings.forEach(str => {
        const nfaResult = simulateNFA(nfa, str)
        const dfaResult = simulateDFA(dfa, str)
        expect(dfaResult.accepted).toBe(nfaResult.accepted)
      })
    })
  })

  describe('state minimization behavior', () => {
    it('may produce fewer states than NFA for simple patterns', () => {
      const nfa = buildNFA(parse('a'))
      const dfa = nfaToDFA(nfa)

      expect(dfa.states.length).toBeLessThanOrEqual(nfa.states.length)
    })

    it('handles epsilon-heavy NFAs', () => {
      const nfa = buildNFA(parse('(a|b|c|d)*'))
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(simulateDFA(dfa, 'abcd').accepted).toBe(true)
      expect(simulateDFA(dfa, 'dcba').accepted).toBe(true)
    })

    it('handles NFAs with many nondeterministic branches', () => {
      const nfa = buildNFA(parse('a|b|c|d|e|f'))
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(dfa.alphabet).toEqual(new Set(['a', 'b', 'c', 'd', 'e', 'f']))
    })
  })

  describe('structural properties', () => {
    it('preserves alphabet', () => {
      const nfa = buildNFA(parse('abc'))
      const dfa = nfaToDFA(nfa)

      expect(dfa.alphabet).toEqual(nfa.alphabet)
    })

    it('has single start state', () => {
      const nfa = buildNFA(parse('(a|b)*'))
      const dfa = nfaToDFA(nfa)

      expect(dfa.startState).toBeDefined()
      expect(dfa.states.find(s => s.id === dfa.startState)).toBeDefined()
    })

    it('has at least one accept state for accepting patterns', () => {
      const nfa = buildNFA(parse('a'))
      const dfa = nfaToDFA(nfa)

      expect(dfa.acceptStates.length).toBeGreaterThan(0)
      dfa.acceptStates.forEach(id => {
        expect(dfa.states.find(s => s.id === id)).toBeDefined()
      })
    })

    it('all transitions reference valid states', () => {
      const nfa = buildNFA(parse('(a|b)*ab'))
      const dfa = nfaToDFA(nfa)

      const stateIds = new Set(dfa.states.map(s => s.id))
      dfa.transitions.forEach(t => {
        expect(stateIds.has(t.from)).toBe(true)
        expect(stateIds.has(t.to)).toBe(true)
      })
    })

    it('transitions only on alphabet symbols', () => {
      const nfa = buildNFA(parse('abc'))
      const dfa = nfaToDFA(nfa)

      dfa.transitions.forEach(t => {
        expect(t.symbol).not.toBeNull()
        expect(dfa.alphabet.has(t.symbol as string)).toBe(true)
      })
    })
  })

  describe('accept states', () => {
    it('correctly identifies accept states for simple pattern', () => {
      const nfa = buildNFA(parse('a'))
      const dfa = nfaToDFA(nfa)

      expect(simulateDFA(dfa, 'a').accepted).toBe(true)
      expect(dfa.acceptStates.length).toBeGreaterThan(0)
    })

    it('correctly identifies accept states for star', () => {
      const nfa = buildNFA(parse('a*'))
      const dfa = nfaToDFA(nfa)

      expect(simulateDFA(dfa, '').accepted).toBe(true)
      const startStateIsAccept = dfa.acceptStates.includes(dfa.startState)
      expect(startStateIsAccept).toBe(true)
    })

    it('start state is accept for empty string pattern', () => {
      const nfa = buildNFA(parse('ε'))
      const dfa = nfaToDFA(nfa)

      expect(dfa.acceptStates.includes(dfa.startState)).toBe(true)
      expect(simulateDFA(dfa, '').accepted).toBe(true)
    })

    it('correctly handles patterns with multiple accept paths', () => {
      const nfa = buildNFA(parse('a|aa'))
      const dfa = nfaToDFA(nfa)

      expect(simulateDFA(dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(dfa, 'aa').accepted).toBe(true)
    })
  })

  describe('complex patterns', () => {
    it('converts pattern with all operators', () => {
      const nfa = buildNFA(parse('(a|b)*c+d?'))
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(simulateDFA(dfa, 'c').accepted).toBe(true)
      expect(simulateDFA(dfa, 'cd').accepted).toBe(true)
      expect(simulateDFA(dfa, 'abc').accepted).toBe(true)
      expect(simulateDFA(dfa, 'abcccd').accepted).toBe(true)
    })

    it('converts deeply nested pattern', () => {
      const nfa = buildNFA(parse('((a|b)(c|d))*'))
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(simulateDFA(dfa, '').accepted).toBe(true)
      expect(simulateDFA(dfa, 'ac').accepted).toBe(true)
      expect(simulateDFA(dfa, 'bdac').accepted).toBe(true)
    })

    it('converts pattern with repeated subpatterns', () => {
      const nfa = buildNFA(parse('(ab)+cd'))
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(simulateDFA(dfa, 'abcd').accepted).toBe(true)
      expect(simulateDFA(dfa, 'ababcd').accepted).toBe(true)
      expect(simulateDFA(dfa, 'cd').accepted).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('handles empty alphabet pattern', () => {
      const nfa = buildNFA(parse('ε'))
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(simulateDFA(dfa, '').accepted).toBe(true)
      expect(simulateDFA(dfa, 'a').accepted).toBe(false)
    })

    it('handles single state NFA', () => {
      const nfa = buildNFA(parse('ε'))
      const dfa = nfaToDFA(nfa)

      expect(dfa.states.length).toBeGreaterThan(0)
      expect(isDeterministic(dfa)).toBe(true)
    })

    it('handles NFA with many epsilon transitions', () => {
      const nfa = buildNFA(parse('(a*|b*)*'))
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(simulateDFA(dfa, '').accepted).toBe(true)
      expect(simulateDFA(dfa, 'aaa').accepted).toBe(true)
      expect(simulateDFA(dfa, 'bbb').accepted).toBe(true)
      expect(simulateDFA(dfa, 'aaabbb').accepted).toBe(true)
    })

    it('handles long patterns', () => {
      const nfa = buildNFA(parse('abcdefgh'))
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(simulateDFA(dfa, 'abcdefgh').accepted).toBe(true)
      expect(simulateDFA(dfa, 'abcdefg').accepted).toBe(false)
    })
  })

  describe('performance characteristics', () => {
    it('handles moderate complexity without exponential blowup', () => {
      const nfa = buildNFA(parse('(a|b)(c|d)(e|f)'))
      const dfa = nfaToDFA(nfa)

      expect(dfa.states.length).toBeLessThan(50)
      expect(isDeterministic(dfa)).toBe(true)
    })

    it('handles star patterns efficiently', () => {
      const nfa = buildNFA(parse('a*b*c*'))
      const dfa = nfaToDFA(nfa)

      expect(isDeterministic(dfa)).toBe(true)
      expect(simulateDFA(dfa, '').accepted).toBe(true)
      expect(simulateDFA(dfa, 'aabbcc').accepted).toBe(true)
    })
  })

  describe('consistency checks', () => {
    it('validates DFA structure', () => {
      const patterns = ['a', 'a|b', 'a*', 'a+', 'a?', '(a|b)*abb', 'abc']

      patterns.forEach(pattern => {
        const nfa = buildNFA(parse(pattern))
        const dfa = nfaToDFA(nfa)

        expect(() => validateDFA(dfa)).not.toThrow()
      })
    })

    it('maintains all required DFA properties', () => {
      const nfa = buildNFA(parse('(a|b)*'))
      const dfa = nfaToDFA(nfa)

      expect(dfa.states).toBeDefined()
      expect(dfa.transitions).toBeDefined()
      expect(dfa.startState).toBeDefined()
      expect(dfa.acceptStates).toBeDefined()
      expect(dfa.alphabet).toBeDefined()
      expect(Array.isArray(dfa.states)).toBe(true)
      expect(Array.isArray(dfa.transitions)).toBe(true)
      expect(Array.isArray(dfa.acceptStates)).toBe(true)
      expect(dfa.alphabet instanceof Set).toBe(true)
    })
  })
})
