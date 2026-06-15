import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { anbn, ww } from '@/core/pumping/nonRegularLanguages'
import { findPumpExit } from '@/core/pumping/pumpingGame'

// Property suite for the non-regular predicates and the non-regularity proof
// itself. This file IS the proof of PUMP-01: the headline property
// "for the canonical witness, EVERY legal split admits a pump exit" is the
// pumping-lemma non-regularity argument expressed as a test.
//
// THE METHOD, copied from tests/core/algorithms/product.property.test.ts:
// exhaustive enumeration over a bounded domain, seeded so any counterexample
// reproduces, decided by the production predicate. Full enumeration of the legal
// splits makes the headline property a DECISION over those splits, not a
// probabilistic sample. Per SKILL.md and the root CLAUDE.md: if a property finds a
// counterexample it becomes a named unit test and the SOURCE (Plan 01) is fixed;
// the property is never loosened and no assertion is weakened.
//
// Threat T-08-04 (test-side injection): the independent reference for a^n b^n uses
// a literal regex /^a*b*$/ ON THE TEST SIDE only. It never compiles user input and
// never ships. Production (nonRegularLanguages.ts) stays no-regex by design; a
// test-side literal regex is therefore a genuinely independent oracle, not a copy
// of the production logic.

const SYMBOLS = ['a', 'b'] as const

// Length bound for the exhaustive membership battery. 2^0 + ... + 2^8 = 511
// strings over {a, b}: every word up to length 8, enumerated in full so the
// predicate-vs-reference check is a decision over the bounded language.
const MAX_STRING_LENGTH = 8

// Every string over SYMBOLS with length in [0, maxLength], enumerated in full.
// Copied from product.property.test.ts (allStringsUpTo) so the battery shape
// matches the established idiom.
function allStringsUpTo(maxLength: number): string[] {
  const out: string[] = ['']
  let frontier: string[] = ['']
  for (let len = 1; len <= maxLength; len++) {
    const next: string[] = []
    for (const prefix of frontier) {
      for (const sym of SYMBOLS) {
        const s = prefix + sym
        out.push(s)
        next.push(s)
      }
    }
    frontier = next
  }
  return out
}

const STRING_BATTERY = allStringsUpTo(MAX_STRING_LENGTH)

// Independent reference for a^n b^n. Uses a literal regex to find a leading a-run
// then a trailing b-run that cover the whole word, then checks the counts are
// equal. This derives membership a different way than the production predicate
// (which counts runs by hand with no regex), so agreement is real corroboration.
function referenceAnbn(s: string): boolean {
  const m = /^(a*)(b*)$/.exec(s)
  if (!m) return false
  return m[1].length === m[2].length
}

// Independent reference for ww. Rebuilds u from the first half and concatenates it
// with itself, then compares to s. Differs from the production predicate (which
// slices and compares halves) by reconstructing the candidate uu directly.
function referenceWw(s: string): boolean {
  if (s.length % 2 !== 0) return false
  const u = s.slice(0, s.length / 2)
  return u + u === s
}

// The regular control for the non-vacuity guard. a^* (zero or more a) IS regular,
// so the pumping lemma HOLDS for it: every split pumps back into a^*. Test-side
// only, a literal regex on a hardcoded pattern (never user input).
const isAStar = (s: string): boolean => /^a*$/.test(s)

describe('non-regular predicate correctness vs an independent reference (PUMP-02)', () => {
  // PROPERTY: anbn.member agrees with referenceAnbn on every word up to length 8.
  // Decided per string over the full battery, seeded. A counterexample becomes a
  // named unit test in nonRegularLanguages.test.ts and the fix is in Plan 01's
  // source, never a loosened reference.
  it('anbn.member equals the reference over the exhaustive battery', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        for (const s of STRING_BATTERY) {
          expect(anbn.member(s)).toBe(referenceAnbn(s))
        }
      }),
      { seed: 0x9001, numRuns: 1 }
    )
  })

  it('ww.member equals the reference over the exhaustive battery', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        for (const s of STRING_BATTERY) {
          expect(ww.member(s)).toBe(referenceWw(s))
        }
      }),
      { seed: 0x9001, numRuns: 1 }
    )
  })

  // NON-VACUITY for the predicate-vs-reference properties: the battery actually
  // contains words the predicate ACCEPTS and words it REJECTS, so the agreement
  // above is not the trivial "everything is false on both sides". Without this, a
  // predicate that returned false for every input would pass against a reference
  // that also did, proving nothing.
  it('the battery exercises both acceptance and rejection for each predicate', () => {
    expect(STRING_BATTERY.some((s) => anbn.member(s))).toBe(true)
    expect(STRING_BATTERY.some((s) => !anbn.member(s))).toBe(true)
    expect(STRING_BATTERY.some((s) => ww.member(s))).toBe(true)
    expect(STRING_BATTERY.some((s) => !ww.member(s))).toBe(true)
  })
})

describe('the non-regularity proof: every legal split admits a pump exit (PUMP-01)', () => {
  // PROPERTY (a^n b^n is not regular). For the canonical witness w = a^p b^p, for
  // EVERY legal split (|xy| <= p, |y| >= 1), there exists a pump exponent i with
  // xy^i z NOT in L. The two nested loops enumerate every such split in full, so
  // this is a decision over all legal splits of w, not a sample. findPumpExit must
  // return a non-null i AND the predicate (the oracle) must reject the built
  // string: the contradiction is verified, never asserted. Seeded so a failure
  // reproduces; on a counterexample, add a named unit test and fix Plan 01's
  // source, never loosen this.
  it('every legal split of a^p b^p admits a predicate-verified pump exit', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), (p) => {
        const w = anbn.witness(p)
        for (let xyLen = 1; xyLen <= p; xyLen++) {
          for (let yLen = 1; yLen <= xyLen; yLen++) {
            const x = w.slice(0, xyLen - yLen)
            const y = w.slice(xyLen - yLen, xyLen)
            const z = w.slice(xyLen)
            const i = findPumpExit(anbn.member, { x, y, z })
            // A contradiction exists for this split.
            expect(i).not.toBeNull()
            // And it is real: the predicate rejects the pumped string.
            expect(anbn.member(x + y.repeat(i!) + z)).toBe(false)
          }
        }
      }),
      { seed: 0x9001, numRuns: 50 }
    )
  })

  // PROPERTY (ww is not regular). Identical enumeration, but over the ww witness
  // a^p b a^p b. The slicing is the same; only the witness differs. |xy| <= p
  // forces the split into the first a-block, and pumping that a-run breaks the
  // halves so no pump exponent keeps the word in ww.
  it('every legal split of a^p b a^p b admits a predicate-verified pump exit', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), (p) => {
        const w = ww.witness(p)
        for (let xyLen = 1; xyLen <= p; xyLen++) {
          for (let yLen = 1; yLen <= xyLen; yLen++) {
            const x = w.slice(0, xyLen - yLen)
            const y = w.slice(xyLen - yLen, xyLen)
            const z = w.slice(xyLen)
            const i = findPumpExit(ww.member, { x, y, z })
            expect(i).not.toBeNull()
            expect(ww.member(x + y.repeat(i!) + z)).toBe(false)
          }
        }
      }),
      { seed: 0x9001, numRuns: 50 }
    )
  })

  // NON-VACUITY (threat T-08-VACUOUS). The headline property must not pass
  // trivially. Two things prove it has teeth:
  //
  // (1) The witness itself is IN L. So "every split admits an exit" is a real
  //     statement about leaving L, not the degenerate "the witness was never in L
  //     to begin with".
  //
  // (2) A REGULAR control. a^* is regular, so the pumping lemma HOLDS for it: a
  //     split of a^p exists that pumps back into a^* for every i. Concretely
  //     x = "", y = "a", z = a^{p-1}: pumping y just changes the number of a's,
  //     which stays in a^*, so findPumpExit returns null. If the headline
  //     assertion (findPumpExit non-null) were run against this regular control it
  //     would FAIL — which is exactly why a non-null result for a^n b^n and ww is a
  //     genuine consequence of their non-regularity and not an artifact of the
  //     enumeration. This mirrors the T-07-VACUOUS guard in
  //     product.property.test.ts.
  it('is non-vacuous: witnesses are in L, and a regular control (a^*) has a split with NO exit', () => {
    for (let p = 1; p <= 12; p++) {
      // (1) Both canonical witnesses are in their language.
      expect(anbn.member(anbn.witness(p))).toBe(true)
      expect(ww.member(ww.witness(p))).toBe(true)

      // (2) The regular control. a^p is in a^*, and the split (x="", y="a",
      // z=a^{p-1}) is legal (|xy| = 1 <= p, |y| = 1). Because a^* is regular,
      // pumping stays in a^*, so there is NO exit: findPumpExit returns null.
      const aStar = 'a'.repeat(p)
      const controlSplit = { x: '', y: 'a', z: 'a'.repeat(p - 1) }
      expect(isAStar(aStar)).toBe(true)
      expect(findPumpExit(isAStar, controlSplit)).toBeNull()
    }
  })
})
