import { RegexNode } from '../regex/ast'
import { NFA, State, Transition } from '../automata/types'
import { createStateIdGenerator, createState } from '../automata/nfa'

interface NFAFragment {
  states: State[]
  transitions: Transition[]
  start: string
  accept: string
}

function buildNFAFragment(
  ast: RegexNode,
  genId: () => string
): NFAFragment {
  switch (ast.type) {
    case 'empty':
      return buildEmpty(genId)
    case 'symbol':
      return buildSymbol(ast.value, genId)
    case 'concat':
      return buildConcat(ast.left, ast.right, genId)
    case 'union':
      return buildUnion(ast.left, ast.right, genId)
    case 'star':
      return buildStar(ast.child, genId)
    case 'plus':
      return buildPlus(ast.child, genId)
    case 'optional':
      return buildOptional(ast.child, genId)
  }
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
  genId: () => string
): NFAFragment {
  const leftFrag = buildNFAFragment(left, genId)
  const rightFrag = buildNFAFragment(right, genId)

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
  genId: () => string
): NFAFragment {
  const leftFrag = buildNFAFragment(left, genId)
  const rightFrag = buildNFAFragment(right, genId)
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

function buildStar(child: RegexNode, genId: () => string): NFAFragment {
  const childFrag = buildNFAFragment(child, genId)
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

function buildPlus(child: RegexNode, genId: () => string): NFAFragment {
  const childFrag = buildNFAFragment(child, genId)
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

function buildOptional(child: RegexNode, genId: () => string): NFAFragment {
  const childFrag = buildNFAFragment(child, genId)
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
