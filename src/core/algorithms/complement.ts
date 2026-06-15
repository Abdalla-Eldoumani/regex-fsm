import { DFA, Transition } from '../automata/types'

// DFA completion and complement (Theorem 4.23 in the course notes).
//
// Course Definition 4.1 makes a DFA's delta a TOTAL function, so a course DFA is
// complete by definition. The subset construction already honours this (subset.ts
// adds the '∅' trap with self-loops whenever a move would be undefined). A
// hand-built DFA from the editor has no such guarantee and can be missing edges.
// Complementing an incomplete DFA is the classic silent error: every string that
// runs off a missing edge is dropped instead of being accepted by the complement.
// So complementDFA completes FIRST, then flips. The completion is its own helper
// because the view renders it as a distinct, visible stage and needs to know what
// it added.

// The trap glyph. Matches subset.ts so the renderer's node[id="∅"] selector draws
// it dashed and dimmed for free, and so a subset-built DFA's existing trap is the
// same node rather than a second one.
const TRAP = '∅'

export interface CompleteResult {
  dfa: DFA
  // True when this call introduced the trap. False for an already-complete input.
  trapAdded: boolean
  // The trap-bound edges this call introduced, for the visible completion stage.
  addedEdges: Transition[]
}

// Deterministic state ordering so downstream snapshots never depend on insertion
// order (Pitfall 3). Plain id sort; the trap '∅' sorts after the set-notation ids.
function sortedStates(ids: string[]): { id: string }[] {
  return [...ids].sort((a, b) => a.localeCompare(b)).map((id) => ({ id }))
}

// Make delta total over `overAlphabet` (default: the DFA's own alphabet) by adding
// one explicit trap and routing every missing (state, symbol) to it.
//
// IDEMPOTENT: when nothing is missing the input is already complete (the subset.ts
// case), so it is returned UNCHANGED with trapAdded:false and no edges. We never
// add a second trap and never add self-loops to an already-complete machine. This
// is the pedagogical crux (Pitfall 1): the completion stage must still RUN for an
// incomplete hand-built DFA, but must be a no-op for a complete one.
//
// Pure: never mutates `dfa` or its arrays (core immutability convention).
export function completeDFA(dfa: DFA, overAlphabet?: Set<string>): CompleteResult {
  const alphabet = overAlphabet ?? dfa.alphabet
  const have = new Set(dfa.transitions.map((t) => `${t.from},${t.symbol}`))

  const addedEdges: Transition[] = []
  for (const s of dfa.states) {
    for (const x of alphabet) {
      if (!have.has(`${s.id},${x}`)) {
        addedEdges.push({ from: s.id, to: TRAP, symbol: x })
      }
    }
  }

  // Already complete over `alphabet`: no trap, no edges, input returned as-is.
  if (addedEdges.length === 0) {
    return { dfa, trapAdded: false, addedEdges: [] }
  }

  // Add the trap with self-loops on every symbol, plus the routed edges. The trap
  // is NOT accepting yet; complementDFA flips it in step 2.
  const trapSelfLoops: Transition[] = [...alphabet].map((x) => ({
    from: TRAP,
    to: TRAP,
    symbol: x,
  }))

  const completed: DFA = {
    states: sortedStates([...dfa.states.map((s) => s.id), TRAP]),
    transitions: [...dfa.transitions, ...addedEdges, ...trapSelfLoops],
    startState: dfa.startState,
    acceptStates: [...dfa.acceptStates],
    alphabet: new Set(alphabet),
  }

  return { dfa: completed, trapAdded: true, addedEdges }
}

export interface ComplementStep {
  step: number
  stage: 'original' | 'completed' | 'flipped'
  dfa: DFA
  addedTrap?: boolean
  addedEdges?: Transition[]
  note: string
}

export interface ComplementResult {
  dfa: DFA
  steps: ComplementStep[]
}

// Complement a DFA: complete-then-flip (SKILL invariant 7, Theorem 4.23).
//
// Step 1 completes the input. Step 2 flips: the new accept set is every state NOT
// previously accepting, the trap INCLUDED, so the trap becomes accepting and the
// complement accepts every string the original had no path for. L(complement) =
// Σ* \ L(input) holds only because completion precedes the flip; flipping the bare
// input would silently drop the off-edge strings. The flip is computed from the
// COMPLETED machine, never from the input.
//
// Pure: never mutates `input`.
export function complementDFA(input: DFA): ComplementResult {
  const { dfa: completed, trapAdded, addedEdges } = completeDFA(input)

  const wasAccept = new Set(completed.acceptStates)
  const flippedAccept = completed.states
    .map((s) => s.id)
    .filter((id) => !wasAccept.has(id))
    .sort((a, b) => a.localeCompare(b))

  const flipped: DFA = {
    ...completed,
    acceptStates: flippedAccept,
  }

  return {
    dfa: flipped,
    steps: [
      {
        step: 0,
        stage: 'original',
        dfa: input,
        note: 'Original DFA over Σ (may be incomplete if hand-built)',
      },
      {
        step: 1,
        stage: 'completed',
        dfa: completed,
        addedTrap: trapAdded,
        addedEdges,
        note: 'Complete: add the trap ∅ and route every missing transition to it',
      },
      {
        step: 2,
        stage: 'flipped',
        dfa: flipped,
        note: 'Flip accepting and non-accepting over Σ (∅ becomes accepting)',
      },
    ],
  }
}
