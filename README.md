# RegexFSM

Regular Expression and Finite State Machine Visualizer

## Overview

RegexFSM visualizes the relationship between regular expressions, NFAs (Nondeterministic Finite Automata), and DFAs (Deterministic Finite Automata). It implements Thompson's construction, subset construction, DFA minimization, and automaton simulation.

## Features

### Core
- **Regex to NFA**: Thompson's construction algorithm
- **NFA to DFA**: Subset construction with trap states
- **Regex to DFA (Direct)**: ASU syntax tree method (followpos) and Brzozowski derivatives
- **DFA Minimization**: Moore's partition refinement algorithm for optimal state count
- **Clean State Names**: Choose between `q0, q1, q2` or `A, B, C` naming
- **Construction Method Selector**: Choose between Thompson, ASU Direct, or Brzozowski
- **Simulation**: Step-by-step string acceptance with highlighting
- **Multiple Views**: Graph, transition table, and state list
- **Export**: PNG and SVG download

### Performance
- **Input Debouncing**: 300ms debounce on regex computation (typing stays instant)
- **Algorithm Caching**: LRU cache with localStorage persistence, dirty-flag saves (5s debounce)
- **Layout Cache**: Graph positions persist across tab switches and page refreshes
- **Split Cytoscape Effects**: Instance lifecycle and event listeners separated to prevent full recreate
- **Batched Highlights**: `cy.startBatch()`/`cy.endBatch()` for grouped style changes
- **Transition Indexes**: Map-based O(1) lookups in TransitionTable and StateList
- **React Memoization**: `useMemo` for derived state, `React.memo` for display components

### Pattern Builder
- 27 templates across 9 categories (basic, position, repetition, character, combination, length, counting, negation, ordering)
- Direct DFA construction for complex patterns using KMP algorithm
- Handles "does not contain" patterns that can't be expressed as simple regex

### Visualization
- Start state: indigo with glow
- Accept state: emerald double border
- Trap state: red dashed border
- Active state: yellow highlight during simulation
- Legend showing state types

### Interactive Walkthrough
- **UI Tour**: 11-step guided tour of the application interface
- **Algorithm Walkthroughs**: 8 walkthroughs covering all core algorithms (30+ steps)
- **Spotlight Overlay**: SVG mask-based spotlight highlighting target elements
- **Smart Tooltips**: Auto-positioned with viewport boundary detection

### UI
- Custom alphabet definition for complete DFA generation
- Auto/manual build toggle
- Fullscreen simulation modal
- Expandable table and state views
- Construction method selector (Thompson / ASU Direct / Brzozowski)

## Tech Stack

- TypeScript (strict mode)
- React 18
- Vite
- Cytoscape.js
- Tailwind CSS
- Vitest (647 tests)

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

### Build

```bash
npm run build
npm run preview
```

### Test

```bash
npm test
```

## Usage

1. **Enter regex** or use Pattern Builder to select a template
2. **Set alphabet** (optional) to see complete DFA with trap states
3. **Configure DFA options**:
   - Minimize DFA (on by default) - produces optimal states
   - Use letter names - switches from q0/q1 to A/B naming
4. **Test strings** using the simulation controls or fullscreen modal
5. **Export** graphs as PNG or SVG

### Supported Operators

| Operator | Example | Meaning |
|----------|---------|---------|
| Concatenation | `ab` | a followed by b |
| Union | `a\|b` | a or b |
| Kleene star | `a*` | zero or more |
| Positive closure | `a+` | one or more |
| Optional | `a?` | zero or one |
| Grouping | `(ab)*` | group operations |

### Examples

- `a*b` - any number of a's followed by b
- `(a|b)*abb` - strings ending in "abb"
- `a+b+` - one or more a's, then one or more b's

## Project Structure

```
regex-fsm/
├── src/
│   ├── core/
│   │   ├── automata/      # NFA/DFA types
│   │   ├── regex/         # Tokenizer, parser
│   │   ├── algorithms/    # Thompson, subset, minimize, simulate, avoidance, asuDirect, brzozowski
│   │   ├── patterns/      # Pattern templates
│   │   └── cache/         # LRU cache, algorithm caching
│   ├── components/
│   │   ├── input/         # RegexInput, PatternBuilder, BuildButtons
│   │   ├── display/       # AutomatonView, tables, lists
│   │   ├── simulation/    # Controls, panels, modals
│   │   └── walkthrough/   # Interactive walkthrough system
│   ├── visualization/     # Cytoscape rendering
│   ├── hooks/             # useSimulation, useWalkthrough
│   ├── data/              # Walkthrough definitions
│   └── types/             # TypeScript types (walkthrough.ts)
├── tests/                 # 647 tests
└── docs/                  # Technical documentation
```

## Algorithms

### Thompson's Construction
Converts regex to NFA with:
- One start state, one accept state
- At most 2 outgoing edges per state
- Linear size O(m) for regex of length m

### ASU Direct Construction
Builds DFA directly from regex using syntax tree annotation:
- Position numbering and nullable/firstpos/lastpos computation
- followpos-based DFA state construction
- No intermediate NFA

### Brzozowski Derivative Construction
Builds DFA from regex using symbolic derivatives:
- Derivative operation for all regex node types
- Simplification/normalization for state equivalence
- Canonical string representation for state identity

### Subset Construction
Converts NFA to DFA:
- Computes λ-closure for state sets
- Creates trap state for undefined transitions
- Worst case 2^n states for n-state NFA

### DFA Minimization
Moore's partition refinement:
1. Initial partition: accepting vs non-accepting
2. Refine by transition behavior
3. Merge equivalent states
4. Rename to clean state names

### KMP-based Avoidance DFA
For "does not contain X" patterns:
- Uses KMP failure function
- Builds DFA directly without regex
- States track partial pattern matches

## Documentation

- [docs/README.md](./docs/README.md) - Overview
- [docs/architecture.md](./docs/architecture.md) - System design
- [docs/algorithms.md](./docs/algorithms.md) - Algorithm details
- [docs/core/README.md](./docs/core/README.md) - Core module
- [docs/components/README.md](./docs/components/README.md) - UI components
- [docs/visualization/README.md](./docs/visualization/README.md) - Graph rendering

## Test Coverage

| Module | Tests |
|--------|-------|
| Tokenizer | 56 |
| Parser | 81 |
| Thompson | 37 |
| Subset | 42 |
| Minimize | 14 |
| Avoidance | 21 |
| ASU Direct | 22 |
| Brzozowski | 22 |
| Simulation | 88 |
| Templates | 45 |
| Integration | 104 |
| Visualization | 13 |
| Lambda closure | 18 |
| Automata | 56 |
| Cache | 28 |
| **Total** | **647** |

## Authors

- Abdalla ElDoumani
- Ibrahim Ahmed

## License

MIT
