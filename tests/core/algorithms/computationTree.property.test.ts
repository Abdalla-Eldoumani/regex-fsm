import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { RegexNode } from '@/core/regex/ast'
import { buildNFA } from '@/core/algorithms/thompson'
import { simulateNFA } from '@/core/algorithms/simulate'
import { computationTree } from '@/core/algorithms/computationTree'
import { NFA } from '@/core/automata/types'

// Property suite for the NFA computation tree (automata-correctness invariant 3).
// This file IS the SIM-02 proof: the tree is only trustworthy if a seeded property
// test decides, over random NFAs and random inputs, that the tree reproduces the
// real simultaneously-active set at every level and the same accept/reject verdict
// as simulateNFA, the verified ground truth.
//
// Invariant 3: an NFA tracks a SET of states; the lambda-closure is applied at the
// start and after every symbol. The simulation shows the actual set of
// simultaneously-active states, never a single arbitrary path. The tree must agree
// with simulateNFA on that set, level for level.
//
// THE METHOD, copied from product.property.test.ts: a recursive AST arbitrary over
// {a, b} built through the real pipeline (buildNFA, NOT determinized -- the tree runs
// on the NFA), plus a random input string of length in [0, 8]. The seed is fixed so
// any counterexample reproduces; per the skill and the project conventions, a
// counterexample becomes a named unit test in computationTree.test.ts and the
// ALGORITHM in computationTree.ts is fixed -- the property is never loosened and no
// assertion is weakened. No input is ever compiled to a JS RegExp (threat T-10-03):
// everything is driven through computationTree and simulateNFA, the bespoke
// move/lambdaClosure pipeline.

const SYMBOLS = ['a', 'b'] as const

// Bounded recursive AST arbitrary over {a, b}, identical to product.property.test.ts:
// union (+), concatenation, Kleene star, positive closure (+), optional, plus a
// lambda/empty leaf. The NFA under test is built through the real pipeline buildNFA so
// it is a genuine NFA with the lambda-transitions Thompson introduces.
function regexArb(): fc.Arbitrary<RegexNode> {
  const leaf: fc.Arbitrary<RegexNode> = fc.oneof(
    fc.constantFrom(...SYMBOLS).map((value) => ({ type: 'symbol', value }) as RegexNode),
    fc.constant({ type: 'empty' } as RegexNode)
  )
  return fc.letrec<{ node: RegexNode }>((tie) => ({
    node: fc.oneof(
      { maxDepth: 4, depthSize: 'small' },
      leaf,
      fc.record({ left: tie('node'), right: tie('node') }).map(
        ({ left, right }) => ({ type: 'concat', left, right }) as RegexNode
      ),
      fc.record({ left: tie('node'), right: tie('node') }).map(
        ({ left, right }) => ({ type: 'union', left, right }) as RegexNode
      ),
      tie('node').map((child) => ({ type: 'star', child }) as RegexNode),
      tie('node').map((child) => ({ type: 'plus', child }) as RegexNode),
      tie('node').map((child) => ({ type: 'optional', child }) as RegexNode)
    ),
  })).node
}

// Random input string over {a, b}, length in [0, 8]. Joined from an array of symbols
// so the string is never a regex source and never reaches a JS RegExp.
const inputArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...SYMBOLS), { minLength: 0, maxLength: 8 })
  .map((chars) => chars.join(''))

function nfaFromAst(ast: RegexNode): NFA {
  return buildNFA(ast)
}

// The per-level active set of the tree is the UNION of the states across all nodes at
// that level. simulateNFA nextStates is already sorted ascending, so comparing the
// sorted union via join(',') is an exact set comparison.
function levelUnionSorted(states: string[][]): string[] {
  const set = new Set<string>()
  for (const group of states) {
    for (const s of group) set.add(s)
  }
  return Array.from(set).sort()
}

describe('computationTree agreement with simulateNFA (SIM-02, invariant 3)', () => {
  // PROPERTY: per-level active set. For a random NFA and random input, the UNION of
  // states across computationTree(nfa, input).levels[i].nodes equals
  // simulateNFA(nfa, input).steps[i].nextStates as a set, for every level i in
  // 0..input.length. This is the data-layer statement of invariant 3: the tree shows
  // the true simultaneously-active set, never a single path. Decided per level by an
  // exact sorted-set compare, never by shape. On a counterexample add a named unit
  // test and fix computationTree.ts; never loosen this.
  it('per-level active set equals simulateNFA nextStates at every level', () => {
    fc.assert(
      fc.property(regexArb(), inputArb, (ast, input) => {
        const nfa = nfaFromAst(ast)
        const tree = computationTree(nfa, input)
        const sim = simulateNFA(nfa, input)

        // One tree level per simulateNFA step (level 0 is the start closure, then one
        // per consumed symbol). The counts must line up exactly.
        expect(tree.levels.length).toBe(sim.steps.length)

        for (let i = 0; i < sim.steps.length; i++) {
          const treeSet = levelUnionSorted(tree.levels[i].nodes.map((n) => n.states))
          const simSet = sim.steps[i].nextStates
          expect(treeSet.join(',')).toBe(simSet.join(','))
        }
      }),
      { seed: 0x10a1, numRuns: 100 }
    )
  })

  // PROPERTY: verdict. computationTree(nfa, input).accepted === simulateNFA(nfa,
  // input).accepted for the same random inputs. The tree's accept verdict is decided
  // by whether a live final-level configuration sits on an accept state, which must
  // equal the simulateNFA verdict.
  it('verdict equals simulateNFA accepted for the same input', () => {
    fc.assert(
      fc.property(regexArb(), inputArb, (ast, input) => {
        const nfa = nfaFromAst(ast)
        expect(computationTree(nfa, input).accepted).toBe(simulateNFA(nfa, input).accepted)
      }),
      { seed: 0x10a1, numRuns: 100 }
    )
  })

  // PROPERTY: bounded. On these small NFAs the tree never throws and stays well within
  // a generous node ceiling. The pathological over-cap case that throws TooLargeError
  // is pinned in computationTree.test.ts; here we only assert that ordinary small cases
  // are bounded and never hang, which is the benign half of the SAFETY-01 contract.
  it('node count stays within a generous bound on small NFAs', () => {
    fc.assert(
      fc.property(regexArb(), inputArb, (ast, input) => {
        const nfa = nfaFromAst(ast)
        const tree = computationTree(nfa, input)
        // The reported count matches the actual node total (no off-by-one in the
        // bound the assertion guards against).
        const actual = tree.levels.reduce((sum, level) => sum + level.nodes.length, 0)
        expect(tree.nodeCount).toBe(actual)
        // Generous ceiling: these NFAs are tiny, far under the shared 256 cap.
        expect(tree.nodeCount).toBeLessThanOrEqual(256)
      }),
      { seed: 0x10a1, numRuns: 100 }
    )
  })

  // NON-VACUITY (threat: a single-state-per-level tree would satisfy per-level
  // equality trivially). A hand-built branching NFA reads symbol a from the start into
  // two successors q1 and q2 that stay simultaneously active, so level 1 holds the
  // genuine parallel set {q1, q2} (size > 1). On the second a, q1 continues to the
  // accept state q3 while q2 has no a-move and dies. This proves the per-level equality
  // has teeth: it is met by a genuinely parallel, branching, partly-dying tree, not a
  // degenerate one-state-per-level path.
  it('is non-vacuous: a parallel level branches and a sibling branch dies', () => {
    // q0 --a--> q1, q0 --a--> q2. q1 --a--> q3 (accepting). q2 has no a-move (dies).
    // No lambda-transitions, so each state closes to itself; the raw move {q1,q2}
    // closes to {q1,q2}: one level-1 configuration whose membership is both branches.
    const nfa: NFA = {
      states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }, { id: 'q3' }],
      transitions: [
        { from: 'q0', to: 'q1', symbol: 'a' },
        { from: 'q0', to: 'q2', symbol: 'a' },
        { from: 'q1', to: 'q3', symbol: 'a' },
      ],
      startState: 'q0',
      acceptStates: ['q3'],
      alphabet: new Set(['a']),
    }

    const tree = computationTree(nfa, 'aa')
    const sim = simulateNFA(nfa, 'aa')

    // Agreement still holds on this hand-built case.
    expect(tree.accepted).toBe(sim.accepted)
    for (let i = 0; i < sim.steps.length; i++) {
      const treeSet = levelUnionSorted(tree.levels[i].nodes.map((n) => n.states))
      expect(treeSet.join(',')).toBe(sim.steps[i].nextStates.join(','))
    }

    // Level 1 (after the first a) holds both q1 and q2: the true parallel set, more
    // than one state, never one arbitrary branch. This is the membership that a
    // single-path tree could not reproduce.
    const level1 = levelUnionSorted(tree.levels[1].nodes.map((n) => n.states))
    expect(level1).toEqual(['q1', 'q2'])
    expect(level1.length).toBeGreaterThan(1)

    // Genuine branching with a death: the {q1, q2} configuration at level 1 reaches
    // accept via q1 on the second a, but q2 contributes no successor (it dies). The
    // level-1 node is therefore marked dead even though the overall input is accepted,
    // and a live child set carrying q3 exists at the final level.
    const finalLevel = tree.levels[tree.levels.length - 1]
    expect(finalLevel.nodes.some((n) => n.states.includes('q3') && n.isAccepting)).toBe(true)
    // q2's branch died: the level-1 configuration spawned a successor (from q1) yet had
    // no a-move for q2, so simulateNFA and the tree drop q2 at the final level.
    const finalSet = levelUnionSorted(finalLevel.nodes.map((n) => n.states))
    expect(finalSet).toEqual(['q3'])
    expect(finalSet).not.toContain('q2')

    expect(tree.accepted).toBe(true)
  })
})
