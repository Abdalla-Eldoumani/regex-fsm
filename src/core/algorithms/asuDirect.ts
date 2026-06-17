import { RegexNode } from '../regex/ast'
import { DFA, State, Transition } from '../automata/types'

// Internal augmented AST node with unique IDs for annotation
interface AnnotatedNode {
  id: number
  type: RegexNode['type']
  position?: number // leaf position (only for symbol/endmarker nodes)
  symbol?: string
  left?: AnnotatedNode
  right?: AnnotatedNode
  child?: AnnotatedNode
  nullable: boolean
  firstpos: Set<number>
  lastpos: Set<number>
}

export interface ASUResult {
  dfa: DFA
  positions: Map<number, string>
  nullable: Map<number, boolean>
  firstpos: Map<number, Set<number>>
  lastpos: Map<number, Set<number>>
  followpos: Map<number, Set<number>>
  description: string
}

// A unique node id source scoped to a single asuDirectDFA call. Keeping the
// counter inside a closure rather than at module scope means concurrent or
// re-entrant calls cannot share the counter, so node ids never leak between
// constructions. Mirrors createStateIdGenerator in the automata layer.
function createNodeIdGenerator(): () => number {
  let counter = 0
  return () => counter++
}

function annotate(
  ast: RegexNode,
  positions: Map<number, string>,
  posCounter: { val: number },
  nextNodeId: () => number
): AnnotatedNode {
  switch (ast.type) {
    case 'empty': {
      return {
        id: nextNodeId(),
        type: 'empty',
        nullable: true,
        firstpos: new Set(),
        lastpos: new Set(),
      }
    }
    case 'symbol': {
      const pos = posCounter.val++
      positions.set(pos, ast.value)
      return {
        id: nextNodeId(),
        type: 'symbol',
        position: pos,
        symbol: ast.value,
        nullable: false,
        firstpos: new Set([pos]),
        lastpos: new Set([pos]),
      }
    }
    case 'concat': {
      const left = annotate(ast.left, positions, posCounter, nextNodeId)
      const right = annotate(ast.right, positions, posCounter, nextNodeId)
      const nullable = left.nullable && right.nullable
      const firstpos = left.nullable
        ? union(left.firstpos, right.firstpos)
        : new Set(left.firstpos)
      const lastpos = right.nullable
        ? union(left.lastpos, right.lastpos)
        : new Set(right.lastpos)
      return {
        id: nextNodeId(),
        type: 'concat',
        left,
        right,
        nullable,
        firstpos,
        lastpos,
      }
    }
    case 'union': {
      const left = annotate(ast.left, positions, posCounter, nextNodeId)
      const right = annotate(ast.right, positions, posCounter, nextNodeId)
      return {
        id: nextNodeId(),
        type: 'union',
        left,
        right,
        nullable: left.nullable || right.nullable,
        firstpos: union(left.firstpos, right.firstpos),
        lastpos: union(left.lastpos, right.lastpos),
      }
    }
    case 'star': {
      const child = annotate(ast.child, positions, posCounter, nextNodeId)
      return {
        id: nextNodeId(),
        type: 'star',
        child,
        nullable: true,
        firstpos: new Set(child.firstpos),
        lastpos: new Set(child.lastpos),
      }
    }
    case 'plus': {
      const child = annotate(ast.child, positions, posCounter, nextNodeId)
      return {
        id: nextNodeId(),
        type: 'plus',
        child,
        nullable: child.nullable,
        firstpos: new Set(child.firstpos),
        lastpos: new Set(child.lastpos),
      }
    }
    case 'optional': {
      const child = annotate(ast.child, positions, posCounter, nextNodeId)
      return {
        id: nextNodeId(),
        type: 'optional',
        child,
        nullable: true,
        firstpos: new Set(child.firstpos),
        lastpos: new Set(child.lastpos),
      }
    }
  }
}

function union(a: Set<number>, b: Set<number>): Set<number> {
  const result = new Set(a)
  for (const item of b) result.add(item)
  return result
}

function computeFollowpos(node: AnnotatedNode, followpos: Map<number, Set<number>>): void {
  if (node.type === 'concat' && node.left && node.right) {
    for (const i of node.left.lastpos) {
      if (!followpos.has(i)) followpos.set(i, new Set())
      for (const j of node.right.firstpos) {
        followpos.get(i)!.add(j)
      }
    }
    computeFollowpos(node.left, followpos)
    computeFollowpos(node.right, followpos)
  } else if ((node.type === 'star' || node.type === 'plus') && node.child) {
    for (const i of node.child.lastpos) {
      if (!followpos.has(i)) followpos.set(i, new Set())
      for (const j of node.child.firstpos) {
        followpos.get(i)!.add(j)
      }
    }
    computeFollowpos(node.child, followpos)
  } else if (node.type === 'union' && node.left && node.right) {
    computeFollowpos(node.left, followpos)
    computeFollowpos(node.right, followpos)
  } else if (node.type === 'optional' && node.child) {
    computeFollowpos(node.child, followpos)
  }
}

function stateSetKey(s: Set<number>): string {
  return Array.from(s).sort((a, b) => a - b).join(',')
}

export function asuDirectDFA(ast: RegexNode, alphabet: Set<string>): ASUResult {
  const nextNodeId = createNodeIdGenerator()
  const positions = new Map<number, string>()
  const posCounter = { val: 0 }

  // Augment: (r)#
  const END_MARKER = '#'
  const annotatedAst = annotate(ast, positions, posCounter, nextNodeId)
  const endPos = posCounter.val
  positions.set(endPos, END_MARKER)

  const endNode: AnnotatedNode = {
    id: nextNodeId(),
    type: 'symbol',
    position: endPos,
    symbol: END_MARKER,
    nullable: false,
    firstpos: new Set([endPos]),
    lastpos: new Set([endPos]),
  }

  // Root = concat(ast, endmarker)
  const root: AnnotatedNode = {
    id: nextNodeId(),
    type: 'concat',
    left: annotatedAst,
    right: endNode,
    nullable: annotatedAst.nullable && false,
    firstpos: annotatedAst.nullable
      ? union(annotatedAst.firstpos, new Set([endPos]))
      : new Set(annotatedAst.firstpos),
    lastpos: new Set([endPos]),
  }

  // Compute followpos
  const followpos = new Map<number, Set<number>>()
  for (let i = 0; i <= endPos; i++) {
    followpos.set(i, new Set())
  }
  computeFollowpos(root, followpos)

  // Collect nullable/firstpos/lastpos maps (keyed by nodeId)
  const nullableMap = new Map<number, boolean>()
  const firstposMap = new Map<number, Set<number>>()
  const lastposMap = new Map<number, Set<number>>()

  function collectInfo(n: AnnotatedNode) {
    nullableMap.set(n.id, n.nullable)
    firstposMap.set(n.id, n.firstpos)
    lastposMap.set(n.id, n.lastpos)
    if (n.left) collectInfo(n.left)
    if (n.right) collectInfo(n.right)
    if (n.child) collectInfo(n.child)
  }
  collectInfo(root)

  // Build DFA using position sets
  const startSet = root.firstpos
  const startKey = stateSetKey(startSet)

  const stateMap = new Map<string, Set<number>>() // key -> position set
  const stateNames = new Map<string, string>() // key -> DFA state name
  let stateCounter = 0

  function getStateName(key: string): string {
    if (!stateNames.has(key)) {
      stateNames.set(key, `q${stateCounter++}`)
    }
    return stateNames.get(key)!
  }

  stateMap.set(startKey, startSet)
  const startStateName = getStateName(startKey)

  const worklist: string[] = [startKey]
  const dfaTransitions: Transition[] = []
  const TRAP_STATE = '∅'
  let trapNeeded = false

  while (worklist.length > 0) {
    const currentKey = worklist.pop()!
    const currentSet = stateMap.get(currentKey)!
    const currentName = getStateName(currentKey)

    for (const symbol of alphabet) {
      // U = union of followpos(p) for all p in currentSet where positions[p] == symbol
      const target = new Set<number>()
      for (const p of currentSet) {
        if (positions.get(p) === symbol) {
          for (const fp of followpos.get(p) || []) {
            target.add(fp)
          }
        }
      }

      if (target.size === 0) {
        trapNeeded = true
        dfaTransitions.push({
          from: currentName,
          to: TRAP_STATE,
          symbol,
        })
      } else {
        const targetKey = stateSetKey(target)
        if (!stateMap.has(targetKey)) {
          stateMap.set(targetKey, target)
          worklist.push(targetKey)
        }
        dfaTransitions.push({
          from: currentName,
          to: getStateName(targetKey),
          symbol,
        })
      }
    }
  }

  // Build states list
  const states: State[] = Array.from(stateNames.values()).map(id => ({ id }))

  // Accept states = any state containing endPos
  const acceptStates: string[] = []
  for (const [key, posSet] of stateMap) {
    if (posSet.has(endPos)) {
      acceptStates.push(getStateName(key))
    }
  }

  // Add trap state if needed
  if (trapNeeded) {
    states.push({ id: TRAP_STATE })
    for (const symbol of alphabet) {
      dfaTransitions.push({
        from: TRAP_STATE,
        to: TRAP_STATE,
        symbol,
      })
    }
  }

  const dfa: DFA = {
    states,
    transitions: dfaTransitions,
    startState: startStateName,
    acceptStates,
    alphabet: new Set(alphabet),
  }

  return {
    dfa,
    positions,
    nullable: nullableMap,
    firstpos: firstposMap,
    lastpos: lastposMap,
    followpos,
    description: `ASU direct construction: ${positions.size - 1} positions, ${states.length} DFA states`,
  }
}
