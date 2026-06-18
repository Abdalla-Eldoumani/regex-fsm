import { describe, it, expect } from 'vitest'
import { minimizeDFA, renameDFAStates } from '@/core/algorithms/minimize'
import { DFA } from '@/core/automata/types'
import { simulateDFA } from '@/core/algorithms/simulate'
import { parse } from '@/core/regex/parser'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'

describe('minimizeDFA', () => {
  describe('basic minimization', () => {
    it('should minimize a DFA with equivalent states', () => {
      // DFA that accepts strings ending with 'a'
      // States q0, q1 are equivalent non-accepting, q2, q3 are equivalent accepting
      const dfa: DFA = {
        states: [
          { id: 'q0', label: 'q0' },
          { id: 'q1', label: 'q1' },
          { id: 'q2', label: 'q2' },
          { id: 'q3', label: 'q3' },
        ],
        transitions: [
          { from: 'q0', to: 'q2', symbol: 'a' },
          { from: 'q0', to: 'q1', symbol: 'b' },
          { from: 'q1', to: 'q3', symbol: 'a' },
          { from: 'q1', to: 'q0', symbol: 'b' },
          { from: 'q2', to: 'q2', symbol: 'a' },
          { from: 'q2', to: 'q1', symbol: 'b' },
          { from: 'q3', to: 'q3', symbol: 'a' },
          { from: 'q3', to: 'q0', symbol: 'b' },
        ],
        startState: 'q0',
        acceptStates: ['q2', 'q3'],
        alphabet: new Set(['a', 'b']),
      }

      const result = minimizeDFA(dfa)

      // Should have fewer states (q0,q1 merge and q2,q3 merge)
      expect(result.dfa.states.length).toBeLessThan(dfa.states.length)
      expect(result.dfa.states.length).toBe(2)
    })

    it('should not change an already minimal DFA', () => {
      // Minimal DFA for 'a' - just 2 states
      const dfa: DFA = {
        states: [
          { id: 'q0', label: 'q0' },
          { id: 'q1', label: 'q1' },
        ],
        transitions: [
          { from: 'q0', to: 'q1', symbol: 'a' },
          { from: 'q1', to: 'q1', symbol: 'a' },
        ],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a']),
      }

      const result = minimizeDFA(dfa)

      expect(result.dfa.states.length).toBe(2)
      expect(result.description).toContain('already minimal')
    })

    it('should handle empty DFA', () => {
      const dfa: DFA = {
        states: [],
        transitions: [],
        startState: '',
        acceptStates: [],
        alphabet: new Set(['a', 'b']),
      }

      const result = minimizeDFA(dfa)

      expect(result.dfa.states.length).toBe(0)
    })

    it('should remove unreachable states', () => {
      const dfa: DFA = {
        states: [
          { id: 'q0', label: 'q0' },
          { id: 'q1', label: 'q1' },
          { id: 'q2', label: 'q2' },  // Unreachable
        ],
        transitions: [
          { from: 'q0', to: 'q1', symbol: 'a' },
          { from: 'q1', to: 'q0', symbol: 'b' },
          { from: 'q2', to: 'q2', symbol: 'a' },  // Unreachable
          { from: 'q2', to: 'q2', symbol: 'b' },  // Unreachable
        ],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a', 'b']),
      }

      const result = minimizeDFA(dfa)

      // q2 should be removed
      expect(result.dfa.states.length).toBe(2)
      expect(result.dfa.states.find(s => s.id === 'q2')).toBeUndefined()
    })
  })

  describe('naming options', () => {
    it('should use q0, q1, q2... by default', () => {
      const dfa: DFA = {
        states: [
          { id: '{q0,q1}', label: '{q0,q1}' },
          { id: '{q2}', label: '{q2}' },
        ],
        transitions: [
          { from: '{q0,q1}', to: '{q2}', symbol: 'a' },
          { from: '{q2}', to: '{q0,q1}', symbol: 'b' },
        ],
        startState: '{q0,q1}',
        acceptStates: ['{q2}'],
        alphabet: new Set(['a', 'b']),
      }

      const result = minimizeDFA(dfa, false)

      expect(result.dfa.states.every(s => s.id.match(/^q\d+$/) || s.id === '∅')).toBe(true)
    })

    it('should use A, B, C... when useLetterNames is true', () => {
      const dfa: DFA = {
        states: [
          { id: '{q0,q1}', label: '{q0,q1}' },
          { id: '{q2}', label: '{q2}' },
        ],
        transitions: [
          { from: '{q0,q1}', to: '{q2}', symbol: 'a' },
          { from: '{q2}', to: '{q0,q1}', symbol: 'b' },
        ],
        startState: '{q0,q1}',
        acceptStates: ['{q2}'],
        alphabet: new Set(['a', 'b']),
      }

      const result = minimizeDFA(dfa, true)

      expect(result.dfa.states.every(s => s.id.match(/^[A-Z]+$/) || s.id === '∅')).toBe(true)
    })
  })

  describe('equivalence preservation', () => {
    it('minimized DFA should accept the same strings as original', () => {
      // Build DFA for (a|b)*abb
      const ast = parse('(a|b)*abb')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      const result = minimizeDFA(dfa)

      // Test with various strings
      const testStrings = ['abb', 'aabb', 'babb', 'aababb', '', 'ab', 'a', 'b', 'ba']

      for (const str of testStrings) {
        const originalResult = simulateDFA(dfa, str)
        const minimizedResult = simulateDFA(result.dfa, str)
        expect(minimizedResult.accepted).toBe(originalResult.accepted)
      }
    })

    it('minimized DFA for a*b* should accept the same strings', () => {
      const ast = parse('a*b*')
      const nfa = buildNFA(ast)
      const dfa = nfaToDFA(nfa)

      const result = minimizeDFA(dfa)

      const testStrings = ['', 'a', 'b', 'aa', 'bb', 'ab', 'aab', 'abb', 'aaabbb', 'ba', 'aba']

      for (const str of testStrings) {
        const originalResult = simulateDFA(dfa, str)
        const minimizedResult = simulateDFA(result.dfa, str)
        expect(minimizedResult.accepted).toBe(originalResult.accepted)
      }
    })
  })

  describe('with trap states', () => {
    it('should handle DFA with trap state', () => {
      const dfa: DFA = {
        states: [
          { id: 'q0', label: 'q0' },
          { id: 'q1', label: 'q1' },
          { id: '∅', label: '∅' },
        ],
        transitions: [
          { from: 'q0', to: 'q1', symbol: 'a' },
          { from: 'q0', to: '∅', symbol: 'b' },
          { from: 'q1', to: 'q1', symbol: 'a' },
          { from: 'q1', to: '∅', symbol: 'b' },
          { from: '∅', to: '∅', symbol: 'a' },
          { from: '∅', to: '∅', symbol: 'b' },
        ],
        startState: 'q0',
        acceptStates: ['q1'],
        alphabet: new Set(['a', 'b']),
      }

      const result = minimizeDFA(dfa)

      // Trap state should remain as a separate state
      expect(result.dfa.states.length).toBe(3)
    })
  })

  describe('state mapping', () => {
    it('should provide correct state mapping', () => {
      const dfa: DFA = {
        states: [
          { id: '{q0}', label: '{q0}' },
          { id: '{q1,q2}', label: '{q1,q2}' },
        ],
        transitions: [
          { from: '{q0}', to: '{q1,q2}', symbol: 'a' },
          { from: '{q1,q2}', to: '{q0}', symbol: 'b' },
        ],
        startState: '{q0}',
        acceptStates: ['{q1,q2}'],
        alphabet: new Set(['a', 'b']),
      }

      const result = minimizeDFA(dfa)

      // Check that mapping exists
      expect(result.stateMapping.size).toBe(2)
      expect(result.stateMapping.has('{q0}')).toBe(true)
      expect(result.stateMapping.has('{q1,q2}')).toBe(true)
    })

    it('should provide merged states info', () => {
      // DFA with equivalent states that will be merged
      const dfa: DFA = {
        states: [
          { id: 'q0', label: 'q0' },
          { id: 'q1', label: 'q1' },
          { id: 'q2', label: 'q2' },
          { id: 'q3', label: 'q3' },
        ],
        transitions: [
          { from: 'q0', to: 'q2', symbol: 'a' },
          { from: 'q0', to: 'q1', symbol: 'b' },
          { from: 'q1', to: 'q3', symbol: 'a' },
          { from: 'q1', to: 'q0', symbol: 'b' },
          { from: 'q2', to: 'q2', symbol: 'a' },
          { from: 'q2', to: 'q1', symbol: 'b' },
          { from: 'q3', to: 'q3', symbol: 'a' },
          { from: 'q3', to: 'q0', symbol: 'b' },
        ],
        startState: 'q0',
        acceptStates: ['q2', 'q3'],
        alphabet: new Set(['a', 'b']),
      }

      const result = minimizeDFA(dfa)

      // Check merged states info
      expect(result.mergedStates.size).toBe(2)

      // One partition should contain non-accepting states, other accepting
      const mergedArrays = Array.from(result.mergedStates.values())
      expect(mergedArrays.some(arr => arr.length === 2)).toBe(true)
    })
  })
})

describe('letter naming past Z (getLetterName off-by-one guard)', () => {
  // getLetterName is module-private, so drive it through minimizeDFA. A modulo-27
  // counter over {a} has 27 PAIRWISE-DISTINGUISHABLE states: a single accepting
  // residue means each state qi accepts a^k for a different residue class, so no two
  // states can merge and minimization keeps all 27. With letter naming on, the 27
  // partitions take names A..Z (indices 0..25) and then index 26 -> 'AA'. The buggy
  // `Math.floor(index/26) - 1` boundary is exactly what decides the 27th name: the
  // correct formula yields 'AA', a no-minus-one bug yields 'BA', so the name SET
  // distinguishes them.
  function mod27Cycle(): DFA {
    const n = 27
    const states = Array.from({ length: n }, (_, i) => ({ id: `q${i}`, label: `q${i}` }))
    const transitions = Array.from({ length: n }, (_, i) => ({
      from: `q${i}`,
      to: `q${(i + 1) % n}`,
      symbol: 'a',
    }))
    return {
      states,
      transitions,
      startState: 'q0',
      acceptStates: ['q0'], // exactly one accepting residue -> all 27 are distinct
      alphabet: new Set(['a']),
    }
  }

  it('keeps all 27 distinguishable states and names the 27th AA, not BA', () => {
    const result = minimizeDFA(mod27Cycle(), true)
    // No states merge: the minimal machine still has 27.
    expect(result.dfa.states).toHaveLength(27)

    const names = new Set(result.dfa.states.map((s) => s.id))
    // The 27th name is the boundary case the off-by-one would break.
    expect(names.has('AA')).toBe(true)
    expect(names.has('BA')).toBe(false) // the no-minus-one bug's output
    expect(names.has('@A')).toBe(false) // a minus-too-much bug (charCode 64 = '@')

    // The full name set is exactly A..Z plus AA, nothing malformed.
    const expected = new Set<string>()
    for (let i = 0; i < 26; i++) expected.add(String.fromCharCode(65 + i))
    expected.add('AA')
    expect(names).toEqual(expected)

    // Every name is a real uppercase-letter label (no stray '@' or '[').
    expect(result.dfa.states.every((s) => /^[A-Z]+$/.test(s.id))).toBe(true)
  })

  it('preserves the language after the past-Z renaming', () => {
    const dfa = mod27Cycle()
    const result = minimizeDFA(dfa, true)
    // a^k is accepted iff k is a multiple of 27. Check across the boundary.
    for (const k of [0, 1, 26, 27, 28, 53, 54]) {
      const str = 'a'.repeat(k)
      expect(simulateDFA(result.dfa, str).accepted).toBe(simulateDFA(dfa, str).accepted)
    }
  })
})

describe('renameDFAStates', () => {
  it('should rename states with q0, q1, q2... by default', () => {
    const dfa: DFA = {
      states: [
        { id: '{q0,q1,q2}', label: '{q0,q1,q2}' },
        { id: '{q3}', label: '{q3}' },
        { id: '∅', label: '∅' },
      ],
      transitions: [
        { from: '{q0,q1,q2}', to: '{q3}', symbol: 'a' },
        { from: '{q3}', to: '∅', symbol: 'b' },
        { from: '∅', to: '∅', symbol: 'a' },
        { from: '∅', to: '∅', symbol: 'b' },
      ],
      startState: '{q0,q1,q2}',
      acceptStates: ['{q3}'],
      alphabet: new Set(['a', 'b']),
    }

    const result = renameDFAStates(dfa, false)

    // Start state should be q0
    expect(result.dfa.startState).toBe('q0')
    // Trap state should remain ∅
    expect(result.dfa.states.some(s => s.id === '∅')).toBe(true)
  })

  it('should rename states with A, B, C... when useLetterNames is true', () => {
    const dfa: DFA = {
      states: [
        { id: '{q0,q1}', label: '{q0,q1}' },
        { id: '{q2}', label: '{q2}' },
      ],
      transitions: [
        { from: '{q0,q1}', to: '{q2}', symbol: 'a' },
        { from: '{q2}', to: '{q0,q1}', symbol: 'b' },
      ],
      startState: '{q0,q1}',
      acceptStates: ['{q2}'],
      alphabet: new Set(['a', 'b']),
    }

    const result = renameDFAStates(dfa, true)

    // Start state should be A
    expect(result.dfa.startState).toBe('A')
    // All states should be letters
    expect(result.dfa.states.every(s => s.id.match(/^[A-Z]+$/))).toBe(true)
  })

  it('should preserve DFA behavior after renaming', () => {
    const ast = parse('ab*')
    const nfa = buildNFA(ast)
    const dfa = nfaToDFA(nfa)

    const result = renameDFAStates(dfa)

    const testStrings = ['a', 'ab', 'abb', 'abbb', '', 'b', 'ba', 'aa']

    for (const str of testStrings) {
      const originalResult = simulateDFA(dfa, str)
      const renamedResult = simulateDFA(result.dfa, str)
      expect(renamedResult.accepted).toBe(originalResult.accepted)
    }
  })
})
