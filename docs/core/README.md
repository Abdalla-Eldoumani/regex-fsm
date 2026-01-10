# Core Module Documentation

The core module implements fundamental algorithms and data structures from formal language theory.

## Module Structure

```
src/core/
├── automata/          # Automaton type definitions and utilities
│   ├── types.ts      # State, Transition, NFA, DFA interfaces
│   ├── nfa.ts        # NFA utility functions
│   └── dfa.ts        # DFA utility functions
├── regex/            # Regular expression parsing
│   ├── ast.ts        # AST node type definitions
│   ├── tokenizer.ts  # Lexical analysis
│   └── parser.ts     # Syntax analysis
└── algorithms/       # Core algorithms
    ├── thompson.ts   # Thompson's construction (regex → NFA)
    ├── subset.ts     # Subset construction (NFA → DFA)
    ├── epsilon.ts    # Epsilon closure computation
    └── simulate.ts   # Automaton simulation
```

## Automata Types

### State

Represents a single state in an automaton.

```typescript
interface State {
  id: string        // Unique identifier (e.g., "q0", "q1")
  label?: string    // Optional display label
}
```

### Transition

Represents a transition between states.

```typescript
interface Transition {
  from: string      // Source state ID
  to: string        // Target state ID
  symbol: string | null  // Input symbol (null = epsilon)
}
```

### NFA

Nondeterministic Finite Automaton.

```typescript
interface NFA {
  states: State[]              // All states
  transitions: Transition[]    // All transitions
  startState: string           // Start state ID
  acceptStates: string[]       // Accept state IDs
  alphabet: Set<string>        // Input alphabet (no epsilon)
}
```

**Properties**:
- Can have multiple transitions for same symbol from a state
- Can have epsilon transitions (symbol = null)
- Multiple states may be active simultaneously

### DFA

Deterministic Finite Automaton.

```typescript
interface DFA {
  states: State[]              // All states
  transitions: Transition[]    // All transitions
  startState: string           // Start state ID
  acceptStates: string[]       // Accept state IDs
  alphabet: Set<string>        // Input alphabet
}
```

**Properties**:
- Exactly one transition per symbol from each state
- No epsilon transitions
- Exactly one state active at any time

## Regex AST Types

### Token

Result of tokenization.

```typescript
interface Token {
  type: TokenType   // Token category
  value: string     // Token value
  position: number  // Position in input string
}

type TokenType =
  | 'symbol'       // a, b, c, etc.
  | 'star'         // *
  | 'plus'         // +
  | 'union'        // |
  | 'optional'     // ?
  | 'lparen'       // (
  | 'rparen'       // )
```

### RegexNode

AST node types.

```typescript
type RegexNode =
  | { type: 'empty' }
  | { type: 'symbol', value: string }
  | { type: 'concat', left: RegexNode, right: RegexNode }
  | { type: 'union', left: RegexNode, right: RegexNode }
  | { type: 'star', child: RegexNode }
  | { type: 'plus', child: RegexNode }
  | { type: 'optional', child: RegexNode }
```

**Discriminated Union**: The `type` field determines which other fields are present.

## Tokenizer

**File**: `src/core/regex/tokenizer.ts`

### Function Signature

```typescript
function tokenize(input: string): Token[]
```

### Behavior

Converts a regex string into a sequence of tokens.

**Example**:
```typescript
tokenize('(a|b)*c')
// Returns:
[
  { type: 'lparen', value: '(', position: 0 },
  { type: 'symbol', value: 'a', position: 1 },
  { type: 'union', value: '|', position: 2 },
  { type: 'symbol', value: 'b', position: 3 },
  { type: 'rparen', value: ')', position: 4 },
  { type: 'star', value: '*', position: 5 },
  { type: 'symbol', value: 'c', position: 6 }
]
```

### Special Cases

- **Epsilon**: Represented as empty string or special character
- **Escape sequences**: `\*`, `\|`, `\(`, `\)` become literal symbols
- **Whitespace**: Treated as symbols (no special meaning)

### Error Cases

Throws error for invalid characters at lexical level.

## Parser

**File**: `src/core/regex/parser.ts`

### Function Signature

```typescript
function parse(input: string): RegexNode
```

### Behavior

Parses a regex string into an Abstract Syntax Tree.

**Example**:
```typescript
parse('ab|c')
// Returns:
{
  type: 'union',
  left: {
    type: 'concat',
    left: { type: 'symbol', value: 'a' },
    right: { type: 'symbol', value: 'b' }
  },
  right: { type: 'symbol', value: 'c' }
}
```

### Grammar Rules

1. **Union** has lowest precedence: `a|b` groups as `(a)|(b)`
2. **Concat** has medium precedence: `ab*` groups as `a(b*)`
3. **Star/Plus/Optional** have highest precedence (postfix operators)
4. **Parentheses** override precedence

### Error Cases

- Unmatched parentheses
- Empty parentheses
- Operators in invalid positions
- Unexpected end of input

## Thompson's Construction

**File**: `src/core/algorithms/thompson.ts`

### Function Signature

```typescript
function buildNFA(ast: RegexNode): NFA
```

### Behavior

Converts a regex AST to an equivalent NFA using Thompson's construction.

**Example**:
```typescript
const ast = parse('a*b')
const nfa = buildNFA(ast)
// Returns NFA with states and transitions for (a*b)
```

### Algorithm Properties

- **Linear size**: O(m) states for regex length m
- **Structural**: One start state, one accept state
- **Epsilon transitions**: Used for union and star operations

See [algorithms.md](../algorithms.md#thompsons-construction) for detailed algorithm description.

## Subset Construction

**File**: `src/core/algorithms/subset.ts`

### Function Signature

```typescript
function nfaToDFA(nfa: NFA): DFA
```

### Behavior

Converts an NFA to an equivalent DFA using subset construction.

**Example**:
```typescript
const nfa = buildNFA(parse('a|b'))
const dfa = nfaToDFA(nfa)
// Returns DFA with powerset states
```

### State Naming

DFA states are named by the set of NFA states they represent:
- `{q0}` - Contains only NFA state q0
- `{q0,q1}` - Contains NFA states q0 and q1
- State IDs are sorted for consistency

### Algorithm Properties

- **Exponential worst case**: O(2^n) DFA states for n NFA states
- **Typical case**: Much fewer states in practice
- **Correctness**: DFA accepts same language as NFA

See [algorithms.md](../algorithms.md#subset-construction) for detailed algorithm description.

## Epsilon Closure

**File**: `src/core/algorithms/epsilon.ts`

### Function Signature

```typescript
function epsilonClosure(states: string[], transitions: Transition[]): string[]
```

### Behavior

Computes all states reachable from a given set via epsilon transitions only.

**Example**:
```typescript
const states = ['q0']
const transitions = [
  { from: 'q0', to: 'q1', symbol: null },
  { from: 'q1', to: 'q2', symbol: null }
]
const closure = epsilonClosure(states, transitions)
// Returns ['q0', 'q1', 'q2']
```

### Algorithm

Uses depth-first search with visited set to handle cycles.

**Time Complexity**: O(n × t) where n is state count, t is transition count.

## Simulation

**File**: `src/core/algorithms/simulate.ts`

### Types

```typescript
interface SimulationStep {
  position: number           // Current position in input
  symbol: string | null      // Symbol being processed
  currentStates: string[]    // States before this step
  nextStates: string[]       // States after this step
  totalLength: number        // Total input length
}

interface SimulationResult {
  steps: SimulationStep[]    // All simulation steps
  accepted: boolean          // Whether input was accepted
}
```

### NFA Simulation

```typescript
function simulateNFA(nfa: NFA, input: string): SimulationResult
```

Simulates NFA execution by tracking set of possible states.

**Example**:
```typescript
const nfa = buildNFA(parse('a*b'))
const result = simulateNFA(nfa, 'aab')
// result.accepted = true
// result.steps = [...] (step-by-step trace)
```

### DFA Simulation

```typescript
function simulateDFA(dfa: DFA, input: string): SimulationResult
```

Simulates DFA execution by tracking single current state.

**Example**:
```typescript
const dfa = nfaToDFA(buildNFA(parse('a*b')))
const result = simulateDFA(dfa, 'aab')
// result.accepted = true
// result.steps = [...] (step-by-step trace)
```

### Properties

- **Correctness**: NFA and DFA simulations produce same acceptance result
- **Step tracing**: All intermediate states captured for visualization
- **Early termination**: NFA simulation stops if no states reachable

## Utility Functions

### State Creation

```typescript
let stateCounter = 0

function createState(label?: string): State {
  const id = `q${stateCounter++}`
  return { id, label }
}

function resetStateCounter(): void {
  stateCounter = 0
}
```

Creates unique state IDs. Reset counter between automaton constructions.

### State Set Operations

```typescript
function setToStateId(states: string[]): string {
  return `{${states.sort().join(',')}}`
}

function stateIdToSet(id: string): string[] {
  return id.slice(1, -1).split(',').filter(s => s.length > 0)
}
```

Converts between state sets and DFA state IDs.

### Move Operation

```typescript
function move(
  states: string[],
  symbol: string,
  transitions: Transition[]
): string[] {
  const result = new Set<string>()

  for (const state of states) {
    transitions
      .filter(t => t.from === state && t.symbol === symbol)
      .forEach(t => result.add(t.to))
  }

  return Array.from(result).sort()
}
```

Computes states reachable from a set via a single symbol.

## Testing

All core modules have comprehensive test coverage:

- **tokenizer.test.ts**: 56 tests
  - Single symbols, operators, escape sequences
  - Error cases, edge cases

- **parser.test.ts**: 68 tests
  - Operator precedence, parentheses
  - Complex nested expressions
  - Error handling

- **epsilon.test.ts**: 18 tests
  - Simple paths, cycles, multiple paths
  - Empty inputs, disconnected graphs

- **thompson.test.ts**: 40 tests
  - Base cases, all operators
  - Complex expressions, structural properties

- **subset.test.ts**: 32 tests
  - Simple conversions, epsilon handling
  - State count verification, accept states

- **simulate.test.ts**: 88 tests
  - NFA acceptance/rejection
  - DFA acceptance/rejection
  - NFA/DFA equivalence

Run tests with: `npm test`
