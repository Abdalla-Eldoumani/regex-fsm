import { DFA, BOUNDS } from '../automata/types'
import { assertWithinBounds } from './bounds'
import { completeDFA } from './complement'

// Language equivalence with the shortest counterexample (SKILL invariant 8, the
// section "How to verify an automaton is correct").
//
// The course grades a student automaton against a reference by LANGUAGE, never by
// shape: build the product, walk it from the start pair, and look for a reachable
// pair where exactly one component accepts. None exists means the languages are
// equal. One exists means the path that reaches it spells a distinguishing string,
// and the shortest such string is the feedback a student should see.
//
// This walk is the BFS-from-start-pair template of product.ts, with three
// differences: it records a parent back-pointer per pair so the path can be
// reconstructed, it stops at the FIRST pair where the two accept bits disagree
// (XOR), and it reports the direction of the disagreement. product.ts is the
// union/intersection construction and is left untouched; this is its sibling for
// grading.
//
// Three things make the result correct. First, both DFAs are completed over the
// COMMON alphabet before the walk, so neither side has a missing edge: if the
// student used Sigma = {a} and the reference {a, b}, a 'b' from any state is routed
// to a trap on the side that lacks it rather than being silently dropped (the
// classic incomplete-DFA error). Second, the frontier is a FIFO queue consumed with
// shift(), so pairs are visited in non-decreasing path length and the first witness
// is reached by a shortest path; a stack (pop) would give some distinguishing
// string but not the shortest. The walk does NOT minimize first: BFS already yields
// a minimal-length witness, so minimization would be wasted work. Third, the
// argument order fixes the meaning of the direction. Pass (student, reference): at
// the witness pair, the student accepting a string the reference rejects is
// acceptedBy 'student' (wrongly accepted), and the reference accepting a string the
// student rejects is acceptedBy 'reference' (wrongly rejected).

// 'student' = the counterexample is in the student's language but NOT the
//             reference's (the student's machine wrongly accepts it).
// 'reference' = the counterexample is in the reference's language but NOT the
//             student's (the student's machine wrongly rejects it).
export type AcceptedBy = 'student' | 'reference'

export type Equivalence =
  | { equivalent: true }
  | { equivalent: false; counterexample: string; acceptedBy: AcceptedBy }

// Fast (from,symbol) -> to lookup for a COMPLETE DFA. Every (state, symbol) over
// the alphabet is present after completeDFA, so the walk never hits a missing edge.
function buildDelta(dfa: DFA): Map<string, string> {
  const delta = new Map<string, string>()
  for (const t of dfa.transitions) {
    delta.set(`${t.from},${t.symbol}`, t.to)
  }
  return delta
}

// a = student DFA, b = reference DFA. The order fixes the meaning of acceptedBy.
// sigma is the language's alphabet; it defaults to the union of both DFAs' own
// alphabets. Throws TooLargeError when the product exceeds BOUNDS (SAFETY-01) so
// the caller can show a "too large" notice instead of hanging. Pure: never mutates
// its inputs.
export function equivalence(a: DFA, b: DFA, sigma?: Set<string>): Equivalence {
  // Common alphabet = the language's Sigma, or the union of both inputs. Each side
  // is completed over it FIRST so every (state, symbol) is defined on both, and a
  // symbol one side omits routes to that side's trap rather than vanishing.
  const alphabet = sigma ?? new Set<string>([...a.alphabet, ...b.alphabet])
  const ca = completeDFA(a, alphabet).dfa
  const cb = completeDFA(b, alphabet).dfa

  const deltaA = buildDelta(ca)
  const deltaB = buildDelta(cb)

  // Build the two accept sets once, not per pair.
  const acceptA = new Set(ca.acceptStates)
  const acceptB = new Set(cb.acceptStates)

  // A fixed iteration order over the alphabet makes the specific witness
  // deterministic across runs (the minimal length is guaranteed either way; sorting
  // pins which minimal-length string is returned for snapshot-style assertions).
  const symbols = [...alphabet].sort((x, y) => x.localeCompare(y))

  const startedAt = performance.now()
  const startKey = `${ca.startState} ${cb.startState}`

  // parent maps a pair key to the edge that first reached it (the previous pair key
  // and the symbol consumed), or null for the start pair. The queue makes discovery
  // breadth-first, so the first witness popped is reached by a shortest path.
  const parent = new Map<string, { prev: string; symbol: string } | null>()
  parent.set(startKey, null)
  const queue: Array<{ a: string; b: string; key: string }> = [
    { a: ca.startState, b: cb.startState, key: startKey },
  ]

  while (queue.length > 0) {
    // SAFETY-01 (threat T-09-01): the product can be |A| x |B| pairs; guard the
    // discovered-pair count before processing and after recording each new pair,
    // matching the bounds.ts contract. Throws TooLargeError on a true blow-up;
    // never truncates.
    assertWithinBounds(parent.size, BOUNDS.TIME_BUDGET_MS, startedAt)
    const cur = queue.shift()! // BFS: shift (queue), not pop (stack)

    const inA = acceptA.has(cur.a)
    const inB = acceptB.has(cur.b)
    if (inA !== inB) {
      // Witness pair: exactly one component accepts. Walk the back-pointers from
      // here to the start pair, collecting the symbol on each edge, then reverse to
      // read the path forward. The empty string is a legal counterexample: when the
      // start pair itself is the witness the loop collects nothing and "" is
      // returned (the view renders this as the empty string lambda).
      const path: string[] = []
      let k: string = cur.key
      for (;;) {
        const p = parent.get(k)
        if (!p) break // reached the start pair (parent is null)
        path.push(p.symbol)
        k = p.prev
      }
      path.reverse()
      return {
        equivalent: false,
        counterexample: path.join(''),
        acceptedBy: inA ? 'student' : 'reference',
      }
    }

    for (const x of symbols) {
      const na = deltaA.get(`${cur.a},${x}`)! // total after completeDFA
      const nb = deltaB.get(`${cur.b},${x}`)!
      const key = `${na} ${nb}`
      if (!parent.has(key)) {
        parent.set(key, { prev: cur.key, symbol: x })
        assertWithinBounds(parent.size, BOUNDS.TIME_BUDGET_MS, startedAt)
        queue.push({ a: na, b: nb, key })
      }
    }
  }

  // The queue drained with no witness: every reachable pair agrees, so the two
  // machines accept the same language.
  return { equivalent: true }
}
