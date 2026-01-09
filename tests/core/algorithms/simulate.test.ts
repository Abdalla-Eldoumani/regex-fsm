import { describe, it, expect } from 'vitest'
import { simulateNFA, simulateDFA } from '@/core/algorithms/simulate'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { parse } from '@/core/regex/parser'

describe('simulation', () => {
  describe('NFA simulation', () => {
    it('accepts single symbol matching input', () => {
      const nfa = buildNFA(parse('a'))
      const result = simulateNFA(nfa, 'a')

      expect(result.accepted).toBe(true)
      expect(result.steps).toHaveLength(2)
      expect(result.steps[0].position).toBe(0)
      expect(result.steps[1].position).toBe(1)
      expect(result.steps[1].symbol).toBe('a')
    })

    it('rejects single symbol with mismatched input', () => {
      const nfa = buildNFA(parse('a'))
      const result = simulateNFA(nfa, 'b')

      expect(result.accepted).toBe(false)
    })

    it('accepts concatenation', () => {
      const nfa = buildNFA(parse('ab'))
      const result = simulateNFA(nfa, 'ab')

      expect(result.accepted).toBe(true)
      expect(result.steps).toHaveLength(3)
    })

    it('rejects partial match of concatenation', () => {
      const nfa = buildNFA(parse('ab'))

      expect(simulateNFA(nfa, 'a').accepted).toBe(false)
      expect(simulateNFA(nfa, 'b').accepted).toBe(false)
      expect(simulateNFA(nfa, 'ba').accepted).toBe(false)
    })

    it('accepts empty string for epsilon', () => {
      const nfa = buildNFA(parse('ε'))
      const result = simulateNFA(nfa, '')

      expect(result.accepted).toBe(true)
      expect(result.steps).toHaveLength(1)
    })

    it('rejects non-empty string for epsilon', () => {
      const nfa = buildNFA(parse('ε'))
      const result = simulateNFA(nfa, 'a')

      expect(result.accepted).toBe(false)
    })

    it('accepts union - first alternative', () => {
      const nfa = buildNFA(parse('a|b'))
      const result = simulateNFA(nfa, 'a')

      expect(result.accepted).toBe(true)
    })

    it('accepts union - second alternative', () => {
      const nfa = buildNFA(parse('a|b'))
      const result = simulateNFA(nfa, 'b')

      expect(result.accepted).toBe(true)
    })

    it('rejects union with non-matching input', () => {
      const nfa = buildNFA(parse('a|b'))
      const result = simulateNFA(nfa, 'c')

      expect(result.accepted).toBe(false)
    })

    it('accepts kleene star - empty string', () => {
      const nfa = buildNFA(parse('a*'))
      const result = simulateNFA(nfa, '')

      expect(result.accepted).toBe(true)
    })

    it('accepts kleene star - single iteration', () => {
      const nfa = buildNFA(parse('a*'))
      const result = simulateNFA(nfa, 'a')

      expect(result.accepted).toBe(true)
    })

    it('accepts kleene star - multiple iterations', () => {
      const nfa = buildNFA(parse('a*'))
      const result = simulateNFA(nfa, 'aaaa')

      expect(result.accepted).toBe(true)
    })

    it('rejects kleene star with mismatched symbol', () => {
      const nfa = buildNFA(parse('a*'))
      const result = simulateNFA(nfa, 'b')

      expect(result.accepted).toBe(false)
    })

    it('accepts positive closure - single iteration', () => {
      const nfa = buildNFA(parse('a+'))
      const result = simulateNFA(nfa, 'a')

      expect(result.accepted).toBe(true)
    })

    it('accepts positive closure - multiple iterations', () => {
      const nfa = buildNFA(parse('a+'))
      const result = simulateNFA(nfa, 'aaaa')

      expect(result.accepted).toBe(true)
    })

    it('rejects positive closure - empty string', () => {
      const nfa = buildNFA(parse('a+'))
      const result = simulateNFA(nfa, '')

      expect(result.accepted).toBe(false)
    })

    it('accepts optional - empty string', () => {
      const nfa = buildNFA(parse('a?'))
      const result = simulateNFA(nfa, '')

      expect(result.accepted).toBe(true)
    })

    it('accepts optional - single symbol', () => {
      const nfa = buildNFA(parse('a?'))
      const result = simulateNFA(nfa, 'a')

      expect(result.accepted).toBe(true)
    })

    it('rejects optional - multiple symbols', () => {
      const nfa = buildNFA(parse('a?'))
      const result = simulateNFA(nfa, 'aa')

      expect(result.accepted).toBe(false)
    })

    it('accepts complex pattern - (a|b)*abb', () => {
      const nfa = buildNFA(parse('(a|b)*abb'))

      expect(simulateNFA(nfa, 'abb').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aabb').accepted).toBe(true)
      expect(simulateNFA(nfa, 'babb').accepted).toBe(true)
      expect(simulateNFA(nfa, 'aaabb').accepted).toBe(true)
      expect(simulateNFA(nfa, 'abababb').accepted).toBe(true)
    })

    it('rejects complex pattern - (a|b)*abb', () => {
      const nfa = buildNFA(parse('(a|b)*abb'))

      expect(simulateNFA(nfa, '').accepted).toBe(false)
      expect(simulateNFA(nfa, 'ab').accepted).toBe(false)
      expect(simulateNFA(nfa, 'aab').accepted).toBe(false)
      expect(simulateNFA(nfa, 'aba').accepted).toBe(false)
      expect(simulateNFA(nfa, 'abba').accepted).toBe(false)
    })

    it('tracks step-by-step state sets', () => {
      const nfa = buildNFA(parse('ab'))
      const result = simulateNFA(nfa, 'ab')

      expect(result.steps).toHaveLength(3)

      expect(result.steps[0].position).toBe(0)
      expect(result.steps[0].symbol).toBe(null)
      expect(result.steps[0].nextStates.length).toBeGreaterThan(0)

      expect(result.steps[1].position).toBe(1)
      expect(result.steps[1].symbol).toBe('a')
      expect(result.steps[1].currentStates.length).toBeGreaterThan(0)
      expect(result.steps[1].nextStates.length).toBeGreaterThan(0)

      expect(result.steps[2].position).toBe(2)
      expect(result.steps[2].symbol).toBe('b')
    })
  })

  describe('DFA simulation', () => {
    it('accepts single symbol matching input', () => {
      const nfa = buildNFA(parse('a'))
      const dfa = nfaToDFA(nfa)
      const result = simulateDFA(dfa, 'a')

      expect(result.accepted).toBe(true)
      expect(result.steps).toHaveLength(2)
    })

    it('rejects single symbol with mismatched input', () => {
      const nfa = buildNFA(parse('a'))
      const dfa = nfaToDFA(nfa)
      const result = simulateDFA(dfa, 'b')

      expect(result.accepted).toBe(false)
    })

    it('accepts concatenation', () => {
      const nfa = buildNFA(parse('ab'))
      const dfa = nfaToDFA(nfa)
      const result = simulateDFA(dfa, 'ab')

      expect(result.accepted).toBe(true)
      expect(result.steps).toHaveLength(3)
    })

    it('rejects partial match of concatenation', () => {
      const nfa = buildNFA(parse('ab'))
      const dfa = nfaToDFA(nfa)

      expect(simulateDFA(dfa, 'a').accepted).toBe(false)
      expect(simulateDFA(dfa, 'b').accepted).toBe(false)
    })

    it('accepts empty string for epsilon', () => {
      const nfa = buildNFA(parse('ε'))
      const dfa = nfaToDFA(nfa)
      const result = simulateDFA(dfa, '')

      expect(result.accepted).toBe(true)
    })

    it('accepts union - first alternative', () => {
      const nfa = buildNFA(parse('a|b'))
      const dfa = nfaToDFA(nfa)

      expect(simulateDFA(dfa, 'a').accepted).toBe(true)
    })

    it('accepts union - second alternative', () => {
      const nfa = buildNFA(parse('a|b'))
      const dfa = nfaToDFA(nfa)

      expect(simulateDFA(dfa, 'b').accepted).toBe(true)
    })

    it('rejects union with non-matching input', () => {
      const nfa = buildNFA(parse('a|b'))
      const dfa = nfaToDFA(nfa)

      expect(simulateDFA(dfa, 'c').accepted).toBe(false)
    })

    it('accepts kleene star - empty string', () => {
      const nfa = buildNFA(parse('a*'))
      const dfa = nfaToDFA(nfa)

      expect(simulateDFA(dfa, '').accepted).toBe(true)
    })

    it('accepts kleene star - multiple iterations', () => {
      const nfa = buildNFA(parse('a*'))
      const dfa = nfaToDFA(nfa)

      expect(simulateDFA(dfa, 'aaaa').accepted).toBe(true)
    })

    it('accepts complex pattern - (a|b)*abb', () => {
      const nfa = buildNFA(parse('(a|b)*abb'))
      const dfa = nfaToDFA(nfa)

      expect(simulateDFA(dfa, 'abb').accepted).toBe(true)
      expect(simulateDFA(dfa, 'aabb').accepted).toBe(true)
      expect(simulateDFA(dfa, 'babb').accepted).toBe(true)
    })

    it('rejects complex pattern - (a|b)*abb', () => {
      const nfa = buildNFA(parse('(a|b)*abb'))
      const dfa = nfaToDFA(nfa)

      expect(simulateDFA(dfa, 'ab').accepted).toBe(false)
      expect(simulateDFA(dfa, 'aab').accepted).toBe(false)
    })

    it('tracks step-by-step single states', () => {
      const nfa = buildNFA(parse('ab'))
      const dfa = nfaToDFA(nfa)
      const result = simulateDFA(dfa, 'ab')

      expect(result.steps).toHaveLength(3)

      expect(result.steps[0].position).toBe(0)
      expect(result.steps[0].symbol).toBe(null)
      expect(result.steps[0].nextStates).toHaveLength(1)

      expect(result.steps[1].position).toBe(1)
      expect(result.steps[1].symbol).toBe('a')
      expect(result.steps[1].currentStates).toHaveLength(1)
      expect(result.steps[1].nextStates).toHaveLength(1)

      expect(result.steps[2].position).toBe(2)
      expect(result.steps[2].symbol).toBe('b')
      expect(result.steps[2].currentStates).toHaveLength(1)
    })

    it('handles missing transition gracefully', () => {
      const nfa = buildNFA(parse('a'))
      const dfa = nfaToDFA(nfa)
      const result = simulateDFA(dfa, 'ab')

      expect(result.accepted).toBe(false)
      expect(result.steps.length).toBeGreaterThanOrEqual(2)

      const lastStep = result.steps[result.steps.length - 1]
      expect(lastStep.nextStates).toHaveLength(0)
    })
  })

  describe('NFA/DFA equivalence', () => {
    const testCases: Array<{
      regex: string
      accepts: string[]
      rejects: string[]
    }> = [
      {
        regex: 'a',
        accepts: ['a'],
        rejects: ['', 'b', 'aa'],
      },
      {
        regex: 'ab',
        accepts: ['ab'],
        rejects: ['', 'a', 'b', 'ba', 'aba'],
      },
      {
        regex: 'a|b',
        accepts: ['a', 'b'],
        rejects: ['', 'ab', 'c'],
      },
      {
        regex: 'a*',
        accepts: ['', 'a', 'aa', 'aaa'],
        rejects: ['b', 'ab', 'ba'],
      },
      {
        regex: 'a+',
        accepts: ['a', 'aa', 'aaa'],
        rejects: ['', 'b', 'ab'],
      },
      {
        regex: 'a?',
        accepts: ['', 'a'],
        rejects: ['aa', 'b'],
      },
      {
        regex: '(a|b)*',
        accepts: ['', 'a', 'b', 'ab', 'ba', 'aaabbb'],
        rejects: ['c', 'abc'],
      },
      {
        regex: '(a|b)*abb',
        accepts: ['abb', 'aabb', 'babb', 'abababb'],
        rejects: ['', 'ab', 'aab', 'aba', 'abba'],
      },
    ]

    testCases.forEach(({ regex, accepts, rejects }) => {
      describe(`regex: ${regex}`, () => {
        accepts.forEach(input => {
          it(`NFA and DFA both accept "${input}"`, () => {
            const nfa = buildNFA(parse(regex))
            const dfa = nfaToDFA(nfa)

            const nfaResult = simulateNFA(nfa, input)
            const dfaResult = simulateDFA(dfa, input)

            expect(nfaResult.accepted).toBe(true)
            expect(dfaResult.accepted).toBe(true)
          })
        })

        rejects.forEach(input => {
          it(`NFA and DFA both reject "${input}"`, () => {
            const nfa = buildNFA(parse(regex))
            const dfa = nfaToDFA(nfa)

            const nfaResult = simulateNFA(nfa, input)
            const dfaResult = simulateDFA(dfa, input)

            expect(nfaResult.accepted).toBe(false)
            expect(dfaResult.accepted).toBe(false)
          })
        })
      })
    })
  })

  describe('edge cases', () => {
    it('handles empty input on non-epsilon regex', () => {
      const nfa = buildNFA(parse('a'))
      const dfa = nfaToDFA(nfa)

      expect(simulateNFA(nfa, '').accepted).toBe(false)
      expect(simulateDFA(dfa, '').accepted).toBe(false)
    })

    it('handles long input strings', () => {
      const nfa = buildNFA(parse('a*'))
      const dfa = nfaToDFA(nfa)
      const longInput = 'a'.repeat(100)

      expect(simulateNFA(nfa, longInput).accepted).toBe(true)
      expect(simulateDFA(dfa, longInput).accepted).toBe(true)
    })

    it('handles nested grouping', () => {
      const nfa = buildNFA(parse('((a|b)*c)|d'))
      const dfa = nfaToDFA(nfa)

      expect(simulateNFA(nfa, 'c').accepted).toBe(true)
      expect(simulateDFA(dfa, 'c').accepted).toBe(true)

      expect(simulateNFA(nfa, 'd').accepted).toBe(true)
      expect(simulateDFA(dfa, 'd').accepted).toBe(true)

      expect(simulateNFA(nfa, 'abac').accepted).toBe(true)
      expect(simulateDFA(dfa, 'abac').accepted).toBe(true)
    })
  })
})
