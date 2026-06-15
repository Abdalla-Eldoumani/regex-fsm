import { describe, it, expect } from 'vitest'
import { parse, buildNFA } from '@/core/cachedAlgorithms'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateDFA } from '@/core/algorithms/simulate'
import { CHALLENGES } from '@/core/challenges/bank'

// Bank-reference correctness (CHALLENGE-03). Each exercise's reference regex must
// denote exactly the language its prompt describes. We do not eyeball the regex: we
// build the reference DFA over the exercise alphabet and run simulateDFA on an
// explicit accept-list and reject-list, so a mis-authored reference fails here
// before it can ship (automata-correctness "How to verify"). No input is compiled to
// a JS RegExp; the reference flows through the real parse -> buildNFA -> nfaToDFA
// pipeline.

// The accept/reject table per exercise id. The lists include the empty string where
// membership of the empty string is meaningful, and the counting reference is pinned
// past one a on both sides of the parity so a subtly wrong regex cannot pass.
const TABLE: Record<string, { accept: string[]; reject: string[] }> = {
  // ends in "ab": the empty string and a lone "a"/"b" are rejected.
  'dfa-ends-ab': {
    accept: ['ab', 'aab', 'bab', 'abab', 'bbbab'],
    reject: ['', 'a', 'b', 'ba', 'abb', 'aba'],
  },
  // even number of a's: the empty string (zero a's) is accepted, as are strings of
  // b's only. Pinned past one: "aaaa" and "aabaa" (four a's, even) accept, "aaa" and
  // "a" (odd) reject, so a regex that only handles zero or two a's cannot pass.
  'dfa-even-as': {
    accept: ['', 'b', 'bb', 'aa', 'aab', 'aba', 'baab', 'abba', 'aaaa', 'aabaa'],
    reject: ['a', 'aaa', 'ba', 'bab', 'bba'],
  },
  // contains "aa": the empty string and any aa-free string are rejected.
  'nfa-contains-aa': {
    accept: ['aa', 'aaa', 'aab', 'baa', 'baab', 'aabb'],
    reject: ['', 'a', 'b', 'ab', 'ba', 'bab', 'abab'],
  },
  // starts with "a": the empty string and anything starting with "b" are rejected.
  'nfa-starts-a': {
    accept: ['a', 'aa', 'ab', 'abba', 'ababab'],
    reject: ['', 'b', 'ba', 'bb', 'bab'],
  },
  // ends in "b": the empty string and anything ending in "a" are rejected.
  'regex-ends-b': {
    accept: ['b', 'ab', 'bb', 'aab', 'abb', 'bbb'],
    reject: ['', 'a', 'ba', 'aba', 'aa'],
  },
}

describe('challenge bank', () => {
  it('gives every exercise a unique id and a parseable reference', () => {
    const ids = CHALLENGES.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of CHALLENGES) {
      expect(() => parse(c.reference)).not.toThrow()
    }
  })

  it('covers all three course exercise types', () => {
    const types = new Set(CHALLENGES.map(c => c.type))
    expect(types.has('dfa')).toBe(true)
    expect(types.has('nfa')).toBe(true)
    expect(types.has('regex')).toBe(true)
  })

  it('pins every exercise with an accept/reject table', () => {
    // The table must cover every shipped exercise, so a new exercise without a table
    // fails here rather than shipping ungated.
    for (const c of CHALLENGES) {
      expect(TABLE[c.id], `missing accept/reject table for ${c.id}`).toBeDefined()
    }
  })

  for (const c of CHALLENGES) {
    it(`${c.id} reference denotes the language its prompt describes`, () => {
      const table = TABLE[c.id]
      const dfa = nfaToDFA(buildNFA(parse(c.reference)), new Set(c.alphabet))
      for (const s of table.accept) {
        expect(simulateDFA(dfa, s).accepted, `expected to accept "${s}"`).toBe(true)
      }
      for (const s of table.reject) {
        expect(simulateDFA(dfa, s).accepted, `expected to reject "${s}"`).toBe(false)
      }
    })
  }
})
