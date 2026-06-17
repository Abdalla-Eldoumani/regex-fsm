import { DFA, Transition, BOUNDS } from '../automata/types'
import { assertWithinBounds } from './bounds'
import { completeDFA } from './complement'

// Product DFA for union and intersection (SKILL invariant 7).
//
// The course proves union via the regex r1 + r2 and intersection via De Morgan,
// but the tool's chosen constructive method is the product automaton: it computes
// the same languages and is the construction students are asked to draw. The
// accepting condition is the ONLY difference between the two modes -- union accepts
// when EITHER component accepts, intersection when BOTH do. The property suite
// the property suite binds this to the course languages by full enumeration; this module is
// the construction, decided correct by simulateDFA, never by shape.
//
// Reachable-only: the product is built by BFS from the start pair, so unreachable
// pairs are never generated. A queue (shift) gives a breadth-first discovery order
// from the start pair, which is what the animation steps through; a stack (pop)
// would give depth-first order and the wrong animation.

export type ProductMode = 'union' | 'intersection'

export interface ProductStep {
  step: number
  // The pair added at this step. null for step 0, which seeds the start pair only.
  added: { a: string; b: string } | null
  // Every pair discovered so far, as composite ids, sorted deterministically.
  states: string[]
  // Every transition discovered so far, sorted deterministically.
  transitions: Transition[]
  note: string
}

export interface ProductResult {
  dfa: DFA
  mode: ProductMode
  steps: ProductStep[]
}

// Course-notation pair label, rendered in JetBrains Mono by the view.
function pairId(a: string, b: string): string {
  return `(${a},${b})`
}

// Fast (from,symbol) -> to lookup for a COMPLETE DFA. Every (state,symbol) over the
// alphabet is present after completeDFA, so the product never hits a missing edge.
function buildDelta(dfa: DFA): Map<string, string> {
  const delta = new Map<string, string>()
  for (const t of dfa.transitions) {
    delta.set(`${t.from},${t.symbol}`, t.to)
  }
  return delta
}

// Snapshot the discovered pairs and transitions, both sorted, so step counts and
// label assertions are reproducible regardless of Map/Set iteration order (Pitfall 3).
function sortStates(ids: string[]): string[] {
  return [...ids].sort((a, b) => a.localeCompare(b))
}

function sortTransitions(transitions: Transition[]): Transition[] {
  return [...transitions].sort((x, y) => {
    if (x.from !== y.from) return x.from.localeCompare(y.from)
    if (x.to !== y.to) return x.to.localeCompare(y.to)
    return `${x.symbol}`.localeCompare(`${y.symbol}`)
  })
}

export function productDFA(a: DFA, b: DFA, mode: ProductMode): ProductResult {
  // Common alphabet = union of both. Each input is completed over it FIRST so every
  // (state, symbol) is defined on both sides (Pitfall 2): if A is over {a} and B over
  // {a, b}, A must gain a 'b'-edge to its trap or the product would have undefined
  // transitions on 'b'.
  const alphabet = new Set<string>([...a.alphabet, ...b.alphabet])
  const ca = completeDFA(a, alphabet).dfa
  const cb = completeDFA(b, alphabet).dfa

  const deltaA = buildDelta(ca)
  const deltaB = buildDelta(cb)

  const startedAt = performance.now()
  const startPair = pairId(ca.startState, cb.startState)

  const seen = new Map<string, { a: string; b: string }>()
  seen.set(startPair, { a: ca.startState, b: cb.startState })
  const worklist: Array<{ a: string; b: string }> = [
    { a: ca.startState, b: cb.startState },
  ]
  const transitions: Transition[] = []

  // Step 0: the start pair only, no transitions yet.
  const steps: ProductStep[] = [
    {
      step: 0,
      added: null,
      states: [startPair],
      transitions: [],
      note: `Seed the start pair ${startPair}`,
    },
  ]

  let step = 1
  while (worklist.length > 0) {
    // SAFETY-01 (threat T-07-DOS): the product can be |A| x |B| states; guard the
    // discovered-pair count before processing and after recording, matching the
    // bounds.ts contract. Throws TooLargeError on a true blow-up; never truncates.
    assertWithinBounds(seen.size, BOUNDS.TIME_BUDGET_MS, startedAt)
    const cur = worklist.shift()! // BFS: shift (queue), not pop (stack)
    const from = pairId(cur.a, cur.b)

    for (const x of alphabet) {
      const na = deltaA.get(`${cur.a},${x}`)! // total after completeDFA
      const nb = deltaB.get(`${cur.b},${x}`)!
      const to = pairId(na, nb)
      transitions.push({ from, to, symbol: x })

      if (!seen.has(to)) {
        seen.set(to, { a: na, b: nb })
        worklist.push({ a: na, b: nb })
        assertWithinBounds(seen.size, BOUNDS.TIME_BUDGET_MS, startedAt)
        steps.push({
          step,
          added: { a: na, b: nb },
          states: sortStates([...seen.keys()]),
          transitions: sortTransitions(transitions),
          note: `Add pair ${to}`,
        })
        step += 1
      }
    }
  }

  // The accepting condition is the ONLY union/intersection difference (CLOSURE-01/02).
  const acceptA = new Set(ca.acceptStates)
  const acceptB = new Set(cb.acceptStates)
  const acceptStates: string[] = []
  for (const [id, { a: qa, b: qb }] of seen) {
    const accept =
      mode === 'union'
        ? acceptA.has(qa) || acceptB.has(qb) // union: either component accepts
        : acceptA.has(qa) && acceptB.has(qb) // intersection: both accept
    if (accept) acceptStates.push(id)
  }

  const dfa: DFA = {
    states: sortStates([...seen.keys()]).map((id) => ({ id })),
    transitions,
    startState: startPair,
    acceptStates: acceptStates.sort((x, y) => x.localeCompare(y)),
    alphabet,
  }

  return { dfa, mode, steps }
}
