import { describe, it, expect } from 'vitest'
import { NFA, TooLargeError } from '@/core/automata/types'
import { simulateNFA } from '@/core/algorithms/simulate'
import { computationTree } from '@/core/algorithms/computationTree'

// Pinned computation trees (automata-correctness invariant 3). These unit cases nail
// the concrete structure the seeded property suite proves in general: a single-symbol
// tree, a parallel branching level, a lambda-cycle that terminates with one set per
// level, a dead branch, an accepting leaf, and the too-large guard. The verdict and
// the per-level set are decided against simulateNFA, never by eyeballing shape. No
// input is compiled to a JS RegExp; everything runs through the bespoke pipeline.

function unionSorted(states: string[][]): string[] {
  const set = new Set<string>()
  for (const group of states) for (const s of group) set.add(s)
  return Array.from(set).sort()
}

describe('computationTree', () => {
  // SINGLE SYMBOL. q0 --a--> q1 (accept). On input "a" the tree is two levels: the
  // start closure {q0}, then {q1}, with the final node accepting.
  it('builds a single-symbol tree with an accepting leaf', () => {
    const nfa: NFA = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a']),
    }

    const tree = computationTree(nfa, 'a')

    expect(tree.levels.length).toBe(2)
    expect(tree.levels[0].nodes.map((n) => n.states)).toEqual([['q0']])
    expect(tree.levels[0].symbol).toBeNull()
    expect(tree.levels[1].nodes.map((n) => n.states)).toEqual([['q1']])
    expect(tree.levels[1].symbol).toBe('a')
    expect(tree.levels[1].nodes[0].isAccepting).toBe(true)
    expect(tree.edges).toEqual([
      { fromId: tree.levels[0].nodes[0].id, toId: tree.levels[1].nodes[0].id, symbol: 'a', viaLambda: false },
    ])
    expect(tree.accepted).toBe(true)
    expect(tree.nodeCount).toBe(2)
    // Ground-truth agreement.
    expect(tree.accepted).toBe(simulateNFA(nfa, 'a').accepted)
  })

  // BRANCHING. q0 --a--> q1 and q0 --a--> q2 keep both successors active, so level 1
  // is the genuine parallel set {q1, q2} (one configuration node carrying both). This
  // is the true simultaneously-active set, never one arbitrary branch.
  it('builds a parallel branching level holding the full active set', () => {
    const nfa: NFA = {
      states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
      transitions: [
        { from: 'q0', to: 'q1', symbol: 'a' },
        { from: 'q0', to: 'q2', symbol: 'a' },
      ],
      startState: 'q0',
      acceptStates: ['q2'],
      alphabet: new Set(['a']),
    }

    const tree = computationTree(nfa, 'a')

    expect(tree.levels[1].nodes.length).toBe(1)
    expect(tree.levels[1].nodes[0].states).toEqual(['q1', 'q2'])
    // The two raw-move targets q1 and q2 collapse into one closed configuration, so the
    // start node has exactly one successor edge into the merged set.
    expect(tree.edges.length).toBe(1)
    expect(tree.edges[0].fromId).toBe(tree.levels[0].nodes[0].id)
    expect(tree.edges[0].toId).toBe(tree.levels[1].nodes[0].id)
    // q2 is accepting and present in the final set.
    expect(tree.levels[1].nodes[0].isAccepting).toBe(true)
    expect(tree.accepted).toBe(true)
    expect(unionSorted(tree.levels[1].nodes.map((n) => n.states))).toEqual(
      simulateNFA(nfa, 'a').steps[1].nextStates
    )
  })

  // LAMBDA CYCLE. q0 --lambda--> q1 --lambda--> q0 forms a cycle; q0 --a--> q2 (accept).
  // The start closure is {q0, q1} (the cycle collapses to one set, no infinite loop),
  // and consuming "a" yields {q2}. One configuration set per level throughout.
  it('terminates on a lambda-cycle and collapses to one set per level', () => {
    const nfa: NFA = {
      states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
      transitions: [
        { from: 'q0', to: 'q1', symbol: null },
        { from: 'q1', to: 'q0', symbol: null },
        { from: 'q0', to: 'q2', symbol: 'a' },
      ],
      startState: 'q0',
      acceptStates: ['q2'],
      alphabet: new Set(['a']),
    }

    const tree = computationTree(nfa, 'a')

    // Start closure folds the cycle into {q0, q1}; exactly one node at level 0.
    expect(tree.levels[0].nodes.length).toBe(1)
    expect(tree.levels[0].nodes[0].states).toEqual(['q0', 'q1'])
    // One node per level (no per-lambda-hop explosion).
    expect(tree.levels.every((l) => l.nodes.length === 1)).toBe(true)
    expect(tree.levels[1].nodes[0].states).toEqual(['q2'])
    expect(tree.accepted).toBe(true)
    // Matches the ground truth set for set at every level.
    const sim = simulateNFA(nfa, 'a')
    for (let i = 0; i < sim.steps.length; i++) {
      expect(unionSorted(tree.levels[i].nodes.map((n) => n.states))).toEqual(
        sim.steps[i].nextStates
      )
    }
  })

  // DEAD BRANCH. q0 --a--> q1 (accept), but nothing leaves q1 on "b". On input "ab" the
  // level-1 configuration {q1} has no successor on "b": it is marked dead, the next
  // level is empty, and the input is rejected.
  it('marks a parent dead when it has no successor on the next symbol', () => {
    const nfa: NFA = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a', 'b']),
    }

    const tree = computationTree(nfa, 'ab')

    const level1Node = tree.levels[1].nodes[0]
    expect(level1Node.states).toEqual(['q1'])
    // The {q1} configuration dies on "b".
    expect(level1Node.isDead).toBe(true)
    // The final level is empty: no live configuration remains.
    expect(tree.levels[2].nodes).toEqual([])
    expect(tree.accepted).toBe(false)
    expect(tree.accepted).toBe(simulateNFA(nfa, 'ab').accepted)
  })

  // ACCEPT LEAF only at the final level. q0 --a--> q1 (accept), q1 --a--> q1. On input
  // "aa" the q1 configuration is reached at level 1 but the accept flag is the final
  // verdict: level 1 is not the last level, level 2 is, so only the level-2 node is an
  // accepting leaf even though q1 is an accept state at both.
  it('flags isAccepting only at the final level, not on intermediate accept states', () => {
    const nfa: NFA = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [
        { from: 'q0', to: 'q1', symbol: 'a' },
        { from: 'q1', to: 'q1', symbol: 'a' },
      ],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a']),
    }

    const tree = computationTree(nfa, 'aa')

    // q1 is an accept state and is active at level 1, but level 1 is not final.
    expect(tree.levels[1].nodes[0].states).toEqual(['q1'])
    expect(tree.levels[1].nodes[0].isAccepting).toBe(false)
    // Level 2 is final and its node sits on q1: a genuine accepting leaf.
    expect(tree.levels[2].nodes[0].states).toEqual(['q1'])
    expect(tree.levels[2].nodes[0].isAccepting).toBe(true)
    expect(tree.accepted).toBe(true)
  })

  // EMPTY INPUT. The root is itself the final level. With q0 accepting, the root is an
  // accepting leaf and the input is accepted; the tree is a single node.
  it('accepts the empty input when the start closure intersects the accept set', () => {
    const nfa: NFA = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q0'],
      alphabet: new Set(['a']),
    }

    const tree = computationTree(nfa, '')

    expect(tree.levels.length).toBe(1)
    expect(tree.levels[0].nodes[0].isAccepting).toBe(true)
    expect(tree.nodeCount).toBe(1)
    expect(tree.accepted).toBe(true)
    expect(tree.accepted).toBe(simulateNFA(nfa, '').accepted)
  })

  // TOO LARGE (SAFETY-01). A simple loop NFA over {a, b} adds one configuration node
  // per consumed symbol. The shared cap is 256 nodes and fires on strictly greater than
  // the cap. The root is node 1, so a 255-symbol input lands exactly at 256 (no throw),
  // and a 256-symbol input pushes the 257th node and throws TooLargeError with reason
  // state-cap. This is a real blow-up via the same guard subset construction uses, never
  // a weakened no-op.
  it('throws TooLargeError when the node count exceeds the shared cap', () => {
    const loop: NFA = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [
        { from: 'q0', to: 'q0', symbol: 'a' },
        { from: 'q0', to: 'q1', symbol: 'b' },
        { from: 'q1', to: 'q1', symbol: 'a' },
        { from: 'q1', to: 'q1', symbol: 'b' },
      ],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a', 'b']),
    }

    // Exactly at the cap: 255 symbols + the root = 256 nodes, no throw.
    const atCap = computationTree(loop, 'a'.repeat(255))
    expect(atCap.nodeCount).toBe(256)

    // One past the cap: 256 symbols + the root = 257 nodes, throws state-cap.
    let thrown: unknown
    try {
      computationTree(loop, 'a'.repeat(256))
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBeInstanceOf(TooLargeError)
    expect((thrown as TooLargeError).reason).toBe('state-cap')
  })
})
