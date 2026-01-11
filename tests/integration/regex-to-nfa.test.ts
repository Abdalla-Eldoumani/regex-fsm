import { describe, it, expect } from 'vitest'
import { parse } from '@/core/regex/parser'
import { buildNFA } from '@/core/algorithms/thompson'
import { simulateNFA } from '@/core/algorithms/simulate'
import { assertNFAValid } from '../utils'

describe('regex to NFA integration', () => {
  describe('simple patterns', () => {
    it('converts single symbol and accepts matching string', () => {
      const regex = 'a'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      const result1 = simulateNFA(nfa, 'a')
      expect(result1.accepted).toBe(true)

      const result2 = simulateNFA(nfa, 'b')
      expect(result2.accepted).toBe(false)

      const result3 = simulateNFA(nfa, '')
      expect(result3.accepted).toBe(false)
    })

    it('converts empty string pattern', () => {
      const regex = 'ε'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      const result1 = simulateNFA(nfa, '')
      expect(result1.accepted).toBe(true)

      const result2 = simulateNFA(nfa, 'a')
      expect(result2.accepted).toBe(false)
    })

    it('converts concatenation pattern', () => {
      const regex = 'abc'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      expect(simulateNFA(nfa, 'abc').accepted).toBe(true)
      expect(simulateNFA(nfa, 'ab').accepted).toBe(false)
      expect(simulateNFA(nfa, 'abcd').accepted).toBe(false)
      expect(simulateNFA(nfa, '').accepted).toBe(false)
    })
  })

  describe('union patterns', () => {
    it('converts simple union', () => {
      const regex = 'a|b'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      expect(simulateNFA(nfa, 'a').accepted).toBe(true)
      expect(simulateNFA(nfa, 'b').accepted).toBe(true)
      expect(simulateNFA(nfa, 'c').accepted).toBe(false)
      expect(simulateNFA(nfa, 'ab').accepted).toBe(false)
      expect(simulateNFA(nfa, '').accepted).toBe(false)
    })

    it('converts multi-way union', () => {
      const regex = 'a|b|c|d'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      expect(simulateNFA(nfa, 'a').accepted).toBe(true)
      expect(simulateNFA(nfa, 'b').accepted).toBe(true)
      expect(simulateNFA(nfa, 'c').accepted).toBe(true)
      expect(simulateNFA(nfa, 'd').accepted).toBe(true)
      expect(simulateNFA(nfa, 'e').accepted).toBe(false)
    })

    it('converts union with concatenation', () => {
      const regex = 'ab|cd'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      expect(simulateNFA(nfa, 'ab').accepted).toBe(true)
      expect(simulateNFA(nfa, 'cd').accepted).toBe(true)
      expect(simulateNFA(nfa, 'a').accepted).toBe(false)
      expect(simulateNFA(nfa, 'c').accepted).toBe(false)
      expect(simulateNFA(nfa, 'abcd').accepted).toBe(false)
    })
  })

  describe('kleene star patterns', () => {
    it('converts simple star', () => {
      const regex = 'a*'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      expect(simulateNFA(nfa, '').accepted).toBe(true)
      expect(simulateNFA(nfa, 'a').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aa').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aaa').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aaaaaaaaaa').accepted).toBe(true)
      expect(simulateNFA(nfa, 'b').accepted).toBe(false)
      expect(simulateNFA(nfa, 'ab').accepted).toBe(false)
    })

    it('converts star with concatenation', () => {
      const regex = 'a*b'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      expect(simulateNFA(nfa, 'b').accepted).toBe(true)
      expect(simulateNFA(nfa, 'ab').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aab').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aaab').accepted).toBe(true)
      expect(simulateNFA(nfa, 'a').accepted).toBe(false)
      expect(simulateNFA(nfa, '').accepted).toBe(false)
    })

    it('converts grouped star', () => {
      const regex = '(ab)*'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      expect(simulateNFA(nfa, '').accepted).toBe(true)
      expect(simulateNFA(nfa, 'ab').accepted).toBe(true)
      expect(simulateNFA(nfa, 'abab').accepted).toBe(true)
      expect(simulateNFA(nfa, 'ababab').accepted).toBe(true)
      expect(simulateNFA(nfa, 'a').accepted).toBe(false)
      expect(simulateNFA(nfa, 'aba').accepted).toBe(false)
    })

    it('converts union star', () => {
      const regex = '(a|b)*'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      expect(simulateNFA(nfa, '').accepted).toBe(true)
      expect(simulateNFA(nfa, 'a').accepted).toBe(true)
      expect(simulateNFA(nfa, 'b').accepted).toBe(true)
      expect(simulateNFA(nfa, 'ab').accepted).toBe(true)
      expect(simulateNFA(nfa, 'ba').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aabbba').accepted).toBe(true)
      expect(simulateNFA(nfa, 'c').accepted).toBe(false)
      expect(simulateNFA(nfa, 'abc').accepted).toBe(false)
    })
  })

  describe('positive closure patterns', () => {
    it('converts simple plus', () => {
      const regex = 'a+'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      expect(simulateNFA(nfa, '').accepted).toBe(false)
      expect(simulateNFA(nfa, 'a').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aa').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aaa').accepted).toBe(true)
      expect(simulateNFA(nfa, 'b').accepted).toBe(false)
    })

    it('converts plus with concatenation', () => {
      const regex = 'a+b+'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      expect(simulateNFA(nfa, 'ab').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aab').accepted).toBe(true)
      expect(simulateNFA(nfa, 'abb').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aaabbb').accepted).toBe(true)
      expect(simulateNFA(nfa, 'a').accepted).toBe(false)
      expect(simulateNFA(nfa, 'b').accepted).toBe(false)
      expect(simulateNFA(nfa, '').accepted).toBe(false)
    })

    it('converts grouped plus', () => {
      const regex = '(ab)+'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      expect(simulateNFA(nfa, '').accepted).toBe(false)
      expect(simulateNFA(nfa, 'ab').accepted).toBe(true)
      expect(simulateNFA(nfa, 'abab').accepted).toBe(true)
      expect(simulateNFA(nfa, 'ababab').accepted).toBe(true)
      expect(simulateNFA(nfa, 'a').accepted).toBe(false)
    })
  })

  describe('optional patterns', () => {
    it('converts simple optional', () => {
      const regex = 'a?'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      expect(simulateNFA(nfa, '').accepted).toBe(true)
      expect(simulateNFA(nfa, 'a').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aa').accepted).toBe(false)
      expect(simulateNFA(nfa, 'b').accepted).toBe(false)
    })

    it('converts optional with concatenation', () => {
      const regex = 'a?b'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      expect(simulateNFA(nfa, 'b').accepted).toBe(true)
      expect(simulateNFA(nfa, 'ab').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aab').accepted).toBe(false)
      expect(simulateNFA(nfa, 'a').accepted).toBe(false)
    })

    it('converts grouped optional', () => {
      const regex = '(ab)?'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      expect(simulateNFA(nfa, '').accepted).toBe(true)
      expect(simulateNFA(nfa, 'ab').accepted).toBe(true)
      expect(simulateNFA(nfa, 'abab').accepted).toBe(false)
      expect(simulateNFA(nfa, 'a').accepted).toBe(false)
    })
  })

  describe('complex patterns', () => {
    it('converts classic pattern (a|b)*abb', () => {
      const regex = '(a|b)*abb'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      expect(simulateNFA(nfa, 'abb').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aabb').accepted).toBe(true)
      expect(simulateNFA(nfa, 'babb').accepted).toBe(true)
      expect(simulateNFA(nfa, 'abababb').accepted).toBe(true)
      expect(simulateNFA(nfa, 'ab').accepted).toBe(false)
      expect(simulateNFA(nfa, 'aba').accepted).toBe(false)
      expect(simulateNFA(nfa, '').accepted).toBe(false)
    })

    it('converts pattern with multiple operators', () => {
      const regex = 'a+b*c?'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      expect(simulateNFA(nfa, 'a').accepted).toBe(true)
      expect(simulateNFA(nfa, 'ab').accepted).toBe(true)
      expect(simulateNFA(nfa, 'ac').accepted).toBe(true)
      expect(simulateNFA(nfa, 'abc').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aabb').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aabbc').accepted).toBe(true)
      expect(simulateNFA(nfa, '').accepted).toBe(false)
      expect(simulateNFA(nfa, 'b').accepted).toBe(false)
    })

    it('converts nested groups', () => {
      const regex = '((a|b)(c|d))*'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      expect(simulateNFA(nfa, '').accepted).toBe(true)
      expect(simulateNFA(nfa, 'ac').accepted).toBe(true)
      expect(simulateNFA(nfa, 'ad').accepted).toBe(true)
      expect(simulateNFA(nfa, 'bc').accepted).toBe(true)
      expect(simulateNFA(nfa, 'bd').accepted).toBe(true)
      expect(simulateNFA(nfa, 'acbd').accepted).toBe(true)
      expect(simulateNFA(nfa, 'bdac').accepted).toBe(true)
      expect(simulateNFA(nfa, 'a').accepted).toBe(false)
      expect(simulateNFA(nfa, 'ab').accepted).toBe(false)
    })

    it('converts pattern with all operators', () => {
      const regex = '(a|b)*c+d?e'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)

      expect(simulateNFA(nfa, 'ce').accepted).toBe(true)
      expect(simulateNFA(nfa, 'cde').accepted).toBe(true)
      expect(simulateNFA(nfa, 'ace').accepted).toBe(true)
      expect(simulateNFA(nfa, 'bcde').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aabccde').accepted).toBe(true)
      expect(simulateNFA(nfa, 'e').accepted).toBe(false)
      expect(simulateNFA(nfa, 'cd').accepted).toBe(false)
    })
  })

  describe('alphabet construction', () => {
    it('builds correct alphabet for single symbol', () => {
      const nfa = buildNFA(parse('a'))
      expect(nfa.alphabet).toEqual(new Set(['a']))
    })

    it('builds correct alphabet for concatenation', () => {
      const nfa = buildNFA(parse('abc'))
      expect(nfa.alphabet).toEqual(new Set(['a', 'b', 'c']))
    })

    it('builds correct alphabet for union', () => {
      const nfa = buildNFA(parse('a|b|c'))
      expect(nfa.alphabet).toEqual(new Set(['a', 'b', 'c']))
    })

    it('builds correct alphabet with duplicate symbols', () => {
      const nfa = buildNFA(parse('aa'))
      expect(nfa.alphabet).toEqual(new Set(['a']))
    })

    it('builds empty alphabet for epsilon', () => {
      const nfa = buildNFA(parse('ε'))
      expect(nfa.alphabet.size).toBe(0)
    })
  })

  describe('structural properties', () => {
    it('ensures single start state', () => {
      const nfa = buildNFA(parse('(a|b)*'))
      expect(nfa.startState).toBeDefined()
      expect(nfa.states.find(s => s.id === nfa.startState)).toBeDefined()
    })

    it('ensures at least one accept state', () => {
      const nfa = buildNFA(parse('abc'))
      expect(nfa.acceptStates.length).toBeGreaterThan(0)
      nfa.acceptStates.forEach(id => {
        expect(nfa.states.find(s => s.id === id)).toBeDefined()
      })
    })

    it('all transitions reference valid states', () => {
      const nfa = buildNFA(parse('(a|b)*abb'))
      const stateIds = new Set(nfa.states.map(s => s.id))

      nfa.transitions.forEach(t => {
        expect(stateIds.has(t.from)).toBe(true)
        expect(stateIds.has(t.to)).toBe(true)
      })
    })

    it('maintains reasonable state count for simple patterns', () => {
      const nfa1 = buildNFA(parse('a'))
      expect(nfa1.states.length).toBeLessThanOrEqual(4)

      const nfa2 = buildNFA(parse('ab'))
      expect(nfa2.states.length).toBeLessThanOrEqual(8)
    })
  })

  describe('edge cases', () => {
    it('handles very long concatenation', () => {
      const regex = 'abcdefghij'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)
      expect(simulateNFA(nfa, 'abcdefghij').accepted).toBe(true)
    })

    it('handles deeply nested groups', () => {
      const regex = '(((a)))'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)
      expect(simulateNFA(nfa, 'a').accepted).toBe(true)
    })

    it('handles multiple stars', () => {
      const regex = 'a*b*c*'
      const ast = parse(regex)
      const nfa = buildNFA(ast)

      assertNFAValid(nfa)
      expect(simulateNFA(nfa, '').accepted).toBe(true)
      expect(simulateNFA(nfa, 'abc').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aabbcc').accepted).toBe(true)
    })
  })
})
