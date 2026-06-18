import { describe, it, expect } from 'vitest'
import { GNFA_PRESETS, regexToSourceNfa } from '@/core/algorithms/gnfaPresets'
import { simulateNFA } from '@/core/algorithms/simulate'
import type { NFA } from '@/core/automata/types'

// The presets are shipped automata a student reads as ground truth in the
// NFA-to-regex elimination view, so a mislabeled one teaches a false language --
// the exact forbidden failure for a course tool. Each preset is pinned to its
// DOCUMENTED language by simulating it against a hand-checked {a, b} battery and
// asserting acceptance EQUALS a predicate written straight from the label, never
// from the NFA's own shape. If a preset's edges drift, simulateNFA disagrees with
// the predicate and the test goes red.

// A representative battery over {a, b}: empty, every length-1 and length-2 string,
// a few longer ones chosen to separate the languages (e.g. 'abab' vs 'abba',
// 'bba' which contains 'a' but does not end in 'ab').
const BATTERY = [
  '',
  'a',
  'b',
  'aa',
  'ab',
  'ba',
  'bb',
  'aaa',
  'aba',
  'abb',
  'bab',
  'bba',
  'abab',
  'abba',
  'baba',
  'aabb',
  'bbbb',
  'aaaa',
]

function preset(id: string): NFA {
  const found = GNFA_PRESETS.find((p) => p.id === id)
  if (!found) throw new Error(`missing preset ${id}`)
  return found.nfa
}

// Each predicate is the documented language, written independently of the NFA.
const LANGUAGES: Record<string, (s: string) => boolean> = {
  // a*: zero or more a's, no other symbol.
  'a-star': (s) => /^a*$/.test(s),
  // a + b: exactly the single-symbol strings "a" and "b".
  'a-or-b': (s) => s === 'a' || s === 'b',
  // ends in "ab" over {a, b}.
  'ends-in-ab': (s) => s.endsWith('ab'),
  // (ab)*: empty or one-or-more repetitions of "ab".
  'ab-star': (s) => /^(ab)*$/.test(s),
  // contains at least one 'a'.
  'contains-a': (s) => s.includes('a'),
}

describe('gnfaPresets', () => {
  it('exposes exactly the five documented presets by id', () => {
    expect(GNFA_PRESETS.map((p) => p.id).sort()).toEqual(
      ['a-or-b', 'a-star', 'ab-star', 'contains-a', 'ends-in-ab'],
    )
  })

  for (const id of Object.keys(LANGUAGES)) {
    it(`preset "${id}" recognizes its documented language across the battery`, () => {
      const nfa = preset(id)
      const accepts = LANGUAGES[id]
      for (const s of BATTERY) {
        expect(simulateNFA(nfa, s).accepted).toBe(accepts(s))
      }
    })
  }

  // A couple of explicit, named cases so a regression names the exact string, on
  // top of the battery sweep.
  it('a-or-b rejects the empty string and any two-symbol string', () => {
    const nfa = preset('a-or-b')
    expect(simulateNFA(nfa, '').accepted).toBe(false)
    expect(simulateNFA(nfa, 'ab').accepted).toBe(false)
    expect(simulateNFA(nfa, 'aa').accepted).toBe(false)
  })

  it('ends-in-ab accepts "ab" and "abab" but rejects "aba" and "abb"', () => {
    const nfa = preset('ends-in-ab')
    expect(simulateNFA(nfa, 'ab').accepted).toBe(true)
    expect(simulateNFA(nfa, 'abab').accepted).toBe(true)
    expect(simulateNFA(nfa, 'aba').accepted).toBe(false)
    expect(simulateNFA(nfa, 'abb').accepted).toBe(false)
  })

  it('ab-star accepts empty and "abab" but rejects "abba" and a lone "a"', () => {
    const nfa = preset('ab-star')
    expect(simulateNFA(nfa, '').accepted).toBe(true)
    expect(simulateNFA(nfa, 'abab').accepted).toBe(true)
    expect(simulateNFA(nfa, 'abba').accepted).toBe(false)
    expect(simulateNFA(nfa, 'a').accepted).toBe(false)
  })

  describe('regexToSourceNfa', () => {
    it('builds a source NFA for a valid regex', () => {
      const nfa = regexToSourceNfa('a + b')
      // Same documented language as the a-or-b preset: exactly "a" or "b".
      expect(simulateNFA(nfa, 'a').accepted).toBe(true)
      expect(simulateNFA(nfa, 'b').accepted).toBe(true)
      expect(simulateNFA(nfa, '').accepted).toBe(false)
      expect(simulateNFA(nfa, 'ab').accepted).toBe(false)
    })

    it('does not swallow a parse error: a double quantifier throws (T-06-07)', () => {
      // The parser rejects a quantifier following a quantifier; regexToSourceNfa
      // surfaces the throw rather than returning a bogus NFA.
      expect(() => regexToSourceNfa('a**')).toThrow()
    })
  })
})
