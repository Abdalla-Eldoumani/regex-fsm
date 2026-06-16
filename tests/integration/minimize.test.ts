import { describe, it, expect } from 'vitest'
import { parse, buildNFA, nfaToDFA, minimizeDFA } from '@/core/cachedAlgorithms'
import { simulateDFA } from '@/core/algorithms/simulate'

// Integration coverage for the cached minimize path. minimizeDFA is imported from
// the cached module, which memoizes the result of the real Moore partition-
// refinement implementation. An earlier revision wired this entry to a stub that
// returned the input unchanged, so the test has to distinguish a genuine
// minimization from a pass-through.
//
// A stub returning the input would still satisfy a "no more states than the input"
// bound on its own, so that bound alone is not enough. The anti-stub signal is the
// pair of assertions together: the minimized machine has fewer states than the
// redundant subset DFA AND it accepts exactly the same language. Language equality
// is decided by simulation over a small witness set, never by comparing shape
// (automata-correctness invariant 8).

describe('cached minimizeDFA integration', () => {
  it('returns a genuinely minimized, language-equivalent DFA', () => {
    // (a+b)*abb: union of a and b, starred, then abb. Its subset DFA carries
    // redundant states, so a real minimization must merge some of them.
    const ast = parse('(a+b)*abb')
    const dfa = nfaToDFA(buildNFA(ast))
    const min = minimizeDFA(dfa).dfa

    // Genuinely minimized: minimization never grows the machine, and for this
    // known-reducible input it strictly shrinks it. A stub returning the input
    // would have the same count and fail the strict bound.
    expect(min.states.length).toBeLessThanOrEqual(dfa.states.length)
    expect(min.states.length).toBeLessThan(dfa.states.length)

    // Language preserved: the minimized DFA accepts a string iff the input does,
    // across a witness set that exercises both acceptance (strings ending in abb
    // after any prefix of a and b) and rejection (the empty string, partial and
    // off-pattern words). Decided by simulation, never by shape.
    const witnesses = ['', 'abb', 'aabb', 'ab', 'b', 'ababb', 'abba']
    for (const s of witnesses) {
      expect(simulateDFA(min, s).accepted).toBe(simulateDFA(dfa, s).accepted)
    }
  })
})
