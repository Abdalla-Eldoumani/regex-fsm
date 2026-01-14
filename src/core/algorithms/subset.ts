import { NFA, DFA, State, Transition } from '../automata/types'
import { lambdaClosure } from './lambda'

function move(nfa: NFA, stateIds: Set<string>, symbol: string): Set<string> {
  const result = new Set<string>()

  for (const stateId of stateIds) {
    nfa.transitions
      .filter(t => t.from === stateId && t.symbol === symbol)
      .forEach(t => result.add(t.to))
  }

  return result
}

function stateSetToString(stateIds: Set<string>): string {
  return `{${Array.from(stateIds).sort().join(',')}}`
}

function stateSetEquals(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const item of a) {
    if (!b.has(item)) return false
  }
  return true
}

function findExistingState(
  dfaStates: Map<string, Set<string>>,
  stateSet: Set<string>
): string | null {
  for (const [key, existingSet] of dfaStates) {
    if (stateSetEquals(existingSet, stateSet)) {
      return key
    }
  }
  return null
}

export function nfaToDFA(nfa: NFA, customAlphabet?: Set<string>): DFA {
  const dfaStates = new Map<string, Set<string>>()
  const dfaTransitions: Transition[] = []
  const worklist: Set<string>[] = []

  const startClosure = lambdaClosure(nfa, [nfa.startState])
  const startStateName = stateSetToString(startClosure)
  dfaStates.set(startStateName, startClosure)
  worklist.push(startClosure)

  const alphabet = customAlphabet || nfa.alphabet

  const TRAP_STATE = '∅'
  let trapStateNeeded = false

  while (worklist.length > 0) {
    const currentSet = worklist.pop()!
    const currentName = stateSetToString(currentSet)

    for (const symbol of alphabet) {
      const moveResult = move(nfa, currentSet, symbol)
      const targetClosure = lambdaClosure(nfa, Array.from(moveResult))

      if (targetClosure.size === 0) {
        trapStateNeeded = true
        dfaTransitions.push({
          from: currentName,
          to: TRAP_STATE,
          symbol,
        })
        continue
      }

      let targetName = findExistingState(dfaStates, targetClosure)

      if (targetName === null) {
        targetName = stateSetToString(targetClosure)
        dfaStates.set(targetName, targetClosure)
        worklist.push(targetClosure)
      }

      dfaTransitions.push({
        from: currentName,
        to: targetName,
        symbol,
      })
    }
  }

  if (trapStateNeeded) {
    dfaStates.set(TRAP_STATE, new Set())

    for (const symbol of alphabet) {
      dfaTransitions.push({
        from: TRAP_STATE,
        to: TRAP_STATE,
        symbol,
      })
    }
  }

  const states: State[] = Array.from(dfaStates.keys()).map(id => ({ id }))

  const acceptStates: string[] = []
  for (const [stateName, stateSet] of dfaStates) {
    for (const nfaAccept of nfa.acceptStates) {
      if (stateSet.has(nfaAccept)) {
        acceptStates.push(stateName)
        break
      }
    }
  }

  return {
    states,
    transitions: dfaTransitions,
    startState: startStateName,
    acceptStates,
    alphabet: new Set(alphabet),
  }
}
