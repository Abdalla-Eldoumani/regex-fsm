# RegexFSM

Regular Expression and Finite State Machine Visualizer

## Overview

RegexFSM is an educational web application that visualizes the relationship between regular expressions, NFAs (Nondeterministic Finite Automata), and DFAs (Deterministic Finite Automata). It implements core algorithms from formal language theory including Thompson's construction, subset construction, and automaton simulation.

## Features

- **Regex to NFA**: Convert regular expressions to NFAs using Thompson's construction
- **NFA to DFA**: Convert NFAs to DFAs using subset construction
- **Interactive Simulation**: Step through string acceptance with visual highlighting
- **Multiple Views**: Graph, transition table, state list, and summary views
- **Educational Content**: Theory panels and step-by-step explanations
- **Export**: Download graphs as PNG or SVG

## Tech Stack

- TypeScript (strict mode)
- React 18+
- Vite
- Cytoscape.js
- Tailwind CSS (Catppuccin Mocha palette)
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
npm run test:ui       # Run tests with UI
npm run test:coverage # Generate coverage report
```

## Usage

1. **Enter a regex**: Type a regular expression in the input field (e.g., `(a|b)*abb`)
2. **View automata**: See the generated NFA and DFA in graph, table, or list form
3. **Test strings**: Enter a test string and select NFA or DFA simulation
4. **Step through**: Use controls to step through the simulation
5. **Export**: Download graphs as PNG or SVG images

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
│   │   └── algorithms/     # Thompson, subset, simulation
│   ├── components/         # React UI components
│   │   ├── input/          # RegexInput, StringInput
│   │   ├── display/        # AutomatonView, tables, lists
│   │   ├── simulation/     # Simulation controls and display
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

All core algorithms have comprehensive test coverage (315 tests total):

- Tokenizer: 56 tests
- Parser: 68 tests
- Epsilon closure: 18 tests
- Thompson's construction: 40 tests
- Subset construction: 32 tests
- Simulation: 88 tests
- Visualization: 13 tests

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
- Color palette: [Catppuccin](https://github.com/catppuccin/catppuccin)
- Graph rendering: [Cytoscape.js](https://js.cytoscape.org/)

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
