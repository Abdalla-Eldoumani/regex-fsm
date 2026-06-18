import { describe, it, expect } from 'vitest'
import { parse } from '@/core/cachedAlgorithms'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateDFA } from '@/core/algorithms/simulate'
import { productDFA } from '@/core/algorithms/product'
import { DFA, TooLargeError } from '@/core/automata/types'

// Unit suite for the product DFA, union and intersection (automata-correctness
// invariant 7).
//
// THE METHOD: the union and intersection laws are decided by LANGUAGE equivalence
// via simulateDFA, never by graph shape (invariant 8). No input is compiled to a
// JS RegExp (threat T-07-TAMPER); source DFAs come through the real pipeline
// parse -> buildNFA -> nfaToDFA. The reachable-only test asserts a count
// structurally (the construction's reachable-pairs contract) but still decides the
// LANGUAGE by simulate. This is the worked-example layer; the set-semantics laws
// over random regexes are the property suite.

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

describe('productDFA bound (SAFETY-01, threat T-07-DOS)', () => {
  // A non-accepting cycle over {a} that returns to start every m symbols. Two such
  // cycles of COPRIME length advance in lockstep on 'a', and by CRT the product
  // reaches all m*n diagonal pairs. With m=17, n=16 that is 272 reachable pairs,
  // past the 256 cap, so the product's own seen.size guard throws. Both inputs stay
  // over {a} only so completeDFA adds no trap and the pair count is exactly m*n.
  function cycle(prefix: string, m: number): DFA {
    const states = Array.from({ length: m }, (_, i) => ({ id: `${prefix}${i}` }))
    const transitions = Array.from({ length: m }, (_, i) => ({
      from: `${prefix}${i}`,
      to: `${prefix}${(i + 1) % m}`,
      symbol: 'a',
    }))
    return {
      states,
      transitions,
      startState: `${prefix}0`,
      acceptStates: [],
      alphabet: new Set(['a']),
    }
  }

  it('throws TooLargeError when the product exceeds MAX_DFA_STATES', () => {
    const a = cycle('p', 17)
    const b = cycle('q', 16) // 17 * 16 = 272 reachable pairs > 256
    expect(() => productDFA(a, b, 'intersection')).toThrow(TooLargeError)
  })

  it('does not throw for a small product well under the cap', () => {
    const a = cycle('p', 3)
    const b = cycle('q', 4) // 12 reachable pairs, safe
    expect(() => productDFA(a, b, 'union')).not.toThrow()
  })
})

describe('productDFA disjoint alphabets (Pitfall 2)', () => {
  // A accepts a+ over {a} ONLY; B accepts b+ over {b} ONLY -- the alphabets are
  // DISJOINT. This is the crux of Pitfall 2: completion runs over the merged {a, b}
  // FIRST, so A gains a 'b'-edge to a trap and a single 'b' kills A forever. Hence
  // A's language over {a, b} is exactly a+ (all-a, at least one a), NOT "contains
  // an a"; likewise B is b+. The product must run over {a, b}, be complete, and
  // compute the set law on these COMPLETED languages: a+ ∩ b+ = empty, a+ ∪ b+.
  const aPlus: DFA = {
    states: [{ id: 'sa0' }, { id: 'sa1' }],
    transitions: [
      { from: 'sa0', to: 'sa1', symbol: 'a' },
      { from: 'sa1', to: 'sa1', symbol: 'a' },
    ],
    startState: 'sa0',
    acceptStates: ['sa1'],
    alphabet: new Set(['a']),
  }
  const bPlus: DFA = {
    states: [{ id: 'sb0' }, { id: 'sb1' }],
    transitions: [
      { from: 'sb0', to: 'sb1', symbol: 'b' },
      { from: 'sb1', to: 'sb1', symbol: 'b' },
    ],
    startState: 'sb0',
    acceptStates: ['sb1'],
    alphabet: new Set(['b']),
  }

  it('builds over the merged alphabet and stays complete', () => {
    const result = productDFA(aPlus, bPlus, 'intersection')
    expect(result.dfa.alphabet).toEqual(new Set(['a', 'b']))
    // Completeness: every state has exactly |Σ| = 2 outgoing transitions, one per
    // merged symbol. Disjoint inputs would be incomplete without the completion step.
    for (const state of result.dfa.states) {
      const outgoing = result.dfa.transitions.filter((t) => t.from === state.id)
      const symbols = new Set(outgoing.map((t) => t.symbol))
      expect(symbols).toEqual(new Set(['a', 'b']))
    }
  })

  it('intersection of a+ and b+ is the empty language', () => {
    // No string can be all-a and all-b at once, so the intersection accepts nothing.
    const both = productDFA(aPlus, bPlus, 'intersection').dfa
    for (const s of ['', 'a', 'b', 'aa', 'bb', 'ab', 'ba', 'aab', 'abab']) {
      expect(simulateDFA(both, s).accepted).toBe(false)
    }
  })

  it('union accepts a+ or b+, and a mixed string is rejected', () => {
    const either = productDFA(aPlus, bPlus, 'union').dfa
    // In a+ or b+.
    expect(simulateDFA(either, 'a').accepted).toBe(true)
    expect(simulateDFA(either, 'b').accepted).toBe(true)
    expect(simulateDFA(either, 'aa').accepted).toBe(true)
    expect(simulateDFA(either, 'bbb').accepted).toBe(true)
    // Mixing a and b leaves both languages, so the union rejects it. The empty
    // string is in neither a+ nor b+ either.
    expect(simulateDFA(either, '').accepted).toBe(false)
    expect(simulateDFA(either, 'ab').accepted).toBe(false)
    expect(simulateDFA(either, 'ba').accepted).toBe(false)
  })
})
