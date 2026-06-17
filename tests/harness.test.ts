import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// Harness proof only: confirms fast-check resolves and can drive a property under
// Vitest. The deep algorithm property suite (determinize/minimize/complement
// invariants required by the automata-correctness skill) lands in Phase 14, not here.
describe('fast-check harness', () => {
  it('string concatenation length is additive', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        expect((a + b).length).toBe(a.length + b.length)
      }),
    )
  })
})
