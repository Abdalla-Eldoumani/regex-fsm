// SAFETY-01 for the pumping game. The witness w and the integers p, i originate
// from user input in the view (Plan 03) and cross into the pure game functions.
// Building xy^i z is the one place this phase can allocate without limit: a huge
// p, a long witness, or a large i would let `y.repeat(i)` allocate gigabytes and
// hang the tab (T-08-01, Pitfall 5, ASVS V11/V12). These caps bound every input
// before any string is constructed.
//
// The numbers (research A4): p <= 50 and |w| <= 200 are far above any teaching
// example yet small enough that the pumped string stays tiny; i <= 20 matches
// findPumpExit's candidate range; MAX_PUMPED_LEN = 4000 is the hard ceiling on
// the constructed xy^i z (50 * 20 * a few symbols stays well under it for legal
// inputs, so a real round never trips the guard, but a crafted one does).
//
// Frozen like BOUNDS in automata/types.ts so a caller cannot widen the DoS bound
// at runtime. Kept tiny and pure (no module state) like assertWithinBounds.

export const PUMPING_BOUNDS = Object.freeze({
  MAX_P: 50,
  MAX_WITNESS_LEN: 200,
  MAX_I: 20,
  MAX_PUMPED_LEN: 4000,
} as const)

/**
 * Guard the length of a pumped string before it is built. Call with the computed
 * length (x.length + i * y.length + z.length) BEFORE doing y.repeat(i), so an
 * oversized construction throws instead of allocating. Throws a plain Error (the
 * view turns it into an inline message); the count check fires only strictly over
 * the cap, so a string exactly at MAX_PUMPED_LEN is allowed.
 */
export function assertPumpedLengthWithin(len: number): void {
  if (len > PUMPING_BOUNDS.MAX_PUMPED_LEN) {
    throw new Error('Pumped string is too large to build here.')
  }
}
