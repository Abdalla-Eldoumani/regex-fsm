import { describe, it, expect } from 'vitest'
import { asuDirectDFA } from '@/core/algorithms/asuDirect'
import { parse } from '@/core/regex/parser'
import { simulateDFA } from '@/core/algorithms/simulate'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { isDeterministic } from '@/core/automata/dfa'

describe('ASU direct regex-to-DFA construction', () => {
  describe('basic patterns', () => {
    it('handles single symbol', () => {
      const ast = parse('a')
      const result = asuDirectDFA(ast, new Set(['a', 'b']))
      expect(result.dfa.states.length).toBeGreaterThan(0)
      expect(isDeterministic(result.dfa)).toBe(true)
      expect(simulateDFA(result.dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'b').accepted).toBe(false)
      expect(simulateDFA(result.dfa, '').accepted).toBe(false)
    })

    it('handles union a|b', () => {
      const ast = parse('a|b')
      const result = asuDirectDFA(ast, new Set(['a', 'b']))
      expect(isDeterministic(result.dfa)).toBe(true)
      expect(simulateDFA(result.dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'b').accepted).toBe(true)
      expect(simulateDFA(result.dfa, '').accepted).toBe(false)
      expect(simulateDFA(result.dfa, 'ab').accepted).toBe(false)
    })

    it('handles concatenation ab', () => {
      const ast = parse('ab')
      const result = asuDirectDFA(ast, new Set(['a', 'b']))
      expect(isDeterministic(result.dfa)).toBe(true)
      expect(simulateDFA(result.dfa, 'ab').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'a').accepted).toBe(false)
      expect(simulateDFA(result.dfa, 'b').accepted).toBe(false)
      expect(simulateDFA(result.dfa, '').accepted).toBe(false)
    })

    it('handles Kleene star a*', () => {
      const ast = parse('a*')
      const result = asuDirectDFA(ast, new Set(['a', 'b']))
      expect(isDeterministic(result.dfa)).toBe(true)
      expect(simulateDFA(result.dfa, '').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'aaa').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'b').accepted).toBe(false)
    })

    it('handles positive closure a+', () => {
      const ast = parse('a+')
      const result = asuDirectDFA(ast, new Set(['a', 'b']))
      expect(simulateDFA(result.dfa, '').accepted).toBe(false)
      expect(simulateDFA(result.dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'aaa').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'b').accepted).toBe(false)
    })

    it('handles optional a?', () => {
      const ast = parse('a?')
      const result = asuDirectDFA(ast, new Set(['a', 'b']))
      expect(simulateDFA(result.dfa, '').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'aa').accepted).toBe(false)
    })

    it('handles empty string λ', () => {
      const ast = parse('λ')
      const result = asuDirectDFA(ast, new Set(['a']))
      expect(simulateDFA(result.dfa, '').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'a').accepted).toBe(false)
    })
  })

  describe('complex patterns', () => {
    it('handles (a|b)*abb', () => {
      const ast = parse('(a|b)*abb')
      const result = asuDirectDFA(ast, new Set(['a', 'b']))
      expect(isDeterministic(result.dfa)).toBe(true)
      expect(simulateDFA(result.dfa, 'abb').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'aabb').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'babb').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'ababb').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'ab').accepted).toBe(false)
      expect(simulateDFA(result.dfa, 'aab').accepted).toBe(false)
      expect(simulateDFA(result.dfa, '').accepted).toBe(false)
    })

    it('handles a*b*', () => {
      const ast = parse('a*b*')
      const result = asuDirectDFA(ast, new Set(['a', 'b']))
      expect(simulateDFA(result.dfa, '').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'b').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'aabb').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'ba').accepted).toBe(false)
    })

    it('handles (ab)+', () => {
      const ast = parse('(ab)+')
      const result = asuDirectDFA(ast, new Set(['a', 'b']))
      expect(simulateDFA(result.dfa, '').accepted).toBe(false)
      expect(simulateDFA(result.dfa, 'ab').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'abab').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'a').accepted).toBe(false)
      expect(simulateDFA(result.dfa, 'ba').accepted).toBe(false)
    })

    it('handles a?b', () => {
      const ast = parse('a?b')
      const result = asuDirectDFA(ast, new Set(['a', 'b']))
      expect(simulateDFA(result.dfa, 'b').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'ab').accepted).toBe(true)
      expect(simulateDFA(result.dfa, '').accepted).toBe(false)
      expect(simulateDFA(result.dfa, 'aab').accepted).toBe(false)
    })
  })

  describe('result metadata', () => {
    it('provides position map', () => {
      const ast = parse('ab')
      const result = asuDirectDFA(ast, new Set(['a', 'b']))
      // positions: 0=a, 1=b, 2=#
      expect(result.positions.get(0)).toBe('a')
      expect(result.positions.get(1)).toBe('b')
      expect(result.positions.get(2)).toBe('#')
    })

    it('provides followpos data', () => {
      const ast = parse('a')
      const result = asuDirectDFA(ast, new Set(['a']))
      expect(result.followpos).toBeDefined()
      expect(result.followpos.size).toBeGreaterThan(0)
    })

    it('provides description', () => {
      const ast = parse('a|b')
      const result = asuDirectDFA(ast, new Set(['a', 'b']))
      expect(result.description).toContain('ASU')
    })
  })

  describe('DFA completeness', () => {
    it('every state has transitions for all alphabet symbols', () => {
      const ast = parse('(a|b)*abb')
      const result = asuDirectDFA(ast, new Set(['a', 'b']))
      const { dfa } = result
      for (const state of dfa.states) {
        const outgoing = dfa.transitions.filter(t => t.from === state.id)
        const symbols = new Set(outgoing.map(t => t.symbol))
        expect(symbols).toEqual(dfa.alphabet)
      }
    })

    it('has trap state with self-loops when needed', () => {
      const ast = parse('a')
      const result = asuDirectDFA(ast, new Set(['a', 'b']))
      const { dfa } = result
      const trapState = dfa.states.find(s => s.id === '∅')
      if (trapState) {
        const trapSelfLoops = dfa.transitions.filter(
          t => t.from === '∅' && t.to === '∅'
        )
        expect(trapSelfLoops.length).toBe(dfa.alphabet.size)
      }
    })
  })

  describe('equivalence with Thompson+Subset pipeline', () => {
    const testCases = [
      { regex: 'a', strings: ['', 'a', 'b', 'aa'] },
      { regex: 'a|b', strings: ['', 'a', 'b', 'ab', 'c'] },
      { regex: '(a|b)*abb', strings: ['', 'abb', 'aabb', 'babb', 'ab', 'aab'] },
      { regex: 'a*b*', strings: ['', 'a', 'b', 'aabb', 'ba', 'aaabbb'] },
      { regex: '(ab)+', strings: ['', 'ab', 'abab', 'a', 'ba', 'aba'] },
      { regex: 'a?b', strings: ['', 'b', 'ab', 'aab', 'a'] },
    ]

    testCases.forEach(({ regex, strings }) => {
      it(`produces equivalent DFA for "${regex}"`, () => {
        const ast = parse(regex)
        const alphabet = new Set<string>()
        function collectAlpha(node: typeof ast): void {
          if (node.type === 'symbol') alphabet.add(node.value)
          if ('left' in node && node.left) collectAlpha(node.left)
          if ('right' in node && node.right) collectAlpha(node.right)
          if ('child' in node && node.child) collectAlpha(node.child)
        }
        collectAlpha(ast)

        const nfa = buildNFA(ast)
        const thompsonDfa = nfaToDFA(nfa, alphabet)
        const asuResult = asuDirectDFA(ast, alphabet)

        for (const str of strings) {
          const thompsonAccepts = simulateDFA(thompsonDfa, str).accepted
          const asuAccepts = simulateDFA(asuResult.dfa, str).accepted
          expect(asuAccepts).toBe(thompsonAccepts)
        }
      })
    })
  })
})
