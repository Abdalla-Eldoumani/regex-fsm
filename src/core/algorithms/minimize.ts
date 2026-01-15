import { DFA, State, Transition } from '../automata/types'

/**
 * Result of DFA minimization
 */
export interface MinimizationResult {
  dfa: DFA
  stateMapping: Map<string, string>  // old state -> new state
  mergedStates: Map<string, string[]>  // new state -> list of old states it represents
  description: string
}

/**
 * Minimize a DFA using Moore's algorithm (partition refinement).
 *
 * Algorithm:
 * 1. Initial partition: {accepting states} and {non-accepting states}
 * 2. Refine: Split partitions where states have different transition targets
 * 3. Repeat until no more splits possible
 * 4. Each final partition becomes one state in minimal DFA
 *
 * @param dfa The DFA to minimize
 * @param useLetterNames If true, use A, B, C...; if false, use q0, q1, q2...
 * @returns Minimized DFA with clean state names
 */
export function minimizeDFA(dfa: DFA, useLetterNames: boolean = false): MinimizationResult {
  // Handle edge cases
  if (dfa.states.length === 0) {
    return {
      dfa,
      stateMapping: new Map(),
      mergedStates: new Map(),
      description: 'Empty DFA - no minimization needed'
    }
  }

  // Remove unreachable states first
  const reachableStates = findReachableStates(dfa)
  const reachableDFA = filterToReachable(dfa, reachableStates)

  if (reachableDFA.states.length === 0) {
    return {
      dfa: reachableDFA,
      stateMapping: new Map(),
      mergedStates: new Map(),
      description: 'No reachable states'
    }
  }

  // Build transition map for quick lookup
  const transitionMap = buildTransitionMap(reachableDFA)

  // Initial partition: accepting vs non-accepting
  const acceptSet = new Set(reachableDFA.acceptStates)
  const nonAcceptStates = reachableDFA.states
    .map(s => s.id)
    .filter(id => !acceptSet.has(id))
  const acceptStates = reachableDFA.states
    .map(s => s.id)
    .filter(id => acceptSet.has(id))

  let partitions: Set<string>[] = []
  if (nonAcceptStates.length > 0) {
    partitions.push(new Set(nonAcceptStates))
  }
  if (acceptStates.length > 0) {
    partitions.push(new Set(acceptStates))
  }

  // Create state-to-partition index
  const getPartitionIndex = (state: string, parts: Set<string>[]): number => {
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].has(state)) return i
    }
    return -1
  }

  // Refine partitions until stable
  let changed = true
  while (changed) {
    changed = false
    const newPartitions: Set<string>[] = []

    for (const partition of partitions) {
      if (partition.size <= 1) {
        newPartitions.push(partition)
        continue
      }

      // Group states by their transition signature
      const groups = new Map<string, Set<string>>()

      for (const state of partition) {
        // Build signature: for each symbol, which partition does the transition go to?
        const signature: number[] = []
        for (const symbol of reachableDFA.alphabet) {
          const target = transitionMap.get(`${state},${symbol}`)
          if (target) {
            signature.push(getPartitionIndex(target, partitions))
          } else {
            signature.push(-1)  // No transition (shouldn't happen in complete DFA)
          }
        }

        const sigKey = signature.join(',')
        if (!groups.has(sigKey)) {
          groups.set(sigKey, new Set())
        }
        groups.get(sigKey)!.add(state)
      }

      // If we split the partition, mark changed
      if (groups.size > 1) {
        changed = true
      }

      for (const group of groups.values()) {
        newPartitions.push(group)
      }
    }

    partitions = newPartitions
  }

  // Build the minimal DFA
  const stateMapping = new Map<string, string>()  // old state -> new state name
  const mergedStates = new Map<string, string[]>()  // new state -> old states

  // Assign names to partitions
  partitions.forEach((partition, index) => {
    const newName = useLetterNames
      ? getLetterName(index)
      : `q${index}`

    const oldStates = Array.from(partition).sort()
    mergedStates.set(newName, oldStates)

    for (const oldState of partition) {
      stateMapping.set(oldState, newName)
    }
  })

  // Build new states
  const newStates: State[] = []
  for (const [newName, oldStates] of mergedStates) {
    // Create label showing merged states if multiple
    const label = oldStates.length > 1
      ? `${newName}` // Just use new name, old states shown in tooltip
      : newName
    newStates.push({ id: newName, label })
  }

  // Build new transitions
  const newTransitions: Transition[] = []
  const seenTransitions = new Set<string>()

  for (const oldTransition of reachableDFA.transitions) {
    const newFrom = stateMapping.get(oldTransition.from)
    const newTo = stateMapping.get(oldTransition.to)

    if (newFrom && newTo) {
      const transKey = `${newFrom},${oldTransition.symbol},${newTo}`
      if (!seenTransitions.has(transKey)) {
        seenTransitions.add(transKey)
        newTransitions.push({
          from: newFrom,
          to: newTo,
          symbol: oldTransition.symbol
        })
      }
    }
  }

  // Determine new start and accept states
  const newStartState = stateMapping.get(reachableDFA.startState) || 'q0'
  const newAcceptStates = [...new Set(
    reachableDFA.acceptStates
      .map(s => stateMapping.get(s))
      .filter((s): s is string => s !== undefined)
  )]

  // Sort states to ensure consistent ordering (start state first)
  newStates.sort((a, b) => {
    if (a.id === newStartState) return -1
    if (b.id === newStartState) return 1
    return a.id.localeCompare(b.id)
  })

  const minimalDFA: DFA = {
    states: newStates,
    transitions: newTransitions,
    startState: newStartState,
    acceptStates: newAcceptStates,
    alphabet: reachableDFA.alphabet
  }

  const statesRemoved = dfa.states.length - newStates.length
  const description = statesRemoved > 0
    ? `Minimized DFA: ${dfa.states.length} → ${newStates.length} states (removed ${statesRemoved})`
    : `DFA was already minimal (${newStates.length} states)`

  return {
    dfa: minimalDFA,
    stateMapping,
    mergedStates,
    description
  }
}

/**
 * Find all states reachable from the start state
 */
function findReachableStates(dfa: DFA): Set<string> {
  const reachable = new Set<string>()
  const worklist: string[] = [dfa.startState]

  while (worklist.length > 0) {
    const state = worklist.pop()!
    if (reachable.has(state)) continue
    reachable.add(state)

    // Find all states reachable from this state
    for (const transition of dfa.transitions) {
      if (transition.from === state && !reachable.has(transition.to)) {
        worklist.push(transition.to)
      }
    }
  }

  return reachable
}

/**
 * Filter DFA to only include reachable states
 */
function filterToReachable(dfa: DFA, reachable: Set<string>): DFA {
  return {
    states: dfa.states.filter(s => reachable.has(s.id)),
    transitions: dfa.transitions.filter(t => reachable.has(t.from) && reachable.has(t.to)),
    startState: dfa.startState,
    acceptStates: dfa.acceptStates.filter(s => reachable.has(s)),
    alphabet: dfa.alphabet
  }
}

/**
 * Build a map for quick transition lookup
 */
function buildTransitionMap(dfa: DFA): Map<string, string> {
  const map = new Map<string, string>()
  for (const t of dfa.transitions) {
    map.set(`${t.from},${t.symbol}`, t.to)
  }
  return map
}

/**
 * Get letter name for state index (A, B, C, ..., Z, AA, AB, ...)
 */
function getLetterName(index: number): string {
  if (index < 26) {
    return String.fromCharCode(65 + index)  // A-Z
  }
  // For indices >= 26, use AA, AB, etc.
  const first = Math.floor(index / 26) - 1
  const second = index % 26
  return String.fromCharCode(65 + first) + String.fromCharCode(65 + second)
}

/**
 * Rename DFA states without minimization (just clean up names)
 */
export function renameDFAStates(dfa: DFA, useLetterNames: boolean = false): MinimizationResult {
  const stateMapping = new Map<string, string>()
  const mergedStates = new Map<string, string[]>()

  // Sort states with start state first
  const sortedStates = [...dfa.states].sort((a, b) => {
    if (a.id === dfa.startState) return -1
    if (b.id === dfa.startState) return 1
    // Sort trap state last
    if (a.id === '∅') return 1
    if (b.id === '∅') return -1
    return a.id.localeCompare(b.id)
  })

  // Assign new names
  sortedStates.forEach((state, index) => {
    // Keep trap state name as ∅
    const newName = state.id === '∅'
      ? '∅'
      : (useLetterNames ? getLetterName(index) : `q${index}`)
    stateMapping.set(state.id, newName)
    mergedStates.set(newName, [state.id])
  })

  // Build renamed DFA
  const newStates: State[] = sortedStates.map(s => ({
    id: stateMapping.get(s.id)!,
    label: stateMapping.get(s.id)!
  }))

  const newTransitions: Transition[] = dfa.transitions.map(t => ({
    from: stateMapping.get(t.from)!,
    to: stateMapping.get(t.to)!,
    symbol: t.symbol
  }))

  const renamedDFA: DFA = {
    states: newStates,
    transitions: newTransitions,
    startState: stateMapping.get(dfa.startState)!,
    acceptStates: dfa.acceptStates.map(s => stateMapping.get(s)!),
    alphabet: dfa.alphabet
  }

  return {
    dfa: renamedDFA,
    stateMapping,
    mergedStates,
    description: `Renamed ${dfa.states.length} states`
  }
}
