import { describe, it, expect } from 'vitest'
import { tokenize } from '@/core/regex/tokenizer'
import { parse } from '@/core/regex/parser'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateNFA, simulateDFA } from '@/core/algorithms/simulate'

describe('end-to-end integration', () => {
  describe('complete pipeline', () => {
    it('processes simple regex from string to acceptance', () => {
      const regex = 'a'

      const tokens = tokenize(regex)
      expect(tokens.length).toBeGreaterThan(0)

      const ast = parse(regex)
      expect(ast).toBeDefined()

      const nfa = buildNFA(ast)
      expect(nfa.states.length).toBeGreaterThan(0)

      const dfa = nfaToDFA(nfa)
      expect(dfa.states.length).toBeGreaterThan(0)

      const nfaResult = simulateNFA(nfa, 'a')
      const dfaResult = simulateDFA(dfa, 'a')

      expect(nfaResult.accepted).toBe(true)
      expect(dfaResult.accepted).toBe(true)
      expect(nfaResult.accepted).toBe(dfaResult.accepted)
    })

    it('processes complex regex through entire pipeline', () => {
      const regex = '(a|b)*abb'

      const ast = parse(regex)
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      const testCases = [
        { input: 'abb', expected: true },
        { input: 'aabb', expected: true },
        { input: 'babb', expected: true },
        { input: 'abababb', expected: true },
        { input: 'ab', expected: false },
        { input: 'aba', expected: false },
        { input: '', expected: false },
      ]

      testCases.forEach(({ input, expected }) => {
        const nfaResult = simulateNFA(nfa, input)
        const dfaResult = simulateDFA(dfa, input)

        expect(nfaResult.accepted).toBe(expected)
        expect(dfaResult.accepted).toBe(expected)
      })
    })

    // Regression for the 03-01 parse fix: + between operands is union (course
    // PDF Def 3.9), so the + at c+d binds as union, not closure on c.
    // (a|b)*c+d?e = union((a|b)*c, d?e). Hand-derived language:
    //   left  arm L((a|b)*c) = any string of a's and b's ending in a single c
    //   right arm L(d?e)     = {e, de}
    // The old expectations assumed c+ was positive closure followed by d?e and
    // are now WRONG: ce/cde/cccde/ace/bcde/aabccde are in NEITHER arm, so they reject.
    it('handles all regex operators in single pattern: union((a|b)*c, d?e)', () => {
      const regex = '(a|b)*c+d?e'

      const ast = parse(regex)
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      const testCases = [
        // left arm: (a|b)* then a final c
        { input: 'c', expected: true },
        { input: 'ac', expected: true },
        { input: 'bc', expected: true },
        { input: 'aabc', expected: true },
        { input: 'abababc', expected: true },
        // right arm: d?e
        { input: 'e', expected: true },
        { input: 'de', expected: true },
        // in neither arm (these were the old misparse's accepts)
        { input: 'ce', expected: false },
        { input: 'cde', expected: false },
        { input: 'cccde', expected: false },
        { input: 'ace', expected: false },
        { input: 'bcde', expected: false },
        { input: 'aabccde', expected: false },
        { input: '', expected: false },
      ]

      testCases.forEach(({ input, expected }) => {
        const nfaResult = simulateNFA(nfa, input)
        const dfaResult = simulateDFA(dfa, input)

        expect(nfaResult.accepted).toBe(expected)
        expect(dfaResult.accepted).toBe(expected)
      })
    })
  })

  describe('simulation correctness', () => {
    it('NFA and DFA produce identical results for all test strings', () => {
      const patterns = [
        'a',
        'ab',
        'a|b',
        'a*',
        'a+',
        'a?',
        '(a|b)*',
        '(a|b)*abb',
        'a+b+c+',
        '(ab|cd)*',
      ]

      const testStrings = ['', 'a', 'b', 'ab', 'abb', 'abc', 'aaa', 'abab']

      patterns.forEach(pattern => {
        const nfa = buildNFA(parse(pattern))
        const dfa = nfaToDFA(nfa)

        testStrings.forEach(str => {
          const nfaResult = simulateNFA(nfa, str)
          const dfaResult = simulateDFA(dfa, str)

          expect(dfaResult.accepted).toBe(nfaResult.accepted)
        })
      })
    })

    it('produces detailed step information during simulation', () => {
      const regex = 'ab'
      const nfa = buildNFA(parse(regex))
      const dfa = nfaToDFA(nfa)

      const nfaResult = simulateNFA(nfa, 'ab')
      const dfaResult = simulateDFA(dfa, 'ab')

      expect(nfaResult.steps.length).toBeGreaterThan(0)
      expect(dfaResult.steps.length).toBeGreaterThan(0)

      expect(nfaResult.steps[0].position).toBe(0)
      expect(dfaResult.steps[0].position).toBe(0)

      expect(nfaResult.accepted).toBe(true)
      expect(dfaResult.accepted).toBe(true)
    })

    it('tracks current states correctly during simulation', () => {
      const regex = 'a|b'
      const nfa = buildNFA(parse(regex))

      const result = simulateNFA(nfa, 'a')

      expect(result.steps.length).toBeGreaterThan(0)
      result.steps.forEach(step => {
        expect(step.currentStates).toBeDefined()
        expect(Array.isArray(step.currentStates)).toBe(true)
      })
    })
  })

  describe('real-world patterns', () => {
    // Regression for the 03-01 parse fix: a+b+c+ is parsed with each interior +
    // (a+b, b+c) as union and only the trailing c+ as positive closure, giving
    // union(union(a, b), plus(c)) = {a} ∪ {b} ∪ {one-or-more c}. The old name
    // "username pattern" assumed concat(plus a, plus b, plus c); that reading is
    // gone, so abc and aaabbbccc now reject.
    it('a+b+c+ is union(a, b, one-or-more c): accepts a, b, c, ccc; rejects abc', () => {
      const regex = 'a+b+c+'
      const nfa = buildNFA(parse(regex))
      const dfa = nfaToDFA(nfa)

      const accept = ['a', 'b', 'c', 'cc', 'ccc']
      const reject = ['', 'ab', 'abc', 'aaabbbccc', 'bc']

      accept.forEach(str => {
        expect(simulateNFA(nfa, str).accepted).toBe(true)
        expect(simulateDFA(dfa, str).accepted).toBe(true)
      })

      reject.forEach(str => {
        expect(simulateNFA(nfa, str).accepted).toBe(false)
        expect(simulateDFA(dfa, str).accepted).toBe(false)
      })
    })

    it('validates identifier pattern', () => {
      const regex = '(a|b|c)(a|b|c|0|1)*'
      const nfa = buildNFA(parse(regex))
      const dfa = nfaToDFA(nfa)

      expect(simulateDFA(dfa, 'a').accepted).toBe(true)
      expect(simulateDFA(dfa, 'a0').accepted).toBe(true)
      expect(simulateDFA(dfa, 'abc01').accepted).toBe(true)
      expect(simulateDFA(dfa, '0a').accepted).toBe(false)
    })

    it('validates string ending pattern', () => {
      const regex = '(a|b)*abb'
      const nfa = buildNFA(parse(regex))
      const dfa = nfaToDFA(nfa)

      const accepting = ['abb', 'aabb', 'babb', 'ababb', 'baabb', 'abababb']
      const rejecting = ['ab', 'aba', 'abba', 'abbb', 'a', 'b', '']

      accepting.forEach(str => {
        expect(simulateDFA(dfa, str).accepted).toBe(true)
      })

      rejecting.forEach(str => {
        expect(simulateDFA(dfa, str).accepted).toBe(false)
      })
    })

    it('validates string containing pattern', () => {
      const regex = '(a|b)*ab(a|b)*'
      const nfa = buildNFA(parse(regex))
      const dfa = nfaToDFA(nfa)

      expect(simulateDFA(dfa, 'ab').accepted).toBe(true)
      expect(simulateDFA(dfa, 'aab').accepted).toBe(true)
      expect(simulateDFA(dfa, 'aba').accepted).toBe(true)
      expect(simulateDFA(dfa, 'aaba').accepted).toBe(true)
      expect(simulateDFA(dfa, 'baba').accepted).toBe(true)
      expect(simulateDFA(dfa, 'a').accepted).toBe(false)
      expect(simulateDFA(dfa, 'b').accepted).toBe(false)
      expect(simulateDFA(dfa, 'ba').accepted).toBe(false)
    })
  })

  describe('error handling', () => {
    it('handles invalid regex gracefully', () => {
      expect(() => parse('(')).toThrow()
    })

    it('handles invalid tokens gracefully', () => {
      expect(() => parse('((a')).toThrow()
    })

    it('rejects strings not in language', () => {
      const regex = 'a+'
      const nfa = buildNFA(parse(regex))
      const dfa = nfaToDFA(nfa)

      const result1 = simulateNFA(nfa, '')
      const result2 = simulateDFA(dfa, '')

      expect(result1.accepted).toBe(false)
      expect(result2.accepted).toBe(false)
    })

    it('handles strings with symbols not in alphabet', () => {
      const regex = 'a'
      const nfa = buildNFA(parse(regex))
      const dfa = nfaToDFA(nfa)

      const result1 = simulateNFA(nfa, 'x')
      const result2 = simulateDFA(dfa, 'x')

      expect(result1.accepted).toBe(false)
      expect(result2.accepted).toBe(false)
    })
  })

  describe('boundary conditions', () => {
    it('handles empty string acceptance', () => {
      const regex = 'ε'
      const nfa = buildNFA(parse(regex))
      const dfa = nfaToDFA(nfa)

      expect(simulateNFA(nfa, '').accepted).toBe(true)
      expect(simulateDFA(dfa, '').accepted).toBe(true)

      expect(simulateNFA(nfa, 'a').accepted).toBe(false)
      expect(simulateDFA(dfa, 'a').accepted).toBe(false)
    })

    it('handles star accepting empty string', () => {
      const regex = 'a*'
      const nfa = buildNFA(parse(regex))
      const dfa = nfaToDFA(nfa)

      expect(simulateNFA(nfa, '').accepted).toBe(true)
      expect(simulateDFA(dfa, '').accepted).toBe(true)
    })

    it('handles optional accepting empty string', () => {
      const regex = 'a?'
      const nfa = buildNFA(parse(regex))
      const dfa = nfaToDFA(nfa)

      expect(simulateNFA(nfa, '').accepted).toBe(true)
      expect(simulateDFA(dfa, '').accepted).toBe(true)
    })

    it('handles plus rejecting empty string', () => {
      const regex = 'a+'
      const nfa = buildNFA(parse(regex))
      const dfa = nfaToDFA(nfa)

      expect(simulateNFA(nfa, '').accepted).toBe(false)
      expect(simulateDFA(dfa, '').accepted).toBe(false)
    })

    it('handles very long input strings', () => {
      const regex = 'a*'
      const nfa = buildNFA(parse(regex))
      const dfa = nfaToDFA(nfa)

      const longString = 'a'.repeat(100)
      expect(simulateNFA(nfa, longString).accepted).toBe(true)
      expect(simulateDFA(dfa, longString).accepted).toBe(true)
    })
  })

  describe('performance and scalability', () => {
    it('handles moderately complex patterns efficiently', () => {
      const regex = '(a|b|c|d)(e|f|g|h)*'
      const ast = parse(regex)
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      expect(nfa.states.length).toBeLessThan(100)
      expect(dfa.states.length).toBeLessThan(100)

      expect(simulateDFA(dfa, 'aefgh').accepted).toBe(true)
    })

    it('processes patterns with multiple levels of nesting', () => {
      const regex = '((a|b)(c|d))*'
      const nfa = buildNFA(parse(regex))
      const dfa = nfaToDFA(nfa)

      expect(simulateDFA(dfa, '').accepted).toBe(true)
      expect(simulateDFA(dfa, 'ac').accepted).toBe(true)
      expect(simulateDFA(dfa, 'acbdac').accepted).toBe(true)
    })
  })

  describe('alphabet handling', () => {
    it('correctly builds alphabet through entire pipeline', () => {
      const regex = 'abc'
      const nfa = buildNFA(parse(regex))
      const dfa = nfaToDFA(nfa)

      expect(nfa.alphabet).toEqual(new Set(['a', 'b', 'c']))
      expect(dfa.alphabet).toEqual(new Set(['a', 'b', 'c']))
    })

    it('handles single symbol alphabet', () => {
      const regex = 'a*'
      const nfa = buildNFA(parse(regex))
      const dfa = nfaToDFA(nfa)

      expect(nfa.alphabet).toEqual(new Set(['a']))
      expect(dfa.alphabet).toEqual(new Set(['a']))
    })

    it('handles empty alphabet for epsilon', () => {
      const regex = 'ε'
      const nfa = buildNFA(parse(regex))
      const dfa = nfaToDFA(nfa)

      expect(nfa.alphabet.size).toBe(0)
      expect(dfa.alphabet.size).toBe(0)
    })

    it('combines alphabets in union', () => {
      const regex = 'a|b|c'
      const nfa = buildNFA(parse(regex))
      const dfa = nfaToDFA(nfa)

      expect(nfa.alphabet).toEqual(new Set(['a', 'b', 'c']))
      expect(dfa.alphabet).toEqual(new Set(['a', 'b', 'c']))
    })
  })

  describe('state and transition counts', () => {
    it('produces reasonable state counts for simple patterns', () => {
      const patterns = [
        { regex: 'a', maxNfaStates: 5, maxDfaStates: 5 },
        { regex: 'ab', maxNfaStates: 10, maxDfaStates: 10 },
        { regex: 'a|b', maxNfaStates: 10, maxDfaStates: 5 },
      ]

      patterns.forEach(({ regex, maxNfaStates, maxDfaStates }) => {
        const nfa = buildNFA(parse(regex))
        const dfa = nfaToDFA(nfa)

        expect(nfa.states.length).toBeLessThanOrEqual(maxNfaStates)
        expect(dfa.states.length).toBeLessThanOrEqual(maxDfaStates)
      })
    })

    it('tracks transition counts correctly', () => {
      const regex = 'ab'
      const nfa = buildNFA(parse(regex))
      const dfa = nfaToDFA(nfa)

      expect(nfa.transitions.length).toBeGreaterThan(0)
      expect(dfa.transitions.length).toBeGreaterThan(0)

      const nfaStateIds = new Set(nfa.states.map(s => s.id))
      nfa.transitions.forEach(t => {
        expect(nfaStateIds.has(t.from)).toBe(true)
        expect(nfaStateIds.has(t.to)).toBe(true)
      })

      const dfaStateIds = new Set(dfa.states.map(s => s.id))
      dfa.transitions.forEach(t => {
        expect(dfaStateIds.has(t.from)).toBe(true)
        expect(dfaStateIds.has(t.to)).toBe(true)
      })
    })
  })

  describe('comprehensive pattern coverage', () => {
    const testSuite = [
      { pattern: 'a', accept: ['a'], reject: ['', 'b', 'aa'] },
      { pattern: 'ab', accept: ['ab'], reject: ['', 'a', 'b', 'ba'] },
      { pattern: 'a|b', accept: ['a', 'b'], reject: ['', 'c', 'ab'] },
      { pattern: 'a*', accept: ['', 'a', 'aa', 'aaa'], reject: ['b', 'ab'] },
      { pattern: 'a+', accept: ['a', 'aa', 'aaa'], reject: ['', 'b'] },
      { pattern: 'a?', accept: ['', 'a'], reject: ['aa', 'b'] },
      { pattern: '(ab)*', accept: ['', 'ab', 'abab'], reject: ['a', 'aba'] },
      { pattern: '(a|b)*', accept: ['', 'a', 'b', 'ab', 'ba'], reject: ['c'] },
      // 03-01 parse fix: a+b+ = union(a, plus(b)) = {a} ∪ {one-or-more b}.
      // a alone matches the left arm; b, bb, bbb match the right. The old
      // concat(plus a, plus b) accepts ['ab','aab','abb','aaabbb'] which is now WRONG.
      { pattern: 'a+b+', accept: ['a', 'b', 'bb', 'bbb'], reject: ['', 'ab', 'aab', 'abb', 'aaabbb'] },
      { pattern: '(a|b)*abb', accept: ['abb', 'aabb', 'babb'], reject: ['ab', 'aba'] },
    ]

    testSuite.forEach(({ pattern, accept, reject }) => {
      it(`correctly handles pattern: ${pattern}`, () => {
        const nfa = buildNFA(parse(pattern))
        const dfa = nfaToDFA(nfa)

        accept.forEach(str => {
          expect(simulateNFA(nfa, str).accepted).toBe(true)
          expect(simulateDFA(dfa, str).accepted).toBe(true)
        })

        reject.forEach(str => {
          expect(simulateNFA(nfa, str).accepted).toBe(false)
          expect(simulateDFA(dfa, str).accepted).toBe(false)
        })
      })
    })
  })
})
