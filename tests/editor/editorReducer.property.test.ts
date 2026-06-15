import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { editorReducer, initialEditorState } from '@/editor/editorReducer'
import { type WorkingAutomaton, type EditorAction } from '@/editor/editorTypes'
import { toAutomaton } from '@/editor/toAutomaton'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateDFA } from '@/core/algorithms/simulate'
import { Automaton } from '@/core/automata/types'

// ---------------------------------------------------------------------------
// Well-formedness invariant (the structural property's assertion).
// ---------------------------------------------------------------------------
function assertWellFormed(s: WorkingAutomaton): void {
  const ids = s.states.map(st => st.id)
  const idSet = new Set(ids)

  // (4) no two states share an id
  expect(idSet.size).toBe(ids.length)

  // (1) at most one start; a non-empty editor has a start that exists
  if (s.states.length === 0) {
    expect(s.startState).toBeNull()
  } else {
    expect(s.startState).not.toBeNull()
    expect(idSet.has(s.startState as string)).toBe(true)
  }

  // (2) every transition references existing from/to states
  for (const t of s.transitions) {
    expect(idSet.has(t.from)).toBe(true)
    expect(idSet.has(t.to)).toBe(true)
  }

  // (3) acceptStates is a subset of state ids
  for (const a of s.acceptStates) {
    expect(idSet.has(a)).toBe(true)
  }
}

// ---------------------------------------------------------------------------
// State-aware action arbitrary. Targets (removeState, setStart, toggleAccept,
// transitions, relabel/remove edge) are chosen from the CURRENT state's ids so
// the random sequence is realistic rather than mostly no-ops. Returns the next
// action given the running state.
// ---------------------------------------------------------------------------
const SYMS = ['a', 'b', null] as const // null => λ

function actionFor(s: WorkingAutomaton): fc.Arbitrary<EditorAction> {
  const stateIds = s.states.map(st => st.id)
  const edgeIds = s.transitions.map(e => e.id)

  const choices: fc.Arbitrary<EditorAction>[] = [
    // addState is always available
    fc
      .record({ x: fc.integer({ min: 0, max: 500 }), y: fc.integer({ min: 0, max: 500 }) })
      .map(({ x, y }) => ({ type: 'addState', x, y }) as EditorAction),
  ]

  if (stateIds.length > 0) {
    const idArb = fc.constantFrom(...stateIds)
    choices.push(
      idArb.map(id => ({ type: 'removeState', id }) as EditorAction),
      idArb.map(id => ({ type: 'setStart', id }) as EditorAction),
      idArb.map(id => ({ type: 'toggleAccept', id }) as EditorAction),
      fc
        .record({ from: idArb, to: idArb, symbol: fc.constantFrom(...SYMS) })
        .map(({ from, to, symbol }) => ({ type: 'addTransition', from, to, symbol }) as EditorAction),
      fc
        .record({ id: idArb, label: fc.string({ minLength: 0, maxLength: 5 }) })
        .map(({ id, label }) => ({ type: 'renameState', id, label }) as EditorAction)
    )
  }

  if (edgeIds.length > 0) {
    const edgeArb = fc.constantFrom(...edgeIds)
    choices.push(
      edgeArb.map(edgeId => ({ type: 'removeTransition', edgeId }) as EditorAction),
      fc
        .record({ edgeId: edgeArb, symbol: fc.constantFrom(...SYMS) })
        .map(({ edgeId, symbol }) => ({ type: 'relabelTransition', edgeId, symbol }) as EditorAction)
    )
  }

  return fc.oneof(...choices)
}

// Drive a length-bounded random walk: at each step generate an action valid for
// the running state, reduce, and assert the invariant holds after the step.
function walk(steps: number): fc.Arbitrary<WorkingAutomaton> {
  function go(s: WorkingAutomaton, remaining: number): fc.Arbitrary<WorkingAutomaton> {
    if (remaining === 0) return fc.constant(s)
    return actionFor(s).chain(action => {
      const next = editorReducer(s, action)
      assertWellFormed(next)
      return go(next, remaining - 1)
    })
  }
  return go(initialEditorState, steps)
}

describe('editorReducer well-formedness property', () => {
  // Seeded so a counterexample reproduces deterministically (skill requirement).
  // The invariant is asserted after every step inside walk(); this top-level
  // assertion simply forces the chain to run to a final well-formed state.
  it('any random sequence of edits yields a well-formed automaton at every step', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 40 }).chain(n => walk(n)),
        final => {
          assertWellFormed(final)
        }
      ),
      { seed: 0xed170, numRuns: 300 }
    )
  })
})

// ---------------------------------------------------------------------------
// Independent acceptance oracle (automata-correctness skill: a string is
// accepted by the constructed DFA iff an independent matcher accepts it). This
// matcher is a brute-force λ-NFA walk written from scratch here: it is NOT
// nfaToDFA and NOT the production simulateNFA, so it is a genuinely independent
// check on toAutomaton -> nfaToDFA over automata that include λ-moves AND
// parallel edges. Decide correctness by language equivalence, never by shape.
// ---------------------------------------------------------------------------
function lambdaClosureOracle(a: Automaton, start: Set<string>): Set<string> {
  const seen = new Set(start)
  const stack = [...start]
  while (stack.length > 0) {
    const q = stack.pop() as string
    for (const t of a.transitions) {
      if (t.from === q && t.symbol === null && !seen.has(t.to)) {
        seen.add(t.to)
        stack.push(t.to)
      }
    }
  }
  return seen
}

function oracleAccepts(a: Automaton, input: string): boolean {
  if (a.startState === '') return false
  let current = lambdaClosureOracle(a, new Set([a.startState]))
  for (const ch of input) {
    const moved = new Set<string>()
    for (const q of current) {
      for (const t of a.transitions) {
        if (t.from === q && t.symbol === ch) moved.add(t.to)
      }
    }
    current = lambdaClosureOracle(a, moved)
    if (current.size === 0) break
  }
  for (const q of current) {
    if (a.acceptStates.includes(q)) return true
  }
  return false
}

// Build a WorkingAutomaton from a primitive description (no reducer), so the
// arbitrary can place λ-moves and parallel edges freely. Ids are generated s{n}.
interface EdgeSpec {
  from: number
  to: number
  symbol: string | null
}
function buildWorking(
  stateCount: number,
  edges: EdgeSpec[],
  start: number,
  accepts: number[]
): WorkingAutomaton {
  const states = Array.from({ length: stateCount }, (_, i) => ({ id: `s${i}` }))
  const transitions = edges.map((e, i) => ({
    id: `e${i}`,
    from: `s${e.from % stateCount}`,
    to: `s${e.to % stateCount}`,
    symbol: e.symbol,
  }))
  return {
    states,
    transitions,
    startState: `s${start % stateCount}`,
    acceptStates: [...new Set(accepts.map(x => `s${x % stateCount}`))],
    positions: {},
    selection: { nodeIds: [], edgeIds: [] },
  }
}

const workingArb: fc.Arbitrary<WorkingAutomaton> = fc
  .integer({ min: 1, max: 5 })
  .chain(stateCount =>
    fc.record({
      stateCount: fc.constant(stateCount),
      edges: fc.array(
        fc.record({
          from: fc.integer({ min: 0, max: stateCount - 1 }),
          to: fc.integer({ min: 0, max: stateCount - 1 }),
          symbol: fc.constantFrom('a', 'b', null),
        }),
        { minLength: 0, maxLength: 10 }
      ),
      start: fc.integer({ min: 0, max: stateCount - 1 }),
      accepts: fc.array(fc.integer({ min: 0, max: stateCount - 1 }), { minLength: 0, maxLength: stateCount }),
    })
  )
  .map(({ stateCount, edges, start, accepts }) => buildWorking(stateCount, edges, start, accepts))

const inputArb = fc
  .array(fc.constantFrom('a', 'b'), { minLength: 0, maxLength: 6 })
  .map(cs => cs.join(''))

describe('editor language-oracle property (λ-moves + parallel edges)', () => {
  // Seeded. If this finds a divergence between the constructed DFA and the
  // independent λ-NFA oracle, add it as a named unit test and fix the pipeline;
  // do not loosen the property.
  it('nfaToDFA(toAutomaton(working)) accepts a string iff the brute-force oracle does', () => {
    fc.assert(
      fc.property(workingArb, inputArb, (working, input) => {
        const core = toAutomaton(working)
        const dfa = nfaToDFA(core)
        expect(simulateDFA(dfa, input).accepted).toBe(oracleAccepts(core, input))
      }),
      { seed: 0x04ac1e, numRuns: 400 }
    )
  })

  // An explicit construction with BOTH a λ-move and a parallel edge, to pin the
  // two EDITOR-02 features the property covers. s0 --λ--> s1, s1 --a--> s2 (x2
  // parallel), s2 accept: the language is exactly "a".
  it('λ + parallel-edge automaton recognizes the expected language', () => {
    const working = buildWorking(
      3,
      [
        { from: 0, to: 1, symbol: null },
        { from: 1, to: 2, symbol: 'a' },
        { from: 1, to: 2, symbol: 'a' }, // parallel duplicate
      ],
      0,
      [2]
    )
    const core = toAutomaton(working)
    const dfa = nfaToDFA(core)
    for (const s of ['', 'a', 'b', 'aa', 'ab']) {
      expect(simulateDFA(dfa, s).accepted).toBe(oracleAccepts(core, s))
    }
    expect(simulateDFA(dfa, 'a').accepted).toBe(true)
    expect(simulateDFA(dfa, '').accepted).toBe(false)
  })
})
