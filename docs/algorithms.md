# Algorithms

Detailed explanations of core algorithms implemented in RegexFSM.

## Thompson's Construction

**File**: `src/core/algorithms/thompson.ts`

### Algorithm Overview

Thompson's construction converts a regular expression to an equivalent NFA recursively. The algorithm produces an NFA with exactly one start state (no incoming edges) and one accept state (no outgoing edges).

### Base Cases

#### Empty String (ε)

```
Input: ε
Output: q0 --ε--> q1
        (start)  (accept)
```

Implementation:
```typescript
if (node.type === 'empty') {
  const start = createState()
  const accept = createState()
  return {
    states: [start, accept],
    transitions: [{ from: start.id, to: accept.id, symbol: null }],
    startState: start.id,
    acceptStates: [accept.id],
    alphabet: new Set()
  }
}
```

#### Single Symbol (a)

```
Input: a
Output: q0 --a--> q1
        (start)  (accept)
```

Implementation:
```typescript
if (node.type === 'symbol') {
  const start = createState()
  const accept = createState()
  return {
    states: [start, accept],
    transitions: [{ from: start.id, to: accept.id, symbol: node.value }],
    startState: start.id,
    acceptStates: [accept.id],
    alphabet: new Set([node.value])
  }
}
```

### Recursive Cases

#### Concatenation (ab)

```
Input: ab
Steps:
1. Build NFA1 for a
2. Build NFA2 for b
3. Connect accept(NFA1) to start(NFA2) with ε-transition
4. Result: start(NFA1) ... accept(NFA2)
```

Implementation:
```typescript
if (node.type === 'concat') {
  const left = buildNFA(node.left)
  const right = buildNFA(node.right)

  // Connect left's accept to right's start with ε
  const newTransitions = [
    ...left.transitions,
    ...right.transitions,
    { from: left.acceptStates[0], to: right.startState, symbol: null }
  ]

  return {
    states: [...left.states, ...right.states],
    transitions: newTransitions,
    startState: left.startState,
    acceptStates: right.acceptStates,
    alphabet: new Set([...left.alphabet, ...right.alphabet])
  }
}
```

#### Union (a|b)

```
Input: a|b
Steps:
1. Build NFA1 for a
2. Build NFA2 for b
3. Create new start state with ε-transitions to start(NFA1) and start(NFA2)
4. Create new accept state with ε-transitions from accept(NFA1) and accept(NFA2)
```

Implementation:
```typescript
if (node.type === 'union') {
  const left = buildNFA(node.left)
  const right = buildNFA(node.right)

  const start = createState()
  const accept = createState()

  const newTransitions = [
    ...left.transitions,
    ...right.transitions,
    { from: start.id, to: left.startState, symbol: null },
    { from: start.id, to: right.startState, symbol: null },
    { from: left.acceptStates[0], to: accept.id, symbol: null },
    { from: right.acceptStates[0], to: accept.id, symbol: null }
  ]

  return {
    states: [start, ...left.states, ...right.states, accept],
    transitions: newTransitions,
    startState: start.id,
    acceptStates: [accept.id],
    alphabet: new Set([...left.alphabet, ...right.alphabet])
  }
}
```

#### Kleene Star (a*)

```
Input: a*
Steps:
1. Build NFA for a
2. Create new start state (also accept)
3. Add ε-transition from new start to old start
4. Add ε-transition from old accept back to old start (loop)
5. Add ε-transition from old accept to new accept
6. Add ε-transition from new start to new accept (skip)
```

Implementation:
```typescript
if (node.type === 'star') {
  const child = buildNFA(node.child)

  const start = createState()
  const accept = createState()

  const newTransitions = [
    ...child.transitions,
    { from: start.id, to: child.startState, symbol: null },
    { from: child.acceptStates[0], to: accept.id, symbol: null },
    { from: child.acceptStates[0], to: child.startState, symbol: null },
    { from: start.id, to: accept.id, symbol: null }
  ]

  return {
    states: [start, ...child.states, accept],
    transitions: newTransitions,
    startState: start.id,
    acceptStates: [accept.id],
    alphabet: child.alphabet
  }
}
```

### Properties

- **State Count**: O(m) states for regex of length m
- **Transitions**: At most 2m transitions
- **Structure**: Exactly one start state, exactly one accept state
- **Correctness**: The produced NFA accepts exactly the language defined by the regex

## Subset Construction

**File**: `src/core/algorithms/subset.ts`

### Algorithm Overview

Subset construction (powerset construction) converts an NFA to an equivalent DFA. Each DFA state represents a set of NFA states. The algorithm simulates all possible NFA computations in parallel.

### Key Operations

#### Epsilon Closure

**File**: `src/core/algorithms/epsilon.ts`

Computes all states reachable from a given set via ε-transitions only.

```typescript
function epsilonClosure(states: string[], transitions: Transition[]): string[] {
  const closure = new Set(states)
  const stack = [...states]

  while (stack.length > 0) {
    const state = stack.pop()!

    // Find all ε-transitions from this state
    const epsilonTransitions = transitions.filter(
      t => t.from === state && t.symbol === null
    )

    for (const trans of epsilonTransitions) {
      if (!closure.has(trans.to)) {
        closure.add(trans.to)
        stack.push(trans.to)
      }
    }
  }

  return Array.from(closure).sort()
}
```

Time complexity: O(n × t) where n is state count, t is transition count.

#### Move Operation

Computes all NFA states reachable from a state set via a single input symbol.

```typescript
function move(states: string[], symbol: string, transitions: Transition[]): string[] {
  const result = new Set<string>()

  for (const state of states) {
    const symbolTransitions = transitions.filter(
      t => t.from === state && t.symbol === symbol
    )

    for (const trans of symbolTransitions) {
      result.add(trans.to)
    }
  }

  return Array.from(result).sort()
}
```

Time complexity: O(n × t) where n is state count, t is transition count.

### Main Algorithm

```typescript
function nfaToDFA(nfa: NFA): DFA {
  const alphabet = Array.from(nfa.alphabet)
  const dfaStates: DFAState[] = []
  const dfaTransitions: Transition[] = []
  const worklist: string[][] = []
  const processed = new Set<string>()

  // Initial DFA state is ε-closure of NFA start state
  const startSet = epsilonClosure([nfa.startState], nfa.transitions)
  const startStateId = setToStateId(startSet)

  worklist.push(startSet)
  dfaStates.push({ id: startStateId, label: startStateId })

  while (worklist.length > 0) {
    const currentSet = worklist.shift()!
    const currentId = setToStateId(currentSet)

    if (processed.has(currentId)) continue
    processed.add(currentId)

    // For each input symbol
    for (const symbol of alphabet) {
      // Compute move then ε-closure
      const nextSet = epsilonClosure(
        move(currentSet, symbol, nfa.transitions),
        nfa.transitions
      )

      if (nextSet.length === 0) continue

      const nextId = setToStateId(nextSet)

      // Add transition
      dfaTransitions.push({
        from: currentId,
        to: nextId,
        symbol
      })

      // Add new state to worklist if not seen
      if (!processed.has(nextId)) {
        worklist.push(nextSet)
        dfaStates.push({ id: nextId, label: nextId })
      }
    }
  }

  // DFA accept states are those containing any NFA accept state
  const acceptStates = dfaStates
    .filter(state => {
      const nfaStates = stateIdToSet(state.id)
      return nfaStates.some(s => nfa.acceptStates.includes(s))
    })
    .map(state => state.id)

  return {
    states: dfaStates,
    transitions: dfaTransitions,
    startState: startStateId,
    acceptStates,
    alphabet: nfa.alphabet
  }
}
```

### Complexity

- **Time**: O(2^n × |Σ|) worst case, where n is NFA state count, |Σ| is alphabet size
- **Space**: O(2^n) worst case for DFA state count
- **Typical**: Much better than worst case for practical regex patterns

### Optimizations

- Use state set hashing to avoid recomputation
- Skip empty state sets (no valid transitions)
- Sort state sets for consistent state naming

## Automaton Simulation

**File**: `src/core/algorithms/simulate.ts`

### NFA Simulation

Simulates NFA execution by tracking a set of possible states at each step.

```typescript
function simulateNFA(nfa: NFA, input: string): SimulationResult {
  const steps: SimulationStep[] = []

  // Initial states: ε-closure of start state
  let currentStates = epsilonClosure([nfa.startState], nfa.transitions)

  steps.push({
    position: 0,
    symbol: null,
    currentStates,
    nextStates: currentStates,
    totalLength: input.length
  })

  // Process each input symbol
  for (let i = 0; i < input.length; i++) {
    const symbol = input[i]

    // Compute next states: ε-closure(move(current, symbol))
    const afterMove = move(currentStates, symbol, nfa.transitions)
    const nextStates = epsilonClosure(afterMove, nfa.transitions)

    steps.push({
      position: i + 1,
      symbol,
      currentStates,
      nextStates,
      totalLength: input.length
    })

    currentStates = nextStates

    // Early termination if no states reachable
    if (currentStates.length === 0) break
  }

  // Accept if any final state is an accept state
  const accepted = currentStates.some(s => nfa.acceptStates.includes(s))

  return { steps, accepted }
}
```

### DFA Simulation

Simulates DFA execution by tracking a single current state.

```typescript
function simulateDFA(dfa: DFA, input: string): SimulationResult {
  const steps: SimulationStep[] = []
  let currentState = dfa.startState

  steps.push({
    position: 0,
    symbol: null,
    currentStates: [currentState],
    nextStates: [currentState],
    totalLength: input.length
  })

  // Process each input symbol
  for (let i = 0; i < input.length; i++) {
    const symbol = input[i]

    // Find transition for current state and symbol
    const transition = dfa.transitions.find(
      t => t.from === currentState && t.symbol === symbol
    )

    if (!transition) {
      // No valid transition - reject
      steps.push({
        position: i + 1,
        symbol,
        currentStates: [currentState],
        nextStates: [],
        totalLength: input.length
      })
      return { steps, accepted: false }
    }

    const nextState = transition.to

    steps.push({
      position: i + 1,
      symbol,
      currentStates: [currentState],
      nextStates: [nextState],
      totalLength: input.length
    })

    currentState = nextState
  }

  // Accept if final state is an accept state
  const accepted = dfa.acceptStates.includes(currentState)

  return { steps, accepted }
}
```

### Correctness

Both simulations correctly determine string acceptance:
- NFA simulation accepts if any computation path leads to an accept state
- DFA simulation accepts if the unique computation path leads to an accept state
- NFA and DFA simulations produce identical acceptance results for the same language

## Regex Parsing

**File**: `src/core/regex/parser.ts`

### Grammar

The parser implements a recursive descent parser for this grammar:

```
regex  → union
union  → concat ('|' concat)*
concat → repeat+
repeat → atom ('*' | '+' | '?')?
atom   → symbol | '(' regex ')'
```

### Operator Precedence

From highest to lowest:
1. Parentheses `()`
2. Repetition `*`, `+`, `?`
3. Concatenation (implicit)
4. Union `|`

### Parser Implementation

```typescript
function parseRegex(input: string): RegexNode {
  const tokens = tokenize(input)
  let position = 0

  function parseUnion(): RegexNode {
    let left = parseConcat()

    while (peek()?.type === 'union') {
      consume('union')
      const right = parseConcat()
      left = { type: 'union', left, right }
    }

    return left
  }

  function parseConcat(): RegexNode {
    const nodes: RegexNode[] = []

    while (peek() && peek()!.type !== 'union' && peek()!.type !== 'rparen') {
      nodes.push(parseRepeat())
    }

    if (nodes.length === 0) {
      return { type: 'empty' }
    }

    return nodes.reduce((acc, node) => ({
      type: 'concat',
      left: acc,
      right: node
    }))
  }

  function parseRepeat(): RegexNode {
    let node = parseAtom()

    if (peek()?.type === 'star') {
      consume('star')
      return { type: 'star', child: node }
    }

    if (peek()?.type === 'plus') {
      consume('plus')
      return { type: 'plus', child: node }
    }

    if (peek()?.type === 'optional') {
      consume('optional')
      return { type: 'optional', child: node }
    }

    return node
  }

  function parseAtom(): RegexNode {
    const token = peek()

    if (token?.type === 'symbol') {
      consume('symbol')
      return { type: 'symbol', value: token.value }
    }

    if (token?.type === 'lparen') {
      consume('lparen')
      const node = parseUnion()
      consume('rparen')
      return node
    }

    throw new Error(`Unexpected token at position ${position}`)
  }

  return parseUnion()
}
```

### Error Handling

The parser throws descriptive errors:
- "Unexpected token X at position Y"
- "Expected ) but found end of input"
- "Empty parentheses at position X"

Position information helps users identify syntax errors.
