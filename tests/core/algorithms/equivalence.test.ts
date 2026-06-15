import { describe, it, expect } from 'vitest'
import { parse } from '@/core/cachedAlgorithms'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { equivalence } from '@/core/algorithms/equivalence'
import { DFA, TooLargeError } from '@/core/automata/types'

// Unit suite for language equivalence with the shortest counterexample
// (CHALLENGE-01/02, automata-correctness invariant 8).
//
// THE METHOD: every verdict is decided by the returned object, never by graph
// shape. Two answers of different shape that denote the same language must both
// return equivalent:true. A wrong answer must carry a concrete shortest string and
// the direction of the error. No input is compiled to a JS RegExp (threat
// T-09-02); the source DFAs come through the real pipeline parse -> buildNFA ->
// nfaToDFA. The argument order is fixed: the first DFA is the student, the second
// is the reference, so acceptedBy 'student' means the student wrongly accepts and
// 'reference' means the student wrongly rejects.

const SIGMA = new Set(['a', 'b'])
const dfa = (re: string): DFA => nfaToDFA(buildNFA(parse(re)), SIGMA)

// A non-accepting cycle DFA over {a} that returns to start every m symbols. Its
// language is empty, so two such cycles are language-equivalent and the walk never
// finds a witness: it explores every reachable product pair. Two cycles of coprime
// length m and n have lcm(m, n) = m*n reachable pairs along the diagonal, so a
// coprime pair past the 256-pair cap exercises the equivalence walk's OWN bound
// (SAFETY-01, threat T-09-01) rather than tripping the cap during determinization
// and rather than short-circuiting at an early distinguishing string.
function emptyCycle(prefix: string, m: number): DFA {
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

describe('equivalence', () => {
  it('equal languages with DIFFERENT shapes return equivalent', () => {
    // Σ* denoted two ways. Same language, different machines; the verdict is decided
    // by language, not by shape (invariant 8).
    expect(equivalence(dfa('(a + b)*'), dfa('(a + b)*'), SIGMA)).toEqual({
      equivalent: true,
    })
    expect(
      equivalence(dfa('(a + b)*'), dfa('λ + (a + b)(a + b)*'), SIGMA)
    ).toEqual({ equivalent: true })
  })

  it('returns the SHORTEST counterexample', () => {
    // student a* vs reference (a + b)*: the shortest string only the reference
    // accepts is "b" (length 1). The reference accepts it, the student does not, so
    // the student wrongly rejects it.
    const v = equivalence(dfa('a*'), dfa('(a + b)*'), SIGMA)
    expect(v.equivalent).toBe(false)
    if (!v.equivalent) {
      expect(v.counterexample.length).toBe(1)
      expect(v.counterexample).toBe('b')
      expect(v.acceptedBy).toBe('reference')
    }
  })

  it('reports wrongly ACCEPTED when the student over-accepts', () => {
    // student (a + b)* vs reference a*: the student accepts "b", the reference
    // rejects it, so the student wrongly accepts.
    const v = equivalence(dfa('(a + b)*'), dfa('a*'), SIGMA)
    expect(v.equivalent).toBe(false)
    if (!v.equivalent) {
      expect(v.acceptedBy).toBe('student')
      expect(v.counterexample).toBe('b')
    }
  })

  it('treats the empty string as a valid shortest counterexample', () => {
    // reference a* accepts the empty string, student a a* does not. The witness is
    // the start pair itself, so the counterexample is "" and the view renders it as
    // λ. The student wrongly rejects the empty string.
    const v = equivalence(dfa('a a*'), dfa('a*'), SIGMA)
    expect(v.equivalent).toBe(false)
    if (!v.equivalent) {
      expect(v.counterexample).toBe('')
      expect(v.acceptedBy).toBe('reference')
    }
  })

  it('surfaces TooLargeError when the product exceeds the bound', () => {
    // Two coprime empty-language cycles over {a}: 17 * 16 = 272 reachable product
    // pairs, past the 256-pair cap. Both inputs are small (well under the cap) and
    // language-equivalent (so the walk never short-circuits at a witness), so the
    // throw comes from the equivalence walk's own pair-count guard, not from
    // determinization. The walk must throw rather than hang (SAFETY-01).
    const student = emptyCycle('p', 17)
    const reference = emptyCycle('q', 16)
    const onlyA = new Set(['a'])
    const run = () => equivalence(student, reference, onlyA)
    expect(run).toThrow(TooLargeError)
  })
})
