import { describe, it, expect } from 'vitest'
import { brzozowskiDFA } from '@/core/algorithms/brzozowski'
import { parse } from '@/core/regex/parser'
import { simulateDFA } from '@/core/algorithms/simulate'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { isDeterministic } from '@/core/automata/dfa'
import { TooLargeError, BOUNDS } from '@/core/automata/types'

describe('Brzozowski derivative DFA construction', () => {
  describe('basic patterns', () => {
    it('handles single symbol', () => {
      const ast = parse('a')
      const result = brzozowskiDFA(ast, new Set(['a', 'b']))
      expect(result.dfa.states.length).toBeGreaterThan(0)
      expect(isDeterministic(result.dfa)).toBe(true)
      expect(simulateDFA(result.dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'b').accepted).toBe(false)
      expect(simulateDFA(result.dfa, '').accepted).toBe(false)
    })

    it('handles union a|b', () => {
      const ast = parse('a|b')
      const result = brzozowskiDFA(ast, new Set(['a', 'b']))
      expect(isDeterministic(result.dfa)).toBe(true)
      expect(simulateDFA(result.dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'b').accepted).toBe(true)
      expect(simulateDFA(result.dfa, '').accepted).toBe(false)
      expect(simulateDFA(result.dfa, 'ab').accepted).toBe(false)
    })

    it('handles concatenation ab', () => {
      const ast = parse('ab')
      const result = brzozowskiDFA(ast, new Set(['a', 'b']))
      expect(isDeterministic(result.dfa)).toBe(true)
      expect(simulateDFA(result.dfa, 'ab').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'a').accepted).toBe(false)
      expect(simulateDFA(result.dfa, 'b').accepted).toBe(false)
      expect(simulateDFA(result.dfa, '').accepted).toBe(false)
    })

    it('handles Kleene star a*', () => {
      const ast = parse('a*')
      const result = brzozowskiDFA(ast, new Set(['a', 'b']))
      expect(isDeterministic(result.dfa)).toBe(true)
      expect(simulateDFA(result.dfa, '').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'aaa').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'b').accepted).toBe(false)
    })

    it('handles positive closure a+', () => {
      const ast = parse('a+')
      const result = brzozowskiDFA(ast, new Set(['a', 'b']))
      expect(simulateDFA(result.dfa, '').accepted).toBe(false)
      expect(simulateDFA(result.dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'aaa').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'b').accepted).toBe(false)
    })

    it('handles optional a?', () => {
      const ast = parse('a?')
      const result = brzozowskiDFA(ast, new Set(['a', 'b']))
      expect(simulateDFA(result.dfa, '').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'aa').accepted).toBe(false)
    })

    it('handles empty string λ', () => {
      const ast = parse('λ')
      const result = brzozowskiDFA(ast, new Set(['a']))
      expect(simulateDFA(result.dfa, '').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'a').accepted).toBe(false)
    })
  })

  describe('complex patterns', () => {
    it('handles (a|b)*abb', () => {
      const ast = parse('(a|b)*abb')
      const result = brzozowskiDFA(ast, new Set(['a', 'b']))
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
      const result = brzozowskiDFA(ast, new Set(['a', 'b']))
      expect(simulateDFA(result.dfa, '').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'b').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'aabb').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'ba').accepted).toBe(false)
    })

    it('handles (ab)+', () => {
      const ast = parse('(ab)+')
      const result = brzozowskiDFA(ast, new Set(['a', 'b']))
      expect(simulateDFA(result.dfa, '').accepted).toBe(false)
      expect(simulateDFA(result.dfa, 'ab').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'abab').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'a').accepted).toBe(false)
      expect(simulateDFA(result.dfa, 'ba').accepted).toBe(false)
    })

    it('handles a?b', () => {
      const ast = parse('a?b')
      const result = brzozowskiDFA(ast, new Set(['a', 'b']))
      expect(simulateDFA(result.dfa, 'b').accepted).toBe(true)
      expect(simulateDFA(result.dfa, 'ab').accepted).toBe(true)
      expect(simulateDFA(result.dfa, '').accepted).toBe(false)
      expect(simulateDFA(result.dfa, 'aab').accepted).toBe(false)
    })
  })

  describe('result metadata', () => {
    it('provides state expressions', () => {
      const ast = parse('a|b')
      const result = brzozowskiDFA(ast, new Set(['a', 'b']))
      expect(result.stateExpressions.size).toBeGreaterThan(0)
    })

    it('provides derivative log', () => {
      const ast = parse('a')
      const result = brzozowskiDFA(ast, new Set(['a', 'b']))
      expect(result.derivatives.length).toBeGreaterThan(0)
      expect(result.derivatives[0]).toHaveProperty('fromState')
      expect(result.derivatives[0]).toHaveProperty('symbol')
      expect(result.derivatives[0]).toHaveProperty('derivative')
      expect(result.derivatives[0]).toHaveProperty('simplified')
      expect(result.derivatives[0]).toHaveProperty('toState')
    })

    it('provides description', () => {
      const ast = parse('a|b')
      const result = brzozowskiDFA(ast, new Set(['a', 'b']))
      expect(result.description).toContain('Brzozowski')
    })
  })

  describe('DFA completeness', () => {
    it('every state has transitions for all alphabet symbols', () => {
      const ast = parse('(a|b)*abb')
      const result = brzozowskiDFA(ast, new Set(['a', 'b']))
      const { dfa } = result
      for (const state of dfa.states) {
        const outgoing = dfa.transitions.filter(t => t.from === state.id)
        const symbols = new Set(outgoing.map(t => t.symbol))
        expect(symbols).toEqual(dfa.alphabet)
      }
    })

    it('has trap state with self-loops when needed', () => {
      const ast = parse('a')
      const result = brzozowskiDFA(ast, new Set(['a', 'b']))
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
        const brzResult = brzozowskiDFA(ast, alphabet)

        for (const str of strings) {
          const thompsonAccepts = simulateDFA(thompsonDfa, str).accepted
          const brzAccepts = simulateDFA(brzResult.dfa, str).accepted
          expect(brzAccepts).toBe(thompsonAccepts)
        }
      })
    })
  })

  // SAFETY-01: the cap must fire on a known blow-up and stay dormant for small inputs.
  //
  // The L_9 language over {0,1}: strings where the 9th-from-last character is '1'.
  // Its minimal DFA has exactly 2^9 = 512 states (the Myhill-Nerode classes are
  // the 512 possible values of the last 9 characters seen so far). Brzozowski
  // constructs the minimal DFA, so it reaches exactly 512 derivative classes,
  // well above BOUNDS.MAX_DFA_STATES = 256. This is the canonical blow-up proof.
  // Regex: (0|1)* 1 (0|1)(0|1)(0|1)(0|1)(0|1)(0|1)(0|1)(0|1)
  describe('SAFETY-01: TooLargeError on blow-up', () => {
    it('throws TooLargeError with reason state-cap when DFA would exceed BOUNDS.MAX_DFA_STATES', () => {
      // L_9 over {0,1}: the 9th-from-last symbol is 1. Minimal DFA = 512 states.
      const repeatSuffix = '(0|1)'.repeat(8)
      const blowupRegex = `(0|1)*1${repeatSuffix}`
      const alphabet = new Set(['0', '1'])
      const ast = parse(blowupRegex)

      expect(() => brzozowskiDFA(ast, alphabet)).toThrow(TooLargeError)
      expect(() => brzozowskiDFA(ast, alphabet)).toThrow(/too large/i)
      try {
        brzozowskiDFA(ast, alphabet)
      } catch (err) {
        expect(err).toBeInstanceOf(TooLargeError)
        expect((err as TooLargeError).reason).toBe('state-cap')
        expect((err as TooLargeError).limit).toBe(BOUNDS.MAX_DFA_STATES)
      }
    })

    it('does NOT throw for small patterns that stay well under BOUNDS.MAX_DFA_STATES', () => {
      const smallRegexes = ['a', 'ab', 'a|b', 'a*', '(a|b)*abb', 'a*b+c?']
      const alphabet = new Set(['a', 'b', 'c'])
      for (const regex of smallRegexes) {
        const ast = parse(regex)
        let result: ReturnType<typeof brzozowskiDFA> | undefined
        expect(() => { result = brzozowskiDFA(ast, alphabet) }, `"${regex}" should not throw`).not.toThrow()
        expect(result!.dfa.states.length).toBeLessThan(BOUNDS.MAX_DFA_STATES)
      }
    })
  })
})
