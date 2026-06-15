import type { NonRegularLanguage } from '@/core/pumping/nonRegularLanguages'
import {
  PUMPING_BOUNDS,
  assertPumpedLengthWithin,
} from '@/core/pumping/pumpingBounds'

// The pumping game's pure logic: stage data, move validation, the adversary's
// worst-case split chooser, the predicate-verified contradiction finder, and a
// driver that plays a full demonstration round. No React, no Cytoscape; the view
// (Plan 03) renders the GameState this module produces.
//
// The quantifier structure of the pumping lemma is ∃p ∀w ∃split ∀i. Proving a
// language NON-regular negates it: ∀p ∃w ∀split ∃i with xy^i z ∉ L. The game
// assigns the universally-quantified moves to the adversary (the tool: picks p
// and the WORST split) and the existential moves to the prover (the student:
// picks w and i). A student-chosen split would prove nothing, so the tool must
// pick the split that is hardest to escape (research A2).
//
// Course tie (regex_and_FSMs.pdf §4.3.2, Example 4.24): the repeated block y is
// the course's cycle of edges in the DFA; pumping y is traversing that cycle a
// different number of times. The contradiction here is the same mechanism the
// course uses, just named with the pumping-lemma vocabulary.

/** The five stages of one round, in order. */
export type Stage = 'pick-p' | 'choose-w' | 'split' | 'choose-i' | 'verdict'

/** A split of the witness into w = xyz. */
export interface Split {
  x: string
  y: string
  z: string
}

/** The full state of one round. null fields are moves not yet made. */
export interface GameState {
  languageId: string
  p: number | null
  w: string | null
  split: Split | null
  i: number | null
  /** The verdict: the built string and whether the oracle says it is in L. */
  result: { pumped: string; inLanguage: boolean } | null
  stage: Stage
}

/** A move validation outcome. The view shows `message` when ok is false. */
export type ValidationResult = { ok: true } | { ok: false; message: string }

/**
 * Check the prover's witness against the rules: w must be in L and |w| >= p.
 * Also reject up front when p or |w| exceeds the DoS caps (T-08-01), so an
 * oversized input never reaches string construction.
 */
export function validateWitness(
  lang: NonRegularLanguage,
  p: number,
  w: string
): ValidationResult {
  if (p > PUMPING_BOUNDS.MAX_P) {
    return { ok: false, message: `p must be at most ${PUMPING_BOUNDS.MAX_P}.` }
  }
  if (w.length > PUMPING_BOUNDS.MAX_WITNESS_LEN) {
    return {
      ok: false,
      message: `The witness must be at most ${PUMPING_BOUNDS.MAX_WITNESS_LEN} characters.`,
    }
  }
  if (!lang.member(w)) {
    return { ok: false, message: 'This word is not in the language.' }
  }
  if (w.length < p) {
    return { ok: false, message: 'The witness is shorter than the pumping length p.' }
  }
  return { ok: true }
}

/**
 * Check a split against the pumping-lemma constraints: |xy| <= p and |y| >= 1.
 * These are the conditions the lemma guarantees the adversary can satisfy; the
 * prover must then beat every such split.
 */
export function validateSplit(p: number, split: Split): ValidationResult {
  const xyLen = split.x.length + split.y.length
  if (xyLen > p) {
    return { ok: false, message: 'xy is longer than p.' }
  }
  if (split.y.length < 1) {
    return { ok: false, message: 'y must be non-empty.' }
  }
  return { ok: true }
}

/**
 * The adversary. Return a legal split (|xy| <= p, |y| >= 1) that is hardest to
 * pump out of L. For the canonical witnesses (a^p b^p and a^p b a^p b) the first
 * p characters are all 'a', so |xy| <= p forces y into that first a-block; the
 * adversary's strongest play is a minimal y there: x = '', y = 'a', z = the rest.
 * Pumping that y changes the count of leading a's, which breaks both languages,
 * so findPumpExit is non-null on this split (the per-round guarantee; the
 * every-split proof is the Plan 02 property test).
 *
 * Kept general: y is the first min(p, |w|) >= 1 characters as a single block but
 * clamped to one character, which is the worst case for the count-based
 * predicates and is always legal because witnesses have |w| >= p >= 1.
 */
export function chooseWorstSplit(
  _lang: NonRegularLanguage,
  p: number,
  w: string
): Split {
  // y is one character from the front. With |w| >= p >= 1 this is always legal
  // (|xy| = 1 <= p). For a^p b^p and a^p b a^p b this 'a' sits in the first
  // a-block, the hardest place to escape: changing its multiplicity unbalances
  // the word for every i != 1.
  void p
  return { x: '', y: w.slice(0, 1), z: w.slice(1) }
}

/**
 * The contradiction finder. Given the language oracle and the adversary's split,
 * return a pump exponent i with xy^i z ∉ L, VERIFIED by calling member() on the
 * built string (never asserted — automata-correctness invariant 8). Try i in the
 * order 0, 2, 3, ..., maxI: i = 1 is skipped because xy^1 z = w, which is in L by
 * construction, so it can never be the contradiction. i = 0 (delete y) and i = 2
 * (double y) are the canonical exits. Returns null only when no exit exists
 * within maxI; for a correctly-chosen witness and split that never happens.
 *
 * Bounds: the pumped length is checked with assertPumpedLengthWithin BEFORE
 * y.repeat(i), so a crafted oversized input throws rather than allocating.
 */
export function findPumpExit(
  member: (s: string) => boolean,
  split: Split,
  maxI: number = PUMPING_BOUNDS.MAX_I
): number | null {
  const { x, y, z } = split
  for (let i = 0; i <= maxI; i++) {
    if (i === 1) continue
    assertPumpedLengthWithin(x.length + i * y.length + z.length)
    const pumped = x + y.repeat(i) + z
    if (!member(pumped)) return i
  }
  return null
}

/**
 * Play a full demonstration round with the tool taking all four moves (A2's
 * tool-demonstrates mode): announce p, pick the proven witness, pick the worst
 * split, find a pump exit, and run the oracle on the pumped string. Returns a
 * terminal GameState at the 'verdict' stage. For a^n b^n and ww the verdict's
 * inLanguage is false: a completed, predicate-verified contradiction.
 *
 * If findPumpExit returns null (it must not for the canonical witnesses), i is
 * left null and the verdict reflects the unpumped witness, which stays in L —
 * surfacing the bug rather than faking a contradiction.
 */
export function playDemoRound(lang: NonRegularLanguage, p: number): GameState {
  const w = lang.witness(p)
  const split = chooseWorstSplit(lang, p, w)
  const i = findPumpExit(lang.member, split)
  const exponent = i ?? 1
  assertPumpedLengthWithin(
    split.x.length + exponent * split.y.length + split.z.length
  )
  const pumped = split.x + split.y.repeat(exponent) + split.z
  return {
    languageId: lang.id,
    p,
    w,
    split,
    i,
    result: { pumped, inLanguage: lang.member(pumped) },
    stage: 'verdict',
  }
}
