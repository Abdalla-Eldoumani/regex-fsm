import { RegexNode } from '../regex/ast'
import { DFA, State, Transition, TooLargeError, BOUNDS } from '../automata/types'

// Extended node type for Brzozowski: adds 'reject' (empty language ∅)
type BrzNode =
  | { type: 'empty' }
  | { type: 'reject' }
  | { type: 'symbol'; value: string }
  | { type: 'concat'; left: BrzNode; right: BrzNode }
  | { type: 'union'; left: BrzNode; right: BrzNode }
  | { type: 'star'; child: BrzNode }
  | { type: 'plus'; child: BrzNode }
  | { type: 'optional'; child: BrzNode }

export interface BrzozowskiResult {
  dfa: DFA
  stateExpressions: Map<string, BrzNode>
  derivatives: Array<{
    fromState: string
    symbol: string
    derivative: BrzNode
    simplified: BrzNode
    toState: string
  }>
  description: string
}

function regexToBrz(node: RegexNode): BrzNode {
  return node as BrzNode
}

function nullable(r: BrzNode): boolean {
  switch (r.type) {
    case 'empty': return true
    case 'reject': return false
    case 'symbol': return false
    case 'concat': return nullable(r.left) && nullable(r.right)
    case 'union': return nullable(r.left) || nullable(r.right)
    case 'star': return true
    case 'plus': return nullable(r.child)
    case 'optional': return true
  }
}

function derivative(r: BrzNode, a: string): BrzNode {
  switch (r.type) {
    case 'empty':
      return { type: 'reject' }
    case 'reject':
      return { type: 'reject' }
    case 'symbol':
      return r.value === a ? { type: 'empty' } : { type: 'reject' }
    case 'concat': {
      // D_a(LR) = D_a(L)R | (if nullable(L) then D_a(R) else ∅)
      const dLeft: BrzNode = { type: 'concat', left: derivative(r.left, a), right: r.right }
      if (nullable(r.left)) {
        return { type: 'union', left: dLeft, right: derivative(r.right, a) }
      }
      return dLeft
    }
    case 'union':
      return { type: 'union', left: derivative(r.left, a), right: derivative(r.right, a) }
    case 'star':
      // D_a(R*) = D_a(R) . R*
      return { type: 'concat', left: derivative(r.child, a), right: r }
    case 'plus':
      // D_a(R+) = D_a(R) . R*
      return { type: 'concat', left: derivative(r.child, a), right: { type: 'star', child: r.child } }
    case 'optional':
      return derivative(r.child, a)
  }
}

function simplify(r: BrzNode): BrzNode {
  switch (r.type) {
    case 'empty':
    case 'reject':
    case 'symbol':
      return r

    case 'concat': {
      const left = simplify(r.left)
      const right = simplify(r.right)
      // ∅ . R = ∅
      if (left.type === 'reject') return { type: 'reject' }
      // R . ∅ = ∅
      if (right.type === 'reject') return { type: 'reject' }
      // λ . R = R
      if (left.type === 'empty') return right
      // R . λ = R
      if (right.type === 'empty') return left
      return { type: 'concat', left, right }
    }

    case 'union': {
      const left = simplify(r.left)
      const right = simplify(r.right)
      // ∅ | R = R
      if (left.type === 'reject') return right
      // R | ∅ = R
      if (right.type === 'reject') return left
      // R | R = R (structural equality via canonical form)
      const lStr = toCanonical(left)
      const rStr = toCanonical(right)
      if (lStr === rStr) return left
      // Sort union operands for canonical form
      if (lStr > rStr) return { type: 'union', left: right, right: left }
      return { type: 'union', left, right }
    }

    case 'star': {
      const child = simplify(r.child)
      // (∅)* = λ
      if (child.type === 'reject') return { type: 'empty' }
      // (λ)* = λ
      if (child.type === 'empty') return { type: 'empty' }
      // (R*)* = R*
      if (child.type === 'star') return child
      return { type: 'star', child }
    }

    case 'plus': {
      const child = simplify(r.child)
      if (child.type === 'reject') return { type: 'reject' }
      if (child.type === 'empty') return { type: 'empty' }
      return { type: 'plus', child }
    }

    case 'optional': {
      const child = simplify(r.child)
      if (child.type === 'reject') return { type: 'empty' }
      if (child.type === 'empty') return { type: 'empty' }
      return { type: 'optional', child }
    }
  }
}

function toCanonical(r: BrzNode): string {
  switch (r.type) {
    case 'empty': return 'λ'
    case 'reject': return '∅'
    case 'symbol': return r.value
    case 'concat': return `(${toCanonical(r.left)}.${toCanonical(r.right)})`
    case 'union': return `(${toCanonical(r.left)}|${toCanonical(r.right)})`
    case 'star': return `(${toCanonical(r.child)})*`
    case 'plus': return `(${toCanonical(r.child)})+`
    case 'optional': return `(${toCanonical(r.child)})?`
  }
}

export function brzozowskiDFA(ast: RegexNode, alphabet: Set<string>): BrzozowskiResult {
  const startExpr = simplify(regexToBrz(ast))
  const startKey = toCanonical(startExpr)

  const stateExpressions = new Map<string, BrzNode>()
  const stateNames = new Map<string, string>()
  let stateCounter = 0

  function getStateName(key: string): string {
    if (!stateNames.has(key)) {
      stateNames.set(key, `q${stateCounter++}`)
    }
    return stateNames.get(key)!
  }

  stateExpressions.set(startKey, startExpr)
  const startStateName = getStateName(startKey)

  const worklist: string[] = [startKey]
  const dfaTransitions: Transition[] = []
  const derivativeLog: BrzozowskiResult['derivatives'] = []
  const TRAP_STATE = '∅'
  let trapNeeded = false
  // Wall-clock budget: mirror of subset.ts. Captured before the loop so the
  // first iteration's check reflects actual elapsed time, not setup cost.
  const startedAt = performance.now()

  while (worklist.length > 0) {
    // SAFETY-01: throw instead of silently returning a truncated (wrong) DFA.
    // A partial DFA presented as complete is worse than none (invariant 8).
    if (stateExpressions.size > BOUNDS.MAX_DFA_STATES) {
      throw new TooLargeError('state-cap', BOUNDS.MAX_DFA_STATES, { states: stateExpressions.size })
    }
    if (performance.now() - startedAt > BOUNDS.TIME_BUDGET_MS) {
      throw new TooLargeError('time-budget', BOUNDS.TIME_BUDGET_MS, { states: stateExpressions.size })
    }
    const currentKey = worklist.pop()!
    const currentExpr = stateExpressions.get(currentKey)!
    const currentName = getStateName(currentKey)

    for (const symbol of alphabet) {
      const rawDeriv = derivative(currentExpr, symbol)
      const simplified = simplify(rawDeriv)
      const targetKey = toCanonical(simplified)

      // Check if this is the reject state
      if (targetKey === '∅') {
        trapNeeded = true
        dfaTransitions.push({
          from: currentName,
          to: TRAP_STATE,
          symbol,
        })
        derivativeLog.push({
          fromState: currentName,
          symbol,
          derivative: rawDeriv,
          simplified,
          toState: TRAP_STATE,
        })
        continue
      }

      if (!stateExpressions.has(targetKey)) {
        stateExpressions.set(targetKey, simplified)
        worklist.push(targetKey)
      }

      const targetName = getStateName(targetKey)
      dfaTransitions.push({
        from: currentName,
        to: targetName,
        symbol,
      })
      derivativeLog.push({
        fromState: currentName,
        symbol,
        derivative: rawDeriv,
        simplified,
        toState: targetName,
      })
    }
  }

  // Build states
  const states: State[] = Array.from(stateNames.values()).map(id => ({ id }))

  // Accept states = states where nullable(expr) is true
  const acceptStates: string[] = []
  for (const [key, expr] of stateExpressions) {
    if (nullable(expr) && key !== '∅') {
      acceptStates.push(getStateName(key))
    }
  }

  // Add trap state
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

  // Map stateExpressions to use DFA state names
  const namedExpressions = new Map<string, BrzNode>()
  for (const [key, expr] of stateExpressions) {
    namedExpressions.set(getStateName(key), expr)
  }

  return {
    dfa,
    stateExpressions: namedExpressions,
    derivatives: derivativeLog,
    description: `Brzozowski derivative construction: ${states.length} DFA states, ${derivativeLog.length} derivatives computed`,
  }
}
