# Algorithms

Detailed explanations of core algorithms implemented in RegexFSM.

## Thompson's Construction

**File**: `src/core/algorithms/thompson.ts`

### Algorithm Overview

Thompson's construction converts a regular expression to an equivalent NFA recursively. The algorithm produces an NFA with exactly one start state (no incoming edges) and one accept state (no outgoing edges).

### Base Cases

#### Empty String (λ)

```
Input: λ
Output: q0 --λ--> q1
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
3. Connect accept(NFA1) to start(NFA2) with λ-transition
4. Result: start(NFA1) ... accept(NFA2)
```

Implementation:
```typescript
if (node.type === 'concat') {
  const left = buildNFA(node.left)
  const right = buildNFA(node.right)

  // Connect left's accept to right's start with λ
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
3. Create new start state with λ-transitions to start(NFA1) and start(NFA2)
4. Create new accept state with λ-transitions from accept(NFA1) and accept(NFA2)
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
3. Add λ-transition from new start to old start
4. Add λ-transition from old accept back to old start (loop)
5. Add λ-transition from old accept to new accept
6. Add λ-transition from new start to new accept (skip)
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

#### Lambda Closure

**File**: `src/core/algorithms/lambda.ts`

Computes all states reachable from a given set via λ-transitions only.

```typescript
function lambdaClosure(states: string[], transitions: Transition[]): string[] {
  const closure = new Set(states)
  const stack = [...states]

  while (stack.length > 0) {
    const state = stack.pop()!

    // Find all λ-transitions from this state
    const lambdaTransitions = transitions.filter(
      t => t.from === state && t.symbol === null
    )

    for (const trans of lambdaTransitions) {
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
function nfaToDFA(nfa: NFA, customAlphabet?: Set<string>): DFA {
  const alphabet = customAlphabet || nfa.alphabet
  const dfaStates: DFAState[] = []
  const dfaTransitions: Transition[] = []
  const worklist: string[][] = []
  const processed = new Set<string>()

  const TRAP_STATE = '∅'
  let trapStateNeeded = false

  // Initial DFA state is λ-closure of NFA start state
  const startSet = lambdaClosure([nfa.startState], nfa.transitions)
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
      // Compute move then λ-closure
      const nextSet = lambdaClosure(
        move(currentSet, symbol, nfa.transitions),
        nfa.transitions
      )

      if (nextSet.length === 0) {
        // No valid transition - add transition to trap state
        trapStateNeeded = true
        dfaTransitions.push({
          from: currentId,
          to: TRAP_STATE,
          symbol
        })
        continue
      }

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

  // Add trap state if needed
  if (trapStateNeeded) {
    dfaStates.push({ id: TRAP_STATE, label: 'Trap' })

    // Trap state has self-loops for all symbols
    for (const symbol of alphabet) {
      dfaTransitions.push({
        from: TRAP_STATE,
        to: TRAP_STATE,
        symbol
      })
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
    alphabet: new Set(alphabet)
  }
}
```

### DFA Completeness

The implementation ensures the resulting DFA is **complete** (has a total transition function). Key points:

- When `move(S, a)` results in an empty set, a transition to trap state `∅` is added
- The trap state has self-loops for all alphabet symbols
- Every state has exactly |Σ| outgoing transitions (one for each symbol in the alphabet)
- Ensures simulation continues until input is fully consumed, providing clear feedback on where/why rejection occurred

### Custom Alphabet Support

The `nfaToDFA` function accepts an optional `customAlphabet` parameter:

```typescript
const nfa = buildNFA(parse('ab'))
const customAlphabet = new Set(['a', 'b', 'c'])
const dfa = nfaToDFA(nfa, customAlphabet)
```

**Use Cases:**
1. **Pre-defined Alphabet**: User specifies alphabet before entering regex
2. **Test String Expansion**: Automatically includes test string symbols to ensure trap states appear for invalid symbols
3. **Complete DFA Visualization**: Shows all possible transitions, making trap states visible

**Example:**
- Regex: `ab`
- Custom alphabet: `{a, b, c}`
- Result: DFA includes transitions for 'c' leading to trap state `∅`
- Without custom alphabet: 'c' wouldn't appear in transition table

**Implementation:**
```typescript
const alphabet = customAlphabet || nfa.alphabet
```

If `customAlphabet` is provided, it's used; otherwise, the NFA's alphabet is used.
- Once in trap state, the DFA remains there for all subsequent input
- This ensures every state has exactly |Σ| outgoing transitions
- Simulation continues until all input is consumed, providing clear feedback on where/why rejection occurred

**Visual Distinction**: Trap states are displayed with dashed red borders to distinguish them from regular states.

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

  // Initial states: λ-closure of start state
  let currentStates = lambdaClosure([nfa.startState], nfa.transitions)

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

    // Compute next states: λ-closure(move(current, symbol))
    const afterMove = move(currentStates, symbol, nfa.transitions)
    const nextStates = lambdaClosure(afterMove, nfa.transitions)

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

## DFA Minimization (Moore's Algorithm)

**File**: `src/core/algorithms/minimize.ts`

### Algorithm Overview

Moore's partition refinement minimizes a DFA to the optimal number of states by merging equivalent states.

### Steps

1. Remove unreachable states from the DFA
2. Create initial partition: accepting states vs non-accepting states
3. Refine partitions: Split a partition if two states in the same partition have transitions to different partitions for the same symbol
4. Repeat until no more splits occur
5. Each partition becomes one state in the minimal DFA
6. Rename states with clean names (q0, q1... or A, B, C...)

### Properties

- **Optimality**: Produces the DFA with the fewest possible states for the given language
- **Language Preservation**: Minimized DFA accepts exactly the same language
- **State Mapping**: Tracks which original states merged into each minimized state
- **Naming Options**: User-selectable: numeric (q0, q1) or letter (A, B, C)

## ASU Direct Construction (Regex → DFA)

**File**: `src/core/algorithms/asuDirect.ts`

### Algorithm Overview

The ASU (Aho, Sethi, Ullman) direct construction builds a DFA directly from a regular expression without creating an intermediate NFA. It uses syntax tree annotation with position numbering.

### Steps

1. **Augment regex**: Convert `R` to `(R)#` where `#` is an end marker
2. **Number positions**: Assign a unique position number to each leaf (symbol) in the syntax tree
3. **Compute nullable**: For each node, determine if its language includes the empty string
4. **Compute firstpos**: For each node, the set of positions that can match the first symbol
5. **Compute lastpos**: For each node, the set of positions that can match the last symbol
6. **Compute followpos**: For each position, the set of positions that can follow it in a match
7. **Build DFA**: States are sets of positions; transitions use followpos

### Key Functions

```
nullable(n):
  - empty/λ  → true
  - symbol   → false
  - concat   → nullable(left) AND nullable(right)
  - union    → nullable(left) OR nullable(right)
  - star     → true
  - plus     → nullable(child)

firstpos(n):
  - symbol(i) → {i}
  - concat    → nullable(left) ? firstpos(left) ∪ firstpos(right) : firstpos(left)
  - union     → firstpos(left) ∪ firstpos(right)
  - star/plus → firstpos(child)

lastpos(n):
  - symbol(i) → {i}
  - concat    → nullable(right) ? lastpos(left) ∪ lastpos(right) : lastpos(right)
  - union     → lastpos(left) ∪ lastpos(right)
  - star/plus → lastpos(child)

followpos:
  - For concat(c1, c2): for each i in lastpos(c1), followpos(i) ∪= firstpos(c2)
  - For star/plus(c): for each i in lastpos(c), followpos(i) ∪= firstpos(c)
```

### Properties

- **No intermediate NFA**: Goes directly from regex to DFA
- **Efficient**: Often produces fewer states than Thompson + subset construction
- **Position-based**: States are sets of position numbers, not sets of NFA states
- **Trap state**: Added for completeness when transitions are undefined

## Brzozowski Derivative Construction (Regex → DFA)

**File**: `src/core/algorithms/brzozowski.ts`

### Algorithm Overview

Builds a DFA from a regular expression using Brzozowski derivatives. The derivative of a regex R with respect to a symbol `a` is a new regex that accepts exactly the strings `w` such that `aw` is in L(R).

### Steps

1. **Start state**: The original regex (simplified/normalized)
2. **For each state (regex) and symbol**: Compute the derivative and simplify
3. **State equivalence**: Two states are the same if their canonical string representations match
4. **Accept states**: States whose language includes the empty string (nullable regexes)
5. **Trap state**: Added as reject node for completeness

### Derivative Rules

```
Da(∅)       = ∅
Da(λ)       = ∅
Da(a)       = λ
Da(b)       = ∅  (b ≠ a)
Da(R|S)     = Da(R) | Da(S)
Da(RS)      = Da(R)·S | (if nullable(R)) Da(S)
Da(R*)      = Da(R)·R*
Da(R+)      = Da(R)·R*
```

### Simplification

Derivatives are simplified/normalized after each step to ensure state convergence:
- `∅|R = R|∅ = R`
- `∅·R = R·∅ = ∅`
- `λ·R = R·λ = R`
- Canonical string representation for equivalence checking

### Properties

- **Elegant**: Each state is a regex, each transition computes a derivative
- **No intermediate NFA**: Goes directly from regex to DFA
- **Canonical forms**: Normalization ensures finite number of distinct states
- **Theoretical significance**: Demonstrates that regular languages are closed under derivatives

## KMP-based Avoidance DFA

**File**: `src/core/algorithms/avoidance.ts`

### Algorithm Overview

Builds a DFA for "does not contain X" patterns directly using the KMP (Knuth-Morris-Pratt) failure function. This creates DFAs for patterns that are difficult to express as simple regular expressions.

### Steps

1. Create n+1 states for a pattern of length n
2. States q0...q(n-1) are accepting (partial matches only)
3. State qn is the trap/reject state (full pattern matched)
4. Use KMP failure function for transitions:
   - If pattern[i] === c: transition to qi+1
   - Else: use failure function to find fallback state

### Example

Pattern: "bba", Alphabet: {a, b}
- q0: no match started (accept)
- q1: matched "b" (accept)
- q2: matched "bb" (accept)
- q3: matched "bba" → TRAP (reject all subsequent input)

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

    while (peek()?.type in ['star', 'plus', 'optional']) {
      // Validation: Check if node is already a quantifier
      if (node.type === 'star' || node.type === 'plus' || node.type === 'optional') {
        throw new Error(
          `Invalid regex: quantifier cannot follow quantifier at position ${peek()!.pos}`
        )
      }

      if (peek()?.type === 'star') {
        consume('star')
        node = { type: 'star', child: node }
      } else if (peek()?.type === 'plus') {
        consume('plus')
        node = { type: 'plus', child: node }
      } else if (peek()?.type === 'optional') {
        consume('optional')
        node = { type: 'optional', child: node }
      }
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

### Error Handling and Validation

The parser throws descriptive errors with position information:

**Syntax Errors:**
- "Unexpected token X at position Y"
- "Expected ) but found end of input"
- "Empty parentheses at position X"

**Validation Errors:**
- "Invalid regex: quantifier cannot follow quantifier at position X"

**Consecutive Quantifier Detection:**
The parser rejects invalid patterns like `a**`, `a*+`, `a?***` by checking if the current node is already a quantifier before applying another. This prevents semantically meaningless patterns and provides clear error messages.

Examples of rejected patterns:
- `a**` → "quantifier cannot follow quantifier at position 2"
- `(a|b)*+` → "quantifier cannot follow quantifier at position 6"
- `a?***` → "quantifier cannot follow quantifier at position 2"

## DFA Minimization

**File**: `src/core/algorithms/minimize.ts`

### Algorithm Overview

Moore's partition refinement algorithm minimizes a DFA to the minimum number of states while preserving the accepted language.

### Algorithm Steps

1. **Remove unreachable states**: Find all states reachable from start state, discard the rest
2. **Initial partition**: Separate accepting states from non-accepting states
3. **Refine partitions**: For each partition, check if all states have identical transition behavior. If not, split the partition.
4. **Repeat**: Continue refining until no more splits occur
5. **Build minimal DFA**: Each final partition becomes one state

### Implementation

```typescript
function minimizeDFA(dfa: DFA, useLetterNames: boolean = false): MinimizationResult {
  // Remove unreachable states
  const reachable = findReachableStates(dfa)
  const reachableDFA = filterToReachable(dfa, reachable)

  // Initial partition: accepting vs non-accepting
  let partitions: Set<string>[] = [
    new Set(nonAcceptingStates),
    new Set(acceptingStates)
  ]

  // Refine until stable
  let changed = true
  while (changed) {
    changed = false
    const newPartitions: Set<string>[] = []

    for (const partition of partitions) {
      // Group states by transition signature
      const groups = groupByTransitionSignature(partition, partitions)

      if (groups.size > 1) changed = true
      newPartitions.push(...groups.values())
    }

    partitions = newPartitions
  }

  // Build minimal DFA from partitions
  return buildMinimalDFA(partitions, useLetterNames)
}
```

### State Naming

Two naming conventions are supported:
- `useLetterNames = false`: q0, q1, q2, ...
- `useLetterNames = true`: A, B, C, ... Z, AA, AB, ...

### Properties

- **Correctness**: Minimized DFA accepts exactly the same language
- **Optimality**: Result has minimum possible states
- **Determinism**: Output is a valid DFA

## Avoidance DFA (KMP-based)

**File**: `src/core/algorithms/avoidance.ts`

### Algorithm Overview

Builds a DFA that accepts all strings NOT containing a given substring. Uses the KMP (Knuth-Morris-Pratt) failure function for efficient construction.

### Why This Algorithm?

"Does not contain X" patterns cannot be directly expressed as simple regex for multi-character substrings. Instead, we build the DFA directly:

1. Track how many characters of the forbidden pattern have been matched
2. If full pattern is matched, enter trap/reject state
3. Use KMP failure function to handle partial match fallbacks

### Algorithm Steps

```typescript
function buildAvoidanceDFA(pattern: string, alphabet: Set<string>): AvoidanceDFAResult {
  const n = pattern.length
  const failure = computeFailureFunction(pattern)

  // States: q0, q1, ..., q(n-1) are accepting (partial matches)
  //         qn is trap/reject (full pattern matched)
  const states = Array.from({ length: n + 1 }, (_, i) => ({
    id: `q${i}`,
    label: `q${i}`
  }))

  const transitions: Transition[] = []

  for (let i = 0; i < n; i++) {
    for (const c of alphabet) {
      if (c === pattern[i]) {
        // Character matches, advance to next state
        transitions.push({ from: `q${i}`, to: `q${i + 1}`, symbol: c })
      } else {
        // Character doesn't match, use failure function
        let fallback = failure[i]
        while (fallback > 0 && pattern[fallback] !== c) {
          fallback = failure[fallback]
        }
        if (pattern[fallback] === c) fallback++
        transitions.push({ from: `q${i}`, to: `q${fallback}`, symbol: c })
      }
    }
  }

  // Trap state (qn) has self-loops for all symbols
  for (const c of alphabet) {
    transitions.push({ from: `q${n}`, to: `q${n}`, symbol: c })
  }

  return {
    dfa: {
      states,
      transitions,
      startState: 'q0',
      acceptStates: states.slice(0, n).map(s => s.id), // All except trap
      alphabet
    },
    description: `DFA accepting strings not containing "${pattern}"`
  }
}
```

### KMP Failure Function

```typescript
function computeFailureFunction(pattern: string): number[] {
  const n = pattern.length
  const failure = new Array(n).fill(0)

  let k = 0
  for (let i = 1; i < n; i++) {
    while (k > 0 && pattern[k] !== pattern[i]) {
      k = failure[k - 1]
    }
    if (pattern[k] === pattern[i]) k++
    failure[i] = k
  }

  return failure
}
```

### Example

Pattern: "bba", Alphabet: {a, b}

States:
- q0: No match (accepts)
- q1: Matched "b" (accepts)
- q2: Matched "bb" (accepts)
- q3: Matched "bba" (TRAP - rejects)

Transitions:
- q0 --a--> q0, q0 --b--> q1
- q1 --a--> q0, q1 --b--> q2
- q2 --a--> q3 (trap!), q2 --b--> q2
- q3 --a--> q3, q3 --b--> q3

Accepts: λ, a, b, aa, ab, ba, bb, aab, aba, bab, bbb, ...
Rejects: bba, abba, bbab, bbaaa, ...
