import { BOUNDS, TooLargeError } from '../automata/types'

// SAFETY-01. The one shared guard every bounded construction calls. It is the
// resource-limit control (ASVS V11/V12): a 2^n determinization or a runaway
// loop crosses one of these limits and throws TooLargeError instead of hanging
// the tab. Kept tiny and pure (no module state) so subset.ts and brzozowski.ts
// share exactly one bound, not per-algorithm copies.
//
// Contract: call AFTER a newly discovered state is recorded, never on the
// success path of a small construction. The count check fires only on strictly
// greater than the cap, so a construction that lands exactly at the cap is not
// rejected; the existing exact-acceptance suite (all well under 256) never
// trips it. performance.now() is available in Node, jsdom, and the browser.
export function assertWithinBounds(
  count: number,
  deadlineMs: number,
  startedAt: number
): void {
  if (count > BOUNDS.MAX_DFA_STATES) {
    throw new TooLargeError('state-cap', BOUNDS.MAX_DFA_STATES, { states: count })
  }

  if (performance.now() - startedAt > deadlineMs) {
    throw new TooLargeError('time-budget', deadlineMs, { states: count })
  }
}

// Re-exported so callers can pull the limits and the guard from one module.
export { BOUNDS, TooLargeError }
