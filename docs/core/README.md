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
├── algorithms/       # Core algorithms
│   ├── thompson.ts   # Thompson's construction (regex → NFA)
│   ├── asuDirect.ts  # ASU direct construction (regex → DFA via syntax tree/followpos)
│   ├── brzozowski.ts # Brzozowski derivative construction (regex → DFA via derivatives)
│   ├── subset.ts     # Subset construction (NFA → DFA)
│   ├── minimize.ts   # DFA minimization (Moore's algorithm)
│   ├── avoidance.ts  # KMP-based "does not contain" DFA
│   ├── lambda.ts     # Lambda closure computation
│   └── simulate.ts   # Automaton simulation
├── cache/            # Caching layer
│   ├── LRUCache.ts   # Generic LRU cache with configurable capacity
│   ├── keys.ts       # Deterministic cache key generation (djb2 hash)
│   ├── algorithmCache.ts  # Main cache manager with dirty-flag saves and localStorage
│   └── index.ts      # Public exports
├── cachedAlgorithms.ts  # Cached wrappers for parse/buildNFA/nfaToDFA/minimizeDFA
└── patterns/         # Pattern templates
    └── templates.ts  # 27 templates across 9 categories
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
  symbol: string | null  // Input symbol (null = lambda)
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
  alphabet: Set<string>        // Input alphabet (no lambda)
}
```

**Properties**:
- Can have multiple transitions for same symbol from a state
- Can have lambda transitions (symbol = null)
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
- No lambda transitions
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

- **Lambda**: Represented as empty string or special character (λ or ε)
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
- **Lambda transitions**: Used for union and star operations

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

## Lambda Closure

**File**: `src/core/algorithms/lambda.ts`

### Function Signature

```typescript
function lambdaClosure(states: string[], transitions: Transition[]): string[]
```

### Behavior

Computes all states reachable from a given set via lambda transitions only.

**Example**:
```typescript
const states = ['q0']
const transitions = [
  { from: 'q0', to: 'q1', symbol: null },
  { from: 'q1', to: 'q2', symbol: null }
]
const closure = lambdaClosure(states, transitions)
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

| Test File | Tests | Coverage |
|-----------|-------|----------|
| tokenizer.test.ts | 56 | Symbols, operators, escape sequences |
| parser.test.ts | 81 | Precedence, validation, error handling |
| thompson.test.ts | 37 | Base cases, operators, structure |
| subset.test.ts | 42 | Conversions, custom alphabet, trap states |
| minimize.test.ts | 14 | Equivalence, naming, unreachable removal |
| avoidance.test.ts | 21 | KMP correctness, acceptance/rejection |
| asuDirect.test.ts | 22 | Syntax tree annotation, followpos, DFA equivalence |
| brzozowski.test.ts | 22 | Derivative computation, simplification, DFA equivalence |
| lambda.test.ts | 18 | Paths, cycles, empty inputs |
| simulate.test.ts | 88 | NFA/DFA acceptance, equivalence |
| templates.test.ts | 45 | Structure, categorization, parser compat |
| cache.test.ts | 28 | LRU eviction, key generation, persistence |

Run tests with: `npm test`
