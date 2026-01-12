# RegexFSM

Regular Expression and Finite State Machine Visualizer

## Overview

RegexFSM is an educational web application that visualizes the relationship between regular expressions, NFAs (Nondeterministic Finite Automata), and DFAs (Deterministic Finite Automata). It implements core algorithms from formal language theory including Thompson's construction, subset construction, and automaton simulation.

## Features

### Core Functionality
- **Regex to NFA**: Convert regular expressions to NFAs using Thompson's construction
- **NFA to DFA**: Convert NFAs to DFAs using subset construction with complete trap states
- **Interactive Simulation**: Step through string acceptance with visual highlighting
- **Multiple Views**: Graph, transition table, state list, and summary views
- **Export**: Download graphs as PNG or SVG

### New Features
- **Custom Alphabet Definition**: Pre-define the alphabet to see complete DFAs with all symbol transitions
- **Pattern Builder**: Interactive UI to build regex patterns from natural language descriptions
  - 10 predefined templates across 5 categories
  - Live regex preview with one-click insertion
  - Educational descriptions for each pattern
- **Individual Simulation Modals**: Test strings directly on each automaton with dedicated simulation controls
- **Auto Alphabet Expansion**: Automatically includes test string symbols in alphabet for trap state visibility

### Visual Enhancements
- **Clear Visual Indicators**: Start state arrows, double borders for accept states, dashed borders for trap states
- **Improved Scrolling**: Proper overflow handling for tables and state lists
- **Long State Name Support**: Truncation with tooltips for DFA states with long names
- **Detailed Feedback**: Explicit rejection/acceptance messages with reasons

### Validation & Testing
- **Regex Validation**: Rejects invalid patterns (consecutive quantifiers, etc.) with clear error messages
- **Comprehensive Test Suite**: 537 tests across 13 test files (all passing)

## Tech Stack

- TypeScript (strict mode)
- React 18+
- Vite
- Cytoscape.js
- Tailwind CSS (Indigo/Emerald theme)
- Vitest

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Build

```bash
npm run build
npm run preview
```

### Testing

```bash
npm test              # Run tests
```

## Usage

1. **Build or enter a regex**:
   - Use the Pattern Builder to select from predefined templates, OR
   - Type a regular expression directly in the input field (e.g., `(a|b)*abb`)
2. **Define alphabet** (optional): Specify the alphabet (e.g., `abc`) to see complete DFAs
3. **View automata**: See the generated NFA and DFA in graph, table, or list form
4. **Test strings**:
   - Enter a test string in the main input, OR
   - Click "Simulate" on any automaton to test in a modal
5. **Step through**: Use controls to step through the simulation
6. **Export**: Download graphs as PNG or SVG images

### Supported Regex Operators

- Concatenation: `ab` (a followed by b)
- Union: `a|b` (a or b)
- Kleene star: `a*` (zero or more a)
- Positive closure: `a+` (one or more a)
- Optional: `a?` (zero or one a)
- Parentheses: `(ab)*` (grouping)

### Examples

- `a*b` - Any number of a's followed by b
- `(a|b)*` - Any string over {a,b}
- `(a|b)*abb` - Any string ending in "abb"
- `a+b+` - One or more a's followed by one or more b's

## Documentation

Comprehensive technical documentation available in the `docs/` directory:

- [docs/README.md](./docs/README.md) - Documentation overview
- [docs/architecture.md](./docs/architecture.md) - System architecture
- [docs/algorithms.md](./docs/algorithms.md) - Algorithm implementations
- [docs/core/README.md](./docs/core/README.md) - Core module (regex parsing, automata)
- [docs/components/README.md](./docs/components/README.md) - React components
- [docs/visualization/README.md](./docs/visualization/README.md) - Graph rendering

## Project Structure

```
regex-fsm/
├── src/
│   ├── core/               # Core algorithms and data structures
│   │   ├── automata/       # NFA/DFA types and utilities
│   │   ├── regex/          # Tokenizer and parser
│   │   ├── algorithms/     # Thompson, subset, simulation
│   │   └── patterns/       # Pattern template library
│   ├── components/         # React UI components
│   │   ├── input/          # RegexInput, StringInput, PatternBuilder
│   │   ├── display/        # AutomatonView, tables, lists
│   │   ├── simulation/     # Simulation controls, panels, modals
│   │   ├── education/      # Theory and explanations
│   │   └── common/         # Buttons, tabs, etc.
│   ├── visualization/      # Cytoscape graph rendering
│   ├── hooks/              # Custom React hooks
│   └── utils/              # Utility functions
├── tests/                  # Test files
├── docs/                   # Technical documentation
└── public/                 # Static assets
```

## Development

### TypeScript Guidelines

- Strict mode enabled, no `any` types
- Prefer `interface` over `type` for object shapes
- Use discriminated unions for state variants
- Export types alongside implementations

### Testing

All core algorithms have comprehensive test coverage (537 tests total):

- Tokenizer: 56 tests
- Parser: 81 tests (includes 13 validation tests for consecutive quantifiers)
- Epsilon closure: 18 tests
- Thompson's construction: 37 tests
- Subset construction: 42 tests (includes 10 custom alphabet tests + trap state tests)
- Simulation: 88 tests
- Pattern templates: 42 tests (structure, categorization, regex generation)
- Visualization: 13 tests (updated for start arrow)
- Integration tests: 104 tests
- Automata tests: 56 tests

Run tests before committing: `npm test`

## Contributing

This is an educational project demonstrating formal language theory concepts. Contributions should maintain the educational focus and code quality standards.

### Commit Guidelines

- Write clear, descriptive commit messages
- One logical change per commit
- Run tests before committing
- Update documentation for user-facing changes

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Algorithm implementations based on standard textbooks in formal language theory
- Graph rendering: [Cytoscape.js](https://js.cytoscape.org/)
- UI components: [React](https://react.dev/) with [Tailwind CSS](https://tailwindcss.com/)

## Authors

- Abdalla ElDoumani
- Ibrahim Ahmed

## Educational Use

This project is designed for learning formal language theory and automata theory. It demonstrates:

- Regular expression parsing
- Thompson's construction algorithm
- Subset construction (powerset construction)
- NFA and DFA simulation
- Graph visualization techniques
- React state management
- TypeScript type safety

Ideal for computer science students studying theory of computation, compilers, or programming languages.
