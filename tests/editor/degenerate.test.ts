import { describe, it, expect } from 'vitest'
import { editorReducer, initialEditorState } from '@/editor/editorReducer'
import { type WorkingAutomaton, type EditorAction } from '@/editor/editorTypes'
import { toAutomaton } from '@/editor/toAutomaton'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateNFA, simulateDFA } from '@/core/algorithms/simulate'
import { isDeterministic, validateDFA } from '@/core/automata/dfa'

function run(actions: EditorAction[]): WorkingAutomaton {
  return actions.reduce(editorReducer, initialEditorState)
}

// EDGE_CASES "Empty and degenerate states". Each case builds a degenerate editor
// automaton, converts it, and asserts it produces valid output that simulates
// correctly with no crash. Acceptance is decided by simulate, never by shape.

describe('degenerate: no accepting states', () => {
  // (a) An automaton with no accept states accepts nothing, including λ.
  it('accepts nothing, including the empty string', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 }, // s0 start, not accepting
      { type: 'addState', x: 100, y: 0 }, // s1, not accepting
      { type: 'addTransition', from: 's0', to: 's1', symbol: 'a' },
    ])
    const core = toAutomaton(s)
    expect(core.acceptStates).toHaveLength(0)
    for (const str of ['', 'a', 'b', 'aa', 'ab', 'ba']) {
      expect(simulateNFA(core, str).accepted).toBe(false)
    }
    // determinizes to a valid DFA that also accepts nothing
    const dfa = nfaToDFA(core)
    expect(() => validateDFA(dfa)).not.toThrow()
    for (const str of ['', 'a', 'b', 'ab']) {
      expect(simulateDFA(dfa, str).accepted).toBe(false)
    }
  })
})

describe('degenerate: no transitions', () => {
  // (b) A single start state with no transitions rejects every non-empty string;
  // it accepts the empty string iff the start state is accepting.
  it('rejects non-empty input; accepts empty only when the start is accepting', () => {
    const nonAccepting = run([{ type: 'addState', x: 0, y: 0 }])
    const naCore = toAutomaton(nonAccepting)
    expect(simulateNFA(naCore, '').accepted).toBe(false)
    expect(simulateNFA(naCore, 'a').accepted).toBe(false)

    const accepting = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'toggleAccept', id: 's0' },
    ])
    const aCore = toAutomaton(accepting)
    expect(simulateNFA(aCore, '').accepted).toBe(true)
    expect(simulateNFA(aCore, 'a').accepted).toBe(false)
    expect(simulateNFA(aCore, 'b').accepted).toBe(false)
  })

  it('an automaton with no transitions has an empty alphabet', () => {
    const s = run([{ type: 'addState', x: 0, y: 0 }])
    expect(toAutomaton(s).alphabet.size).toBe(0)
  })
})

describe('degenerate: disconnected components', () => {
  // (c) Two unconnected sub-graphs. Algorithms operate on the reachable part from
  // the start; the orphan component must not crash determinization.
  it('determinizes the reachable part and does not crash on the orphan', () => {
    const s = run([
      // reachable component: s0 --a--> s1 (accept)
      { type: 'addState', x: 0, y: 0 }, // s0 start
      { type: 'addState', x: 100, y: 0 }, // s1
      { type: 'toggleAccept', id: 's1' },
      { type: 'addTransition', from: 's0', to: 's1', symbol: 'a' },
      // orphan component, unreachable from s0: s2 --b--> s3 (accept)
      { type: 'addState', x: 0, y: 200 }, // s2
      { type: 'addState', x: 100, y: 200 }, // s3
      { type: 'toggleAccept', id: 's3' },
      { type: 'addTransition', from: 's2', to: 's3', symbol: 'b' },
    ])
    const core = toAutomaton(s)
    // alphabet includes both components' symbols
    expect(core.alphabet).toEqual(new Set(['a', 'b']))

    const dfa = nfaToDFA(core)
    expect(() => validateDFA(dfa)).not.toThrow()
    expect(isDeterministic(dfa)).toBe(true)

    // only the reachable language ("a") is accepted; "b" reaches the orphan but
    // not from the start, so it is rejected
    expect(simulateDFA(dfa, 'a').accepted).toBe(true)
    expect(simulateDFA(dfa, 'b').accepted).toBe(false)
    expect(simulateNFA(core, 'a').accepted).toBe(true)
    expect(simulateNFA(core, 'b').accepted).toBe(false)
  })
})

describe('degenerate: unreachable and dead states', () => {
  it('a dead state (no path to accept) does not change the language', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 }, // s0 start
      { type: 'addState', x: 100, y: 0 }, // s1 accept
      { type: 'addState', x: 200, y: 0 }, // s2 dead: outgoing to itself, never accepts
      { type: 'toggleAccept', id: 's1' },
      { type: 'addTransition', from: 's0', to: 's1', symbol: 'a' },
      { type: 'addTransition', from: 's0', to: 's2', symbol: 'b' },
      { type: 'addTransition', from: 's2', to: 's2', symbol: 'a' },
      { type: 'addTransition', from: 's2', to: 's2', symbol: 'b' },
    ])
    const core = toAutomaton(s)
    const dfa = nfaToDFA(core)
    expect(() => validateDFA(dfa)).not.toThrow()
    // language is exactly "a"; the dead branch on "b..." never accepts
    expect(simulateDFA(dfa, 'a').accepted).toBe(true)
    expect(simulateDFA(dfa, 'b').accepted).toBe(false)
    expect(simulateDFA(dfa, 'ba').accepted).toBe(false)
    expect(simulateDFA(dfa, 'bb').accepted).toBe(false)
  })
})

describe('degenerate: long labels', () => {
  // (d) A 200-character label round-trips as a label and does not crash.
  it('preserves a 200-char label through toAutomaton without crashing', () => {
    const longLabel = 'q'.repeat(200)
    const s = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'addState', x: 100, y: 0 },
      { type: 'renameState', id: 's0', label: longLabel },
      { type: 'toggleAccept', id: 's1' },
      { type: 'addTransition', from: 's0', to: 's1', symbol: 'a' },
    ])
    const core = toAutomaton(s)
    const labelled = core.states.find(st => st.id === 's0')
    expect(labelled?.label).toBe(longLabel)
    expect(labelled?.label).toHaveLength(200)
    // id is unchanged; the long label never becomes an id
    expect(labelled?.id).toBe('s0')
    // still simulates correctly
    expect(simulateNFA(core, 'a').accepted).toBe(true)
    const dfa = nfaToDFA(core)
    expect(() => validateDFA(dfa)).not.toThrow()
  })
})

describe('degenerate: ∅ vs λ are distinct', () => {
  // (e) A λ-transition (symbol null) is the empty-string move, NOT the empty-
  // language trap. toAutomaton keeps symbol null and the alphabet excludes it.
  it('a λ-move is kept as symbol null and is not in the alphabet', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 }, // s0 start
      { type: 'addState', x: 100, y: 0 }, // s1 accept
      { type: 'toggleAccept', id: 's1' },
      { type: 'addTransition', from: 's0', to: 's1', symbol: null }, // λ-move
    ])
    const core = toAutomaton(s)
    expect(core.transitions).toContainEqual({ from: 's0', to: 's1', symbol: null })
    expect(core.alphabet.size).toBe(0)
    // the λ-move means the empty string reaches the accept state
    expect(simulateNFA(core, '').accepted).toBe(true)
    // and it is NOT the empty language: λ is accepted
    expect(simulateNFA(core, 'a').accepted).toBe(false)
  })

  it('a label of ∅ is just text and never makes the state the empty-language trap', () => {
    const s = run([
      { type: 'addState', x: 0, y: 0 },
      { type: 'addState', x: 100, y: 0 },
      { type: 'renameState', id: 's0', label: '∅' },
      { type: 'toggleAccept', id: 's1' },
      { type: 'addTransition', from: 's0', to: 's1', symbol: 'a' },
    ])
    const core = toAutomaton(s)
    // the state keeps its generated id; '∅' is only a label
    expect(core.states.find(st => st.id === 's0')?.label).toBe('∅')
    expect(core.states.some(st => st.id === '∅')).toBe(false)
    // language is still "a"; the ∅-labelled state is an ordinary start state
    expect(simulateNFA(core, 'a').accepted).toBe(true)
  })
})
