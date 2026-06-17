import { RegexNode } from '../regex/ast'
import { NFA, State, Transition } from '../automata/types'
import { createStateIdGenerator, createState } from '../automata/nfa'

interface NFAFragment {
  states: State[]
  transitions: Transition[]
  start: string
  accept: string
}

// Per-node fragment record accumulated by buildNFAWithCorrespondence.
// stateIds: all NFA state ids produced by this node (including child nodes).
// start/accept: the fragment entry and exit state for this node.
interface FragmentRecord {
  stateIds: string[]
  start: string
  accept: string
}

// The fragment recorder passed through the correspondence build. Maps the
// stable pre-order node id (n0, n1, ...) to its fragment record. Only
// allocated by buildNFAWithCorrespondence; the core buildNFAFragment path
// is called with undefined so it adds zero overhead to the base case.
type FragmentRecorder = Map<string, FragmentRecord>

// NFA produced by the Thompson construction together with the per-AST-node
// fragment map. Returned as sibling data so NFA/DFA types are not mutated.
// fragments: pre-order node id -> {stateIds, start, accept} for that node.
export interface ThompsonCorrespondence {
  nfa: NFA
  fragments: Map<string, FragmentRecord>
}

// Assign stable pre-order node ids (n0, n1, ...) to every AST node.
// Pre-order = root first, then left-to-right children. This is the same
// ordering the regex pane can reproduce from the same AST, making the ids
// stable across buildNFAWithCorrespondence calls for the same input.
function assignNodeIds(ast: RegexNode): Map<RegexNode, string> {
  const ids = new Map<RegexNode, string>()
  let counter = 0

  function walk(node: RegexNode): void {
    ids.set(node, `n${counter++}`)
    switch (node.type) {
      case 'concat':
      case 'union':
        walk(node.left)
        walk(node.right)
        break
      case 'star':
      case 'plus':
      case 'optional':
        walk(node.child)
        break
      case 'symbol':
      case 'empty':
        break
    }
  }

  walk(ast)
  return ids
}

function buildNFAFragment(
  ast: RegexNode,
  genId: () => string,
  nodeIds?: Map<RegexNode, string>,
  recorder?: FragmentRecorder
): NFAFragment {
  let frag: NFAFragment
  switch (ast.type) {
    case 'empty':
      frag = buildEmpty(genId)
      break
    case 'symbol':
      frag = buildSymbol(ast.value, genId)
      break
    case 'concat':
      frag = buildConcat(ast.left, ast.right, genId, nodeIds, recorder)
      break
    case 'union':
      frag = buildUnion(ast.left, ast.right, genId, nodeIds, recorder)
      break
    case 'star':
      frag = buildStar(ast.child, genId, nodeIds, recorder)
      break
    case 'plus':
      frag = buildPlus(ast.child, genId, nodeIds, recorder)
      break
    case 'optional':
      frag = buildOptional(ast.child, genId, nodeIds, recorder)
      break
  }

  // Record this node's fragment after all children have been recorded so
  // stateIds can include all descendant states.
  if (recorder && nodeIds) {
    const nodeId = nodeIds.get(ast)
    if (nodeId !== undefined) {
      recorder.set(nodeId, {
        stateIds: frag.states.map(s => s.id),
        start: frag.start,
        accept: frag.accept,
      })
    }
  }

  return frag
}

function buildEmpty(genId: () => string): NFAFragment {
  const start = genId()
  const accept = genId()

  return {
    states: [createState(start), createState(accept)],
    transitions: [{ from: start, to: accept, symbol: null }],
    start,
    accept,
  }
}

function buildSymbol(symbol: string, genId: () => string): NFAFragment {
  const start = genId()
  const accept = genId()

  return {
    states: [createState(start), createState(accept)],
    transitions: [{ from: start, to: accept, symbol }],
    start,
    accept,
  }
}

function buildConcat(
  left: RegexNode,
  right: RegexNode,
  genId: () => string,
  nodeIds?: Map<RegexNode, string>,
  recorder?: FragmentRecorder
): NFAFragment {
  const leftFrag = buildNFAFragment(left, genId, nodeIds, recorder)
  const rightFrag = buildNFAFragment(right, genId, nodeIds, recorder)

  return {
    states: [...leftFrag.states, ...rightFrag.states],
    transitions: [
      ...leftFrag.transitions,
      { from: leftFrag.accept, to: rightFrag.start, symbol: null },
      ...rightFrag.transitions,
    ],
    start: leftFrag.start,
    accept: rightFrag.accept,
  }
}

function buildUnion(
  left: RegexNode,
  right: RegexNode,
  genId: () => string,
  nodeIds?: Map<RegexNode, string>,
  recorder?: FragmentRecorder
): NFAFragment {
  const leftFrag = buildNFAFragment(left, genId, nodeIds, recorder)
  const rightFrag = buildNFAFragment(right, genId, nodeIds, recorder)
  const start = genId()
  const accept = genId()

  return {
    states: [
      createState(start),
      ...leftFrag.states,
      ...rightFrag.states,
      createState(accept),
    ],
    transitions: [
      { from: start, to: leftFrag.start, symbol: null },
      { from: start, to: rightFrag.start, symbol: null },
      ...leftFrag.transitions,
      ...rightFrag.transitions,
      { from: leftFrag.accept, to: accept, symbol: null },
      { from: rightFrag.accept, to: accept, symbol: null },
    ],
    start,
    accept,
  }
}

function buildStar(
  child: RegexNode,
  genId: () => string,
  nodeIds?: Map<RegexNode, string>,
  recorder?: FragmentRecorder
): NFAFragment {
  const childFrag = buildNFAFragment(child, genId, nodeIds, recorder)
  const start = genId()
  const accept = genId()

  return {
    states: [createState(start), ...childFrag.states, createState(accept)],
    transitions: [
      { from: start, to: childFrag.start, symbol: null },
      { from: start, to: accept, symbol: null },
      ...childFrag.transitions,
      { from: childFrag.accept, to: childFrag.start, symbol: null },
      { from: childFrag.accept, to: accept, symbol: null },
    ],
    start,
    accept,
  }
}

function buildPlus(
  child: RegexNode,
  genId: () => string,
  nodeIds?: Map<RegexNode, string>,
  recorder?: FragmentRecorder
): NFAFragment {
  const childFrag = buildNFAFragment(child, genId, nodeIds, recorder)
  const start = genId()
  const accept = genId()

  return {
    states: [createState(start), ...childFrag.states, createState(accept)],
    transitions: [
      { from: start, to: childFrag.start, symbol: null },
      ...childFrag.transitions,
      { from: childFrag.accept, to: childFrag.start, symbol: null },
      { from: childFrag.accept, to: accept, symbol: null },
    ],
    start,
    accept,
  }
}

function buildOptional(
  child: RegexNode,
  genId: () => string,
  nodeIds?: Map<RegexNode, string>,
  recorder?: FragmentRecorder
): NFAFragment {
  const childFrag = buildNFAFragment(child, genId, nodeIds, recorder)
  const start = genId()
  const accept = genId()

  return {
    states: [createState(start), ...childFrag.states, createState(accept)],
    transitions: [
      { from: start, to: childFrag.start, symbol: null },
      { from: start, to: accept, symbol: null },
      ...childFrag.transitions,
      { from: childFrag.accept, to: accept, symbol: null },
    ],
    start,
    accept,
  }
}

function collectAlphabet(ast: RegexNode): Set<string> {
  const alphabet = new Set<string>()

  function traverse(node: RegexNode): void {
    switch (node.type) {
      case 'symbol':
        alphabet.add(node.value)
        break
      case 'concat':
      case 'union':
        traverse(node.left)
        traverse(node.right)
        break
      case 'star':
      case 'plus':
      case 'optional':
        traverse(node.child)
        break
      case 'empty':
        break
    }
  }

  traverse(ast)
  return alphabet
}

export function buildNFA(ast: RegexNode): NFA {
  const genId = createStateIdGenerator()
  const fragment = buildNFAFragment(ast, genId)
  const alphabet = collectAlphabet(ast)

  return {
    states: fragment.states,
    transitions: fragment.transitions,
    startState: fragment.start,
    acceptStates: [fragment.accept],
    alphabet,
  }
}

// Non-breaking wrapper that returns the NFA together with the per-AST-node
// fragment map. The core buildNFA export above is left byte-identical so
// every existing call site and test continues to work without change.
//
// Node ids are stable pre-order indices (n0, n1, ...) assigned before
// any states are generated. The regex pane can walk the same AST in the
// same pre-order to assign matching ids to the spans it renders, enabling
// click-on-span -> highlight-NFA-states without parsing state ids.
export function buildNFAWithCorrespondence(ast: RegexNode): ThompsonCorrespondence {
  const genId = createStateIdGenerator()
  const nodeIds = assignNodeIds(ast)
  const recorder: FragmentRecorder = new Map()

  const fragment = buildNFAFragment(ast, genId, nodeIds, recorder)
  const alphabet = collectAlphabet(ast)

  const nfa: NFA = {
    states: fragment.states,
    transitions: fragment.transitions,
    startState: fragment.start,
    acceptStates: [fragment.accept],
    alphabet,
  }

  return { nfa, fragments: recorder }
}
