import { NFA } from '../automata/types'

export function epsilonClosure(nfa: NFA, stateIds: string[]): Set<string> {
  const result = new Set<string>(stateIds)
  const stack = [...stateIds]

  while (stack.length > 0) {
    const current = stack.pop()!

    nfa.transitions
      .filter(t => t.from === current && t.symbol === null)
      .forEach(t => {
        if (!result.has(t.to)) {
          result.add(t.to)
          stack.push(t.to)
        }
      })
  }

  return result
}
