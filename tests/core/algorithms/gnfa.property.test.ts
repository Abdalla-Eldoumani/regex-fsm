import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateNFA, simulateDFA } from '@/core/algorithms/simulate'
import {
  nfaToRegex,
  eliminate,
  toRegexNode,
  GNFA_START,
  GNFA_ACCEPT,
  type GnfaLabel,
  type GnfaSnapshot,
  type GnfaBuild,
} from '@/core/algorithms/gnfa'
import { NFA, Transition } from '@/core/automata/types'

// Property suite for GNFA state elimination (NFA -> regex). This file IS the proof
// of automata-correctness invariant 6: state elimination preserves the language at
// EVERY elimination step. It is the loop invariant of the procedure -- after
// removing any state, the generalized automaton recognizes the same language -- and
// it is only real if a seeded property test asserts it against simulate.
//
// THE METHOD, copied from minimize.property.test.ts: generate random small NFAs,
// decide language equivalence over an EXHAUSTIVE bounded string battery (full
// enumeration, not sampling), decided ONLY by simulate. No `new RegExp` (threat
// T-03-04), no shape or string comparison (skill invariant 8). The seed is fixed so
// any counterexample reproduces; per the project conventions, a
// counterexample becomes a named unit test in gnfa.test.ts and the ALGORITHM in
// gnfa.ts is fixed -- the property is never loosened and no assertion is weakened.

const SYMBOLS = ['a', 'b'] as const
const MAX_LEN = 6

// Every string over SYMBOLS with length in [0, maxLength], enumerated in full.
// Length 6 over {a, b} is 2^0 + ... + 2^6 = 127 strings. A full enumeration is a
// DECISION over the bounded language, not a probabilistic spot check.
function allStringsUpTo(symbols: readonly string[], maxLength: number): string[] {
  const out: string[] = ['']
  let frontier: string[] = ['']
  for (let len = 1; len <= maxLength; len++) {
    const next: string[] = []
    for (const prefix of frontier) {
      for (const s of symbols) {
        const word = prefix + s
        out.push(word)
        next.push(word)
      }
    }
    frontier = next
  }
  return out
}

const BATTERY = allStringsUpTo(SYMBOLS, MAX_LEN)

// The language of a single GNFA snapshot, as a RegexNode (or the empty language).
//
// 06-RESEARCH design note: the honest interpretation of "the partial GNFA's
// language" is to run the SAME elimination to completion on a COPY of the
// snapshot's own edges -- treating the snapshot's START/ACCEPT markers -- and read
// off the single START->ACCEPT label. This reuses the algorithm under test on a
// sub-instance, so the per-step property genuinely checks that the partial machine
// recognizes L(source) rather than re-deriving it from the source NFA.
//
// A snapshot stores edges as a list; rebuild the sparse LabelStore the GnfaBuild
// expects, then call the exported eliminate(). Because eliminate works on a private
// copy of the store, the snapshot's own labels are never mutated.
function languageOfGnfaSnapshot(snap: GnfaSnapshot): { isEmpty: boolean; regex: ReturnType<typeof toRegexNode> | null } {
  const store = new Map<string, Map<string, GnfaLabel>>()
  for (const edge of snap.edges) {
    let inner = store.get(edge.from)
    if (!inner) {
      inner = new Map<string, GnfaLabel>()
      store.set(edge.from, inner)
    }
    inner.set(edge.to, edge.label)
  }

  const build: GnfaBuild = {
    start: GNFA_START,
    accept: GNFA_ACCEPT,
    states: snap.states,
    store,
  }

  const { finalLabel } = eliminate(build)
  if (finalLabel.type === 'emptyset') return { isEmpty: true, regex: null }
  return { isEmpty: false, regex: toRegexNode(finalLabel) }
}

// Decide whether a collapsed snapshot language accepts s, via the skill equivalence
// path: empty language accepts nothing; otherwise convert to a DFA and simulate.
// NEVER `new RegExp`.
function acceptsLang(lang: { isEmpty: boolean; regex: ReturnType<typeof toRegexNode> | null }, s: string): boolean {
  if (lang.isEmpty) return false
  return simulateDFA(nfaToDFA(buildNFA(lang.regex!)), s).accepted
}

// A valid small NFA over {a, b}: 1-4 states named q0..qN, start q0, a random accept
// subset, and random transitions including self-loops, parallel edges on different
// symbols, and lambda (symbol null) edges. Kept deliberately small so the battery
// decides the language in full and the determinized DFA stays far under
// BOUNDS.MAX_DFA_STATES (T-06-05: if a future widening ever trips TooLargeError, the
// fix is to shrink this arbitrary, never to catch the error).
function smallNfaArb(): fc.Arbitrary<NFA> {
  return fc.integer({ min: 1, max: 4 }).chain((stateCount) => {
    const ids = Array.from({ length: stateCount }, (_, i) => `q${i}`)

    // An edge is (fromIndex, toIndex, symbol|null). Indices reference existing
    // states by construction, so the NFA is always structurally valid.
    const edgeArb = fc.record({
      from: fc.integer({ min: 0, max: stateCount - 1 }),
      to: fc.integer({ min: 0, max: stateCount - 1 }),
      symbol: fc.constantFrom<'a' | 'b' | null>('a', 'b', null),
    })

    return fc
      .record({
        accepts: fc.subarray(ids, { minLength: 0, maxLength: stateCount }),
        edges: fc.array(edgeArb, { minLength: 0, maxLength: 8 }),
      })
      .map(({ accepts, edges }) => {
        const transitions: Transition[] = edges.map((e) => ({
          from: ids[e.from],
          to: ids[e.to],
          symbol: e.symbol,
        }))
        // Alphabet is the set of non-null symbols actually used. The battery still
        // spans {a, b}; a string over an absent symbol is rejected by both the
        // source NFA and the produced regex, so the comparison stays consistent.
        const alphabet = new Set<string>()
        for (const t of transitions) {
          if (t.symbol !== null) alphabet.add(t.symbol)
        }
        const nfa: NFA = {
          states: ids.map((id) => ({ id })),
          transitions,
          startState: 'q0',
          acceptStates: accepts,
          alphabet,
        }
        return nfa
      })
  })
}

describe('GNFA state elimination preserves the language (N2R-03, invariant 6)', () => {
  // PROPERTY 1 (PER-STEP): every intermediate elimination snapshot recognizes
  // L(source). Collapse each snapshot to a regex IN A COPY (run elimination to
  // completion on its own edges), then compare its language to the source NFA over
  // the full battery, decided by simulate. This is the loop invariant itself.
  it('every elimination snapshot recognizes the source language (over the battery)', () => {
    fc.assert(
      fc.property(smallNfaArb(), (nfa) => {
        const { steps } = nfaToRegex(nfa)
        for (const snap of steps) {
          const lang = languageOfGnfaSnapshot(snap)
          for (const s of BATTERY) {
            expect(acceptsLang(lang, s)).toBe(simulateNFA(nfa, s).accepted)
          }
        }
      }),
      { seed: 0x6f2a, numRuns: 100 }
    )
  })

  // PROPERTY 2 (FINAL): the produced regex is language-equivalent to the source.
  // parse-free path: toRegexNode -> buildNFA -> nfaToDFA, compared to the source's
  // own DFA over the battery, decided by simulate. The empty-language terminal
  // (isEmptyLanguage) rejects everything, which must match a no-accepting-path NFA.
  it('the final regex is language-equivalent to the source NFA (over the battery)', () => {
    fc.assert(
      fc.property(smallNfaArb(), (nfa) => {
        const result = nfaToRegex(nfa)
        const fromSource = nfaToDFA(nfa)
        for (const s of BATTERY) {
          const viaRegex = result.isEmptyLanguage
            ? false
            : simulateDFA(nfaToDFA(buildNFA(result.regex!)), s).accepted
          expect(viaRegex).toBe(simulateDFA(fromSource, s).accepted)
        }
      }),
      { seed: 0x6f2a, numRuns: 100 }
    )
  })
})
