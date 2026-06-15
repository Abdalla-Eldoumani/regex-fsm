import { describe, it, expect } from 'vitest'
import {
  anbn,
  ww,
  anbncn,
  NONREGULAR_LANGUAGES,
} from '@/core/pumping/nonRegularLanguages'

// Unit tests pinning the non-regular membership predicates to the COURSE
// definitions. These predicates are the oracle for the pumping game's
// contradiction (automata-correctness invariant 8: the game verifies, never
// asserts, that xy^i z is out of L). A wrong predicate would silently make every
// "contradiction" a lie, so each documented edge is pinned with a named test.
//
// The named edges come straight from 08-RESEARCH.md:
//   Pitfall 3 — a^n b^n uses n >= 0 (course N0 includes 0), so the empty string
//               (lambda, the n = 0 case) is IN the language. A predicate that
//               rejects "" is wrong against the stated definition.
//   Pitfall 2 — ww = { uu : u in Sigma* } is subtle: even length is necessary but
//               not sufficient; the two halves must be identical. Odd length and
//               unequal halves are the edges that catch a naive predicate.

describe('anbn predicate (PUMP-02, { aⁿbⁿ : n ≥ 0 })', () => {
  // The decisive edge. 08-RESEARCH.md Pitfall 3: the course's N0 includes 0, so
  // lambda is the n = 0 word of a^n b^n. This test name states the intent so a
  // future reader cannot "fix" it to reject "" without confronting the course
  // definition first.
  it('accepts the empty string as the n = 0 case (λ ∈ L because N₀ includes 0)', () => {
    expect(anbn.member('')).toBe(true)
  })

  it.each([
    { s: 'ab', expected: true, why: 'n = 1' },
    { s: 'aabb', expected: true, why: 'n = 2' },
    { s: 'aaabbb', expected: true, why: 'n = 3' },
  ])('accepts $s ($why)', ({ s, expected }) => {
    expect(anbn.member(s)).toBe(expected)
  })

  it.each([
    { s: 'aab', why: 'two a then one b — unequal counts' },
    { s: 'abb', why: 'one a then two b — unequal counts' },
    { s: 'ba', why: 'a b before any a — out of order, the a-run is empty' },
    { s: 'abab', why: 'interleaved — not a-run then b-run' },
    { s: 'b', why: 'a single b — zero a, one b' },
    { s: 'a', why: 'a single a — one a, zero b' },
  ])('rejects $s ($why)', ({ s }) => {
    expect(anbn.member(s)).toBe(false)
  })

  it('generates the proven witness a^p b^p, which is in L', () => {
    // The witness is the prover's starting word: it must satisfy |w| = 2p >= p
    // and be in L so the game's stage 2 is legal. Pin both the exact shape and
    // membership so a regression in witness() is caught here, not in the game.
    expect(anbn.witness(4)).toBe('aaaabbbb')
    expect(anbn.member(anbn.witness(4))).toBe(true)
  })
})

describe('ww predicate (PUMP-02, { uu : u ∈ Σ* })', () => {
  // Length 0 is even and both halves are the empty string, so u = lambda and
  // "" = (lambda)(lambda) is in ww. Mirrors the a^n b^n n = 0 edge.
  it('accepts the empty string (u = λ, so λλ ∈ ww)', () => {
    expect(ww.member('')).toBe(true)
  })

  it.each([
    { s: 'abab', why: 'u = ab, so (ab)(ab)' },
    { s: 'aa', why: 'u = a, so (a)(a)' },
    { s: 'abaaba', why: 'u = aba, so (aba)(aba)' },
  ])('accepts $s ($why)', ({ s }) => {
    expect(ww.member(s)).toBe(true)
  })

  // Odd length can never be uu (a word split into two equal halves has even
  // length). 08-RESEARCH.md Pitfall 2: this is the first thing a correct ww
  // predicate must check.
  it('rejects odd-length strings (uu must have even length)', () => {
    expect(ww.member('aba')).toBe(false)
    expect(ww.member('a')).toBe(false)
    expect(ww.member('ababa')).toBe(false)
  })

  // Even length is necessary but NOT sufficient: the halves must be identical.
  // "ab" is even but its halves "a" and "b" differ, so it is not uu. This is the
  // edge a naive "even length" predicate gets wrong (Pitfall 2).
  it('rejects even-length strings whose halves differ', () => {
    expect(ww.member('ab')).toBe(false)
    expect(ww.member('abba')).toBe(false)
    expect(ww.member('aabb')).toBe(false)
  })

  it('rejects odd-length aab (length 3)', () => {
    expect(ww.member('aab')).toBe(false)
  })

  it('generates the proven witness a^p b a^p b, which is in L', () => {
    // 08-RESEARCH.md Pitfall 2: the witness MUST be a^p b a^p b, not a^p a^p.
    // a^p a^p = a^{2p} stays in ww under pumping (it is still some a^{2m}), so it
    // would prove nothing. a^p b a^p b forces |xy| <= p into the first a-block.
    expect(ww.witness(3)).toBe('aaabaaab')
    expect(ww.member(ww.witness(3))).toBe(true)
  })
})

describe('anbncn predicate (bonus, { aⁿbⁿcⁿ : n ≥ 0 })', () => {
  // The optional bonus language (Assumption A6). Same n >= 0 / lambda-in-L
  // convention as a^n b^n. Included because its predicate is a trivial three-run
  // count and is shipped in Plan 01.
  it('accepts the empty string as the n = 0 case (λ ∈ L)', () => {
    expect(anbncn.member('')).toBe(true)
  })

  it.each([
    { s: 'abc', expected: true, why: 'n = 1' },
    { s: 'aabbcc', expected: true, why: 'n = 2' },
  ])('accepts $s ($why)', ({ s, expected }) => {
    expect(anbncn.member(s)).toBe(expected)
  })

  it.each([
    { s: 'aabbc', why: 'two a, two b, one c — c-run short' },
    { s: 'abcc', why: 'one a, one b, two c — c-run too long' },
    { s: 'aabbcca', why: 'an a after the c-run — out of order' },
  ])('rejects $s ($why)', ({ s }) => {
    expect(anbncn.member(s)).toBe(false)
  })

  it('generates the proven witness a^p b^p c^p, which is in L', () => {
    expect(anbncn.witness(2)).toBe('aabbcc')
    expect(anbncn.member(anbncn.witness(2))).toBe(true)
  })
})

describe('NONREGULAR_LANGUAGES registry', () => {
  it('contains the two required languages anbn and ww', () => {
    // The picker (Plan 03) reads this list; the two phase-gating languages must
    // be present. Compare by identity so a renamed export is caught.
    expect(NONREGULAR_LANGUAGES).toContain(anbn)
    expect(NONREGULAR_LANGUAGES).toContain(ww)
  })

  it('gives every language a unique id', () => {
    // The id keys game state per language (Pitfall 4 staleness guard). A
    // duplicate id would collide two languages' state, so uniqueness is a
    // correctness requirement, not a style preference.
    const ids = NONREGULAR_LANGUAGES.map((lang) => lang.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
