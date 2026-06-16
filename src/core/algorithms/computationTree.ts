import { NFA } from '../automata/types'
import { lambdaClosure } from './lambda'
import { assertWithinBounds, BOUNDS } from './bounds'

// The genuine nondeterministic execution of an NFA on an input string, unrolled into
// a level-per-symbol configuration-set DAG (automata-correctness invariant 3). The
// crux of SIM-02: simulateNFA records only the flat per-position active set; this
// records which configuration branched to which successor on each symbol, which
// branches die, and which leaves accept -- the structure the computation-tree view
// renders without re-deriving anything.
//
// The representation is the subset construction unrolled along ONE input string:
// nodes are lambda-closed reachable state sets, one level per consumed symbol, and
// equal sets at a level collapse to one node. This is why it cannot blow up
// exponentially or loop on lambda-cycles: breadth per level is bounded by the number
// of distinct reachable subsets, and lambda-cycles collapse inside lambdaClosure. A
// per-run path tree would be exponential in branching and infinite under lambda-cycles.

// One node is a single NFA configuration reached at a given level: the lambda-closed
// set of states the machine is in after consuming the symbols on the path from the
// root to this node. Grouping by set (not by run) keeps the tree bounded.
export interface ComputationNode {
  // Stable id within the tree (`${level}:{sorted,states}`) so the view can key on it
  // and equal sets at a level share one id.
  id: string
  // Number of input symbols consumed to reach this node. The root is level 0.
  level: number
  // The lambda-closed active set at this node, sorted ascending to match the
  // simulateNFA nextStates ordering.
  states: string[]
  // True only when this node is at the final level AND a member is an accept state:
  // a genuine accepting leaf for this input. The result-level `accepted` is the
  // authoritative verdict; this flag drives the per-node accept ring.
  isAccepting: boolean
  // True when this configuration has no successor on the next symbol (the raw move is
  // empty before closure): a dead branch, rendered dashed and dimmed.
  isDead: boolean
  // The id of the first parent that reached this node (null for the root). With
  // set-grouping a node may be reached from several parents; every link is recorded
  // in `edges`, while `parentId` keeps the first for a simple tree spine.
  parentId: string | null
}

// A parent->child link across consecutive levels. `symbol` is the input symbol
// consumed at the child's level. `viaLambda` is true when the child's set required
// lambda-closure beyond the raw move, so the view can mark the closure expansion
// lambda distinctly from the consuming edge.
export interface ComputationEdge {
  fromId: string
  toId: string
  symbol: string
  viaLambda: boolean
}

export interface ComputationLevel {
  // 0..input.length.
  index: number
  // The symbol consumed to reach this level (null for level 0).
  symbol: string | null
  // The configurations alive at this level.
  nodes: ComputationNode[]
}

export interface ComputationTreeResult {
  // levels[i].nodes are the configurations after i symbols.
  levels: ComputationLevel[]
  // Every parent->child edge across consecutive levels.
  edges: ComputationEdge[]
  // Whether any live configuration at the final level sits on an accept state. This
  // equals simulateNFA(nfa, input).accepted; the property suite asserts it.
  accepted: boolean
  // Total node count, for the bound assertion and the UI.
  nodeCount: number
}

// Local move, identical in shape to simulate.ts and subset.ts so the tree's per-level
// set matches simulateNFA exactly: the reachable states on `symbol` from the given set,
// before lambda-closure.
function move(nfa: NFA, stateIds: string[], symbol: string): Set<string> {
  const result = new Set<string>()

  for (const stateId of stateIds) {
    nfa.transitions
      .filter(t => t.from === stateId && t.symbol === symbol)
      .forEach(t => result.add(t.to))
  }

  return result
}

function nodeId(level: number, states: string[]): string {
  return `${level}:{${states.join(',')}}`
}

function intersectsAccept(nfa: NFA, states: string[]): boolean {
  return states.some(s => nfa.acceptStates.includes(s))
}

export function computationTree(nfa: NFA, input: string): ComputationTreeResult {
  const startedAt = performance.now()
  const levels: ComputationLevel[] = []
  const edges: ComputationEdge[] = []
  let nodeCount = 0

  // Level 0: the root is the lambda-closure of the start state (the invariant-3 start
  // step). On the empty input the root is itself the final level, so it accepts when it
  // intersects the accept set.
  const rootSet = Array.from(lambdaClosure(nfa, [nfa.startState])).sort()
  const root: ComputationNode = {
    id: nodeId(0, rootSet),
    level: 0,
    states: rootSet,
    isAccepting: input.length === 0 && intersectsAccept(nfa, rootSet),
    isDead: false,
    parentId: null,
  }
  levels.push({ index: 0, symbol: null, nodes: [root] })
  nodeCount += 1
  // Bound after recording each node (the subset.ts contract): a true blow-up trips
  // TooLargeError; a small tree never does.
  assertWithinBounds(nodeCount, BOUNDS.TIME_BUDGET_MS, startedAt)

  // One level per input symbol. Successors are grouped by their sorted lambda-closed
  // set so equal sets at a level collapse to one node; this bounds breadth to the
  // distinct reachable subsets and collapses lambda-cycles.
  let prevNodes = levels[0].nodes
  for (let i = 0; i < input.length; i++) {
    const symbol = input[i]
    const isLastLevel = i === input.length - 1
    const byKey = new Map<string, ComputationNode>()
    const thisLevelNodes: ComputationNode[] = []

    for (const parent of prevNodes) {
      if (parent.states.length === 0) continue
      const rawMove = move(nfa, parent.states, symbol)
      if (rawMove.size === 0) {
        // This parent has no successor on this symbol: a dead branch. Mark it so the
        // view dashes and dims it; it spawns no child at this level.
        parent.isDead = true
        continue
      }

      const closed = lambdaClosure(nfa, Array.from(rawMove))
      const childStates = Array.from(closed).sort()
      const key = childStates.join(',')
      // Closure added states beyond the raw move, so a lambda-move was taken to reach
      // this child: surface it so the view can label the expansion lambda.
      const viaLambda = closed.size > rawMove.size

      let child = byKey.get(key)
      if (!child) {
        child = {
          id: nodeId(i + 1, childStates),
          level: i + 1,
          states: childStates,
          isAccepting: isLastLevel && intersectsAccept(nfa, childStates),
          isDead: false,
          parentId: parent.id,
        }
        byKey.set(key, child)
        thisLevelNodes.push(child)
        nodeCount += 1
        assertWithinBounds(nodeCount, BOUNDS.TIME_BUDGET_MS, startedAt)
      }
      // Record every parent->child link (a set may be reached from several parents) so
      // the view can draw the full fan-out, even though parentId keeps only the first.
      edges.push({ fromId: parent.id, toId: child.id, symbol, viaLambda })
    }

    levels.push({ index: i + 1, symbol, nodes: thisLevelNodes })
    prevNodes = thisLevelNodes
  }

  // Verdict: any live configuration at the final level on an accept state. This must
  // equal simulateNFA(nfa, input).accepted; the property suite asserts exactly that.
  const finalNodes = levels[levels.length - 1].nodes
  const accepted = finalNodes.some(n => intersectsAccept(nfa, n.states))

  return { levels, edges, accepted, nodeCount }
}
