import { describe, it, expect } from 'vitest'
import { buildNFA } from '@/core/algorithms/thompson'
import { parse } from '@/core/regex/parser'

describe('thompson construction', () => {
  describe('base cases', () => {
    it('builds NFA for empty string', () => {
      const ast = parse('ε')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(2)
      expect(nfa.transitions).toHaveLength(1)
      expect(nfa.transitions[0]).toEqual({
        from: nfa.startState,
        to: nfa.acceptStates[0],
        symbol: null,
      })
      expect(nfa.alphabet.size).toBe(0)
    })

    it('builds NFA for single symbol', () => {
      const ast = parse('a')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(2)
      expect(nfa.transitions).toHaveLength(1)
      expect(nfa.transitions[0]).toEqual({
        from: nfa.startState,
        to: nfa.acceptStates[0],
        symbol: 'a',
      })
      expect(nfa.alphabet).toEqual(new Set(['a']))
    })

    it('builds NFA for different symbols', () => {
      const ast = parse('x')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(2)
      expect(nfa.alphabet).toEqual(new Set(['x']))
    })
  })

  describe('concatenation', () => {
    it('builds NFA for two symbols', () => {
      const ast = parse('ab')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(4)
      expect(nfa.transitions).toHaveLength(3)
      expect(nfa.alphabet).toEqual(new Set(['a', 'b']))

      const hasEpsilon = nfa.transitions.some(t => t.symbol === null)
      expect(hasEpsilon).toBe(true)
    })

    it('builds NFA for three symbols', () => {
      const ast = parse('abc')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(6)
      expect(nfa.transitions).toHaveLength(5)
      expect(nfa.alphabet).toEqual(new Set(['a', 'b', 'c']))
    })

    it('builds NFA for long concatenation', () => {
      const ast = parse('abcde')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(10)
      expect(nfa.transitions).toHaveLength(9)
    })
  })

  describe('union', () => {
    it('builds NFA for simple union', () => {
      const ast = parse('a|b')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(6)
      expect(nfa.transitions).toHaveLength(6)
      expect(nfa.alphabet).toEqual(new Set(['a', 'b']))

      const epsilonCount = nfa.transitions.filter(t => t.symbol === null).length
      expect(epsilonCount).toBe(4)
    })

    it('builds NFA for three-way union', () => {
      const ast = parse('a|b|c')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(10)
      expect(nfa.alphabet).toEqual(new Set(['a', 'b', 'c']))
    })

    it('builds NFA for union with concatenation', () => {
      const ast = parse('ab|cd')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(10)
      expect(nfa.alphabet).toEqual(new Set(['a', 'b', 'c', 'd']))
    })
  })

  describe('kleene star', () => {
    it('builds NFA for star of single symbol', () => {
      const ast = parse('a*')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(4)
      expect(nfa.transitions).toHaveLength(5)

      const epsilonCount = nfa.transitions.filter(t => t.symbol === null).length
      expect(epsilonCount).toBe(4)
    })

    it('builds NFA for star of union', () => {
      const ast = parse('(a|b)*')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(8)
      expect(nfa.alphabet).toEqual(new Set(['a', 'b']))
    })

    it('builds NFA for nested stars', () => {
      const ast = parse('a**')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(6)
    })

    it('builds NFA for star of concatenation', () => {
      const ast = parse('(ab)*')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(6)
    })
  })

  describe('positive closure', () => {
    it('builds NFA for plus of single symbol', () => {
      const ast = parse('a+')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(4)
      expect(nfa.transitions).toHaveLength(4)

      const epsilonCount = nfa.transitions.filter(t => t.symbol === null).length
      expect(epsilonCount).toBe(3)
    })

    it('builds NFA for plus of union', () => {
      const ast = parse('(a|b)+')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(8)
    })

    it('builds NFA for nested plus', () => {
      const ast = parse('a++')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(6)
    })
  })

  describe('optional', () => {
    it('builds NFA for optional single symbol', () => {
      const ast = parse('a?')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(4)
      expect(nfa.transitions).toHaveLength(4)

      const epsilonCount = nfa.transitions.filter(t => t.symbol === null).length
      expect(epsilonCount).toBe(3)
    })

    it('builds NFA for optional union', () => {
      const ast = parse('(a|b)?')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(8)
    })

    it('builds NFA for nested optional', () => {
      const ast = parse('a??')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(6)
    })
  })

  describe('complex expressions', () => {
    it('builds NFA for (a|b)*abb', () => {
      const ast = parse('(a|b)*abb')
      const nfa = buildNFA(ast)

      expect(nfa.states.length).toBeGreaterThan(0)
      expect(nfa.alphabet).toEqual(new Set(['a', 'b']))
      expect(nfa.acceptStates).toHaveLength(1)
    })

    it('builds NFA for a*b+c?', () => {
      const ast = parse('a*b+c?')
      const nfa = buildNFA(ast)

      expect(nfa.alphabet).toEqual(new Set(['a', 'b', 'c']))
      expect(nfa.acceptStates).toHaveLength(1)
    })

    it('builds NFA for (a+b)*c', () => {
      const ast = parse('(a+b)*c')
      const nfa = buildNFA(ast)

      expect(nfa.alphabet).toEqual(new Set(['a', 'b', 'c']))
    })

    it('builds NFA for nested groups', () => {
      const ast = parse('a(b|c)*d')
      const nfa = buildNFA(ast)

      expect(nfa.alphabet).toEqual(new Set(['a', 'b', 'c', 'd']))
      expect(nfa.acceptStates).toHaveLength(1)
    })

    it('builds NFA for complex union', () => {
      const ast = parse('(a|b)(c|d)')
      const nfa = buildNFA(ast)

      expect(nfa.alphabet).toEqual(new Set(['a', 'b', 'c', 'd']))
    })
  })

  describe('structural properties', () => {
    it('has exactly one start state', () => {
      const ast = parse('(a|b)*abb')
      const nfa = buildNFA(ast)

      expect(nfa.startState).toBeDefined()
      expect(typeof nfa.startState).toBe('string')
    })

    it('has exactly one accept state', () => {
      const ast = parse('(a|b)*abb')
      const nfa = buildNFA(ast)

      expect(nfa.acceptStates).toHaveLength(1)
    })

    it('start state has no incoming transitions', () => {
      const ast = parse('a|b')
      const nfa = buildNFA(ast)

      const incoming = nfa.transitions.filter(t => t.to === nfa.startState)
      expect(incoming).toHaveLength(0)
    })

    it('accept state has no outgoing transitions', () => {
      const ast = parse('a|b')
      const nfa = buildNFA(ast)

      const acceptState = nfa.acceptStates[0]
      const outgoing = nfa.transitions.filter(t => t.from === acceptState)
      expect(outgoing).toHaveLength(0)
    })

    it('all states are reachable from start', () => {
      const ast = parse('ab')
      const nfa = buildNFA(ast)

      const stateIds = new Set(nfa.states.map(s => s.id))
      expect(stateIds.has(nfa.startState)).toBe(true)
      expect(stateIds.has(nfa.acceptStates[0])).toBe(true)
    })

    it('all transition endpoints exist as states', () => {
      const ast = parse('(a|b)*')
      const nfa = buildNFA(ast)

      const stateIds = new Set(nfa.states.map(s => s.id))

      nfa.transitions.forEach(t => {
        expect(stateIds.has(t.from)).toBe(true)
        expect(stateIds.has(t.to)).toBe(true)
      })
    })

    it('collects alphabet correctly', () => {
      const ast = parse('abcabc')
      const nfa = buildNFA(ast)

      expect(nfa.alphabet).toEqual(new Set(['a', 'b', 'c']))
    })

    it('empty string has empty alphabet', () => {
      const ast = parse('ε')
      const nfa = buildNFA(ast)

      expect(nfa.alphabet.size).toBe(0)
    })

    it('epsilon in union does not add to alphabet', () => {
      const ast = parse('a|ε')
      const nfa = buildNFA(ast)

      expect(nfa.alphabet).toEqual(new Set(['a']))
    })
  })

  describe('operator combinations', () => {
    it('builds NFA for star then plus', () => {
      const ast = parse('a*b+')
      const nfa = buildNFA(ast)

      expect(nfa.alphabet).toEqual(new Set(['a', 'b']))
    })

    it('builds NFA for optional then star', () => {
      const ast = parse('a?b*')
      const nfa = buildNFA(ast)

      expect(nfa.alphabet).toEqual(new Set(['a', 'b']))
    })

    it('builds NFA for all operators', () => {
      const ast = parse('a*b+c?|d')
      const nfa = buildNFA(ast)

      expect(nfa.alphabet).toEqual(new Set(['a', 'b', 'c', 'd']))
      expect(nfa.acceptStates).toHaveLength(1)
    })
  })

  describe('edge cases', () => {
    it('handles single epsilon', () => {
      const ast = parse('ε')
      const nfa = buildNFA(ast)

      expect(nfa.states).toHaveLength(2)
      expect(nfa.transitions).toHaveLength(1)
      expect(nfa.transitions[0].symbol).toBeNull()
    })

    it('handles epsilon in concatenation', () => {
      const ast = parse('εa')
      const nfa = buildNFA(ast)

      expect(nfa.alphabet).toEqual(new Set(['a']))
    })

    it('handles epsilon in union', () => {
      const ast = parse('ε|a')
      const nfa = buildNFA(ast)

      expect(nfa.alphabet).toEqual(new Set(['a']))
    })

    it('handles star of epsilon', () => {
      const ast = parse('ε*')
      const nfa = buildNFA(ast)

      expect(nfa.alphabet.size).toBe(0)
    })
  })
})
