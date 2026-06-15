import { describe, it, expect } from 'vitest'
import { parse } from '@/core/cachedAlgorithms'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateDFA } from '@/core/algorithms/simulate'
import { productDFA } from '@/core/algorithms/product'
import { DFA } from '@/core/automata/types'

// Unit suite for the product DFA, union and intersection (automata-correctness
// invariant 7).
//
// THE METHOD: the union and intersection laws are decided by LANGUAGE equivalence
// via simulateDFA, never by graph shape (invariant 8). No input is compiled to a
// JS RegExp (threat T-07-TAMPER); source DFAs come through the real pipeline
// parse -> buildNFA -> nfaToDFA. The reachable-only test asserts a count
// structurally (the construction's reachable-pairs contract) but still decides the
// LANGUAGE by simulate. This is the worked-example layer; the set-semantics laws
// over random regexes are the property suite (plan 02).

function dfaFromRegex(regex: string): DFA {
  return nfaToDFA(buildNFA(parse(regex)))
}

describe('productDFA intersection', () => {
  // "contains a" ∩ "contains b" = "contains both". Decided by simulate, never by
  // counting states.
  it('accepts iff both components accept', () => {
    const containsA = dfaFromRegex('(a+b)*a(a+b)*')
    const containsB = dfaFromRegex('(a+b)*b(a+b)*')
    const both = productDFA(containsA, containsB, 'intersection').dfa

    expect(simulateDFA(both, 'ab').accepted).toBe(true)
    expect(simulateDFA(both, 'ba').accepted).toBe(true)
    expect(simulateDFA(both, 'aaa').accepted).toBe(false) // no b
    expect(simulateDFA(both, 'bbb').accepted).toBe(false) // no a
    expect(simulateDFA(both, '').accepted).toBe(false)
  })
})

describe('productDFA union', () => {
  // "contains a" + "contains b" accepts when either symbol is present.
  it('accepts iff either component accepts', () => {
    const containsA = dfaFromRegex('(a+b)*a(a+b)*')
    const containsB = dfaFromRegex('(a+b)*b(a+b)*')
    const either = productDFA(containsA, containsB, 'union').dfa

    expect(simulateDFA(either, 'a').accepted).toBe(true)
    expect(simulateDFA(either, 'b').accepted).toBe(true)
    expect(simulateDFA(either, 'ab').accepted).toBe(true)
    expect(simulateDFA(either, '').accepted).toBe(false) // neither a nor b
  })
})

describe('productDFA alphabet handling', () => {
  // Pitfall 2: disjoint alphabets. A is over {a} only, B is over {a, b}. The product
  // alphabet must be the union {a, b}, and A must be completed over it so a string
  // containing 'b' is handled. With A = "contains a" over {a} and B = "contains b",
  // the union must accept 'b' (B accepts it) even though 'b' is not in A's alphabet.
  it('completes disjoint alphabets over their union', () => {
    const containsA = dfaFromRegex('a*aa*') // contains a, over {a}
    const containsB = dfaFromRegex('(a+b)*b(a+b)*') // contains b, over {a, b}

    expect(containsA.alphabet.has('b')).toBe(false)

    const either = productDFA(containsA, containsB, 'union')
    expect(either.dfa.alphabet).toEqual(new Set(['a', 'b']))

    // The union law holds on a 'b'-containing string even though 'b' is foreign to A.
    expect(simulateDFA(either.dfa, 'b').accepted).toBe(true) // B accepts
    expect(simulateDFA(either.dfa, 'a').accepted).toBe(true) // A accepts
    expect(simulateDFA(either.dfa, '').accepted).toBe(false) // neither

    // Completeness: every (state, symbol) over the union alphabet is defined.
    for (const state of either.dfa.states) {
      const outgoing = either.dfa.transitions.filter((t) => t.from === state.id)
      const symbols = new Set(outgoing.map((t) => t.symbol))
      expect(symbols).toEqual(new Set(['a', 'b']))
    }
  })
})

describe('productDFA reachable-only', () => {
  // Two parity-2 DFAs over {a} that advance in lockstep on every symbol. From the
  // start pair only the diagonal pairs are reachable: (a0,b0) -a-> (a1,b1) -a->
  // (a0,b0). The off-diagonal pairs (a0,b1) and (a1,b0) are NEVER reached, so the
  // product has 2 reachable states, not the full Cartesian 4. A full-product build
  // would wrongly generate all 4.
  const evenA: DFA = {
    states: [{ id: 'a0' }, { id: 'a1' }],
    transitions: [
      { from: 'a0', to: 'a1', symbol: 'a' },
      { from: 'a1', to: 'a0', symbol: 'a' },
    ],
    startState: 'a0',
    acceptStates: ['a0'],
    alphabet: new Set(['a']),
  }
  const evenB: DFA = {
    states: [{ id: 'b0' }, { id: 'b1' }],
    transitions: [
      { from: 'b0', to: 'b1', symbol: 'a' },
      { from: 'b1', to: 'b0', symbol: 'a' },
    ],
    startState: 'b0',
    acceptStates: ['b0'],
    alphabet: new Set(['a']),
  }

  it('generates only reachable pairs, not the full Cartesian product', () => {
    const result = productDFA(evenA, evenB, 'intersection')
    // 2 reachable pairs, hand-computed above; Cartesian would be 4.
    expect(result.dfa.states).toHaveLength(2)
    expect(result.dfa.states.map((s) => s.id).sort()).toEqual([
      '(a0,b0)',
      '(a1,b1)',
    ])
    // Off-diagonal pairs are absent.
    const ids = new Set(result.dfa.states.map((s) => s.id))
    expect(ids.has('(a0,b1)')).toBe(false)
    expect(ids.has('(a1,b0)')).toBe(false)

    // Language is still decided by simulate. Intersection of "even a's" with "even
    // a's" is "even a's": accepts even-length runs of a, rejects odd.
    expect(simulateDFA(result.dfa, '').accepted).toBe(true)
    expect(simulateDFA(result.dfa, 'aa').accepted).toBe(true)
    expect(simulateDFA(result.dfa, 'a').accepted).toBe(false)
    expect(simulateDFA(result.dfa, 'aaa').accepted).toBe(false)
  })
})

describe('productDFA determinism', () => {
  // Pitfall 3: snapshot order must not depend on Map/Set iteration. Two calls on the
  // same inputs must produce identical step counts and identical state arrays.
  it('produces identical steps and states across calls', () => {
    const containsA = dfaFromRegex('(a+b)*a(a+b)*')
    const containsB = dfaFromRegex('(a+b)*b(a+b)*')

    const first = productDFA(containsA, containsB, 'union')
    const second = productDFA(containsA, containsB, 'union')

    expect(first.steps.length).toBe(second.steps.length)
    expect(first.dfa.states.map((s) => s.id)).toEqual(
      second.dfa.states.map((s) => s.id)
    )
    // Step 0 seeds the start pair only; later steps each add one pair in order.
    expect(first.steps[0].added).toBeNull()
    expect(first.steps.map((s) => s.added)).toEqual(
      second.steps.map((s) => s.added)
    )
  })

  it('does not mutate its inputs', () => {
    const containsA = dfaFromRegex('(a+b)*a(a+b)*')
    const containsB = dfaFromRegex('(a+b)*b(a+b)*')
    const aStates = containsA.states.length
    const bStates = containsB.states.length
    productDFA(containsA, containsB, 'intersection')
    expect(containsA.states).toHaveLength(aStates)
    expect(containsB.states).toHaveLength(bStates)
  })
})
