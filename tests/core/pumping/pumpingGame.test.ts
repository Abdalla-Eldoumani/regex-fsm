import { describe, it, expect } from 'vitest'
import { anbn, ww } from '@/core/pumping/nonRegularLanguages'
import {
  findPumpExit,
  chooseWorstSplit,
  validateWitness,
  validateSplit,
  playDemoRound,
} from '@/core/pumping/pumpingGame'
import { PUMPING_BOUNDS } from '@/core/pumping/pumpingBounds'

// Unit tests for the pumping game's pure logic: the contradiction finder, the
// adversary's worst-split chooser, move validation, and full-round completion for
// the two phase-gating languages. The game NEVER asserts a contradiction; it runs
// the predicate (the oracle) on the built string (automata-correctness invariant
// 8). These tests pin that discipline and the two phase success criteria at the
// logic layer: a full round completes in a real, verified contradiction for
// a^n b^n AND ww.
//
// 08-01-SUMMARY.md gotcha: findPumpExit's candidate order is 0, 2, 3, ..., maxI
// (i = 1 is skipped because xy^1 z = w is in L by construction). For the canonical
// witness + chooseWorstSplit the returned exit is i = 0 (deleting the single a
// unbalances the word). Tests assert the exit is one of the canonical exits {0, 2}
// and, decisively, that the predicate rejects the pumped string.

describe('findPumpExit (PUMP-01 contradiction finder)', () => {
  it('returns a predicate-verified exit for the worst split of a^n b^n', () => {
    // chooseWorstSplit puts y in the first a-block. Deleting or doubling it breaks
    // the equal-count balance, so the predicate rejects the pumped string.
    const w = anbn.witness(4)
    const split = chooseWorstSplit(anbn, 4, w)
    const i = findPumpExit(anbn.member, split)
    expect(i).not.toBeNull()
    // i = 0 (delete y) and i = 2 (double y) are the canonical exits; the worst
    // split returns 0 because i is tried before 2.
    expect([0, 2]).toContain(i)
    expect(anbn.member(split.x + split.y.repeat(i!) + split.z)).toBe(false)
  })

  it('returns a predicate-verified exit for the worst split of ww', () => {
    const w = ww.witness(3)
    const split = chooseWorstSplit(ww, 3, w)
    const i = findPumpExit(ww.member, split)
    expect(i).not.toBeNull()
    expect(ww.member(split.x + split.y.repeat(i!) + split.z)).toBe(false)
  })

  it('finds an exit for a direct a-block split of a^4 b^4', () => {
    // Pumping y = "a" inside a^4 b^4. Deleting it gives a^3 b^4 (out of L); the
    // candidate order returns i = 0. Either canonical exit is acceptable as long as
    // the predicate confirms the pumped string is out.
    const split = { x: '', y: 'a', z: 'aaabbbb' }
    const i = findPumpExit(anbn.member, split)
    expect(i).not.toBeNull()
    expect([0, 2]).toContain(i)
    expect(anbn.member(split.x + split.y.repeat(i!) + split.z)).toBe(false)
  })
})

describe('chooseWorstSplit (the adversary)', () => {
  it('returns a legal split (|xy| <= p, |y| >= 1) for both languages', () => {
    // The adversary must obey the lemma's own constraints, otherwise the round is
    // not a valid pumping argument. Confirm legality through validateSplit.
    const splitA = chooseWorstSplit(anbn, 4, anbn.witness(4))
    expect(validateSplit(4, splitA)).toEqual({ ok: true })

    const splitW = chooseWorstSplit(ww, 3, ww.witness(3))
    expect(validateSplit(3, splitW)).toEqual({ ok: true })
  })

  it('puts y in the first a-block so xyz reconstructs the witness', () => {
    // The split must be a real partition of w: x + y + z === w. A chooser that
    // dropped or duplicated characters would silently corrupt the proof.
    const w = anbn.witness(5)
    const split = chooseWorstSplit(anbn, 5, w)
    expect(split.x + split.y + split.z).toBe(w)
    expect(split.y.length).toBeGreaterThanOrEqual(1)
  })
})

describe('validateWitness (PUMP-01 move validation)', () => {
  it('accepts a witness in L with |w| >= p', () => {
    expect(validateWitness(anbn, 2, 'aabb')).toEqual({ ok: true })
  })

  it('rejects a witness not in L with a message', () => {
    // "aba" is not a^n b^n. The prover may only start from a word in L.
    const result = validateWitness(anbn, 2, 'aba')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toMatch(/language/i)
    }
  })

  it('rejects a witness shorter than p with a message mentioning p', () => {
    // |w| >= p is required by the lemma. "aabb" has length 4 < 10.
    const result = validateWitness(anbn, 10, 'aabb')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toMatch(/p|pumping length/i)
    }
  })

  it('rejects p over the DoS cap before any other check (T-08-01)', () => {
    // 08-01-SUMMARY.md gotcha: validateWitness checks the caps FIRST so an
    // oversized input never reaches string construction. Use a witness that is
    // otherwise valid so the only failure is the cap.
    const result = validateWitness(anbn, PUMPING_BOUNDS.MAX_P + 1, 'aabb')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain(String(PUMPING_BOUNDS.MAX_P))
    }
  })

  it('rejects a witness over the length cap (T-08-01)', () => {
    const longWitness = 'a'.repeat(PUMPING_BOUNDS.MAX_WITNESS_LEN + 1)
    const result = validateWitness(anbn, 2, longWitness)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain(String(PUMPING_BOUNDS.MAX_WITNESS_LEN))
    }
  })
})

describe('validateSplit (PUMP-01 split-constraint enforcement)', () => {
  it('accepts a split with |xy| <= p and |y| >= 1', () => {
    // |xy| = 3 <= 4, |y| = 1: a legal split.
    expect(validateSplit(4, { x: 'aa', y: 'a', z: 'bbbb' })).toEqual({ ok: true })
  })

  it('rejects |xy| > p with a message', () => {
    // |xy| = 5 > 4: the lemma guarantees the adversary can keep xy within the
    // first p characters, so a split exceeding p is illegal.
    const result = validateSplit(4, { x: 'aaaa', y: 'b', z: 'bbb' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toMatch(/xy/i)
    }
  })

  it('rejects |y| < 1 with a message', () => {
    // y must be non-empty: pumping an empty y changes nothing, so an empty y can
    // never produce a contradiction.
    const result = validateSplit(4, { x: '', y: '', z: 'aaaabbbb' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toMatch(/y/i)
    }
  })
})

describe('playDemoRound full-round completion (the two phase success criteria)', () => {
  // The phase gates on a FULL round completing in a real contradiction for
  // a^n b^n AND ww. Iterate p over several values so completion is not a
  // single-p fluke; each verdict's inLanguage is the oracle's answer on the built
  // string, not an assertion.
  it.each([2, 5, 12])('completes a contradiction round for a^n b^n at p = %i', (p) => {
    const g = playDemoRound(anbn, p)
    expect(g.stage).toBe('verdict')
    expect(g.result?.inLanguage).toBe(false)
    // The terminal state carries a concrete pumped string and the split that
    // produced it, evidence that all stages ran.
    expect(g.split).not.toBeNull()
    expect(g.result?.pumped).toBeTypeOf('string')
    expect(g.result?.pumped.length).toBeGreaterThan(0)
  })

  it.each([2, 5, 12])('completes a contradiction round for ww at p = %i', (p) => {
    const g = playDemoRound(ww, p)
    expect(g.stage).toBe('verdict')
    expect(g.result?.inLanguage).toBe(false)
    expect(g.split).not.toBeNull()
    expect(g.result?.pumped).toBeTypeOf('string')
    expect(g.result?.pumped.length).toBeGreaterThan(0)
  })

  it('reports the language id and the chosen witness in the terminal state', () => {
    // The view keys off languageId (Pitfall 4 staleness guard) and renders w, so
    // both must survive into the verdict state.
    const g = playDemoRound(anbn, 5)
    expect(g.languageId).toBe(anbn.id)
    expect(g.w).toBe(anbn.witness(5))
  })
})
