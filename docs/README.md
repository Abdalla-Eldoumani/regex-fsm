# RegexFSM Documentation

Technical documentation for the RegexFSM project.

## Overview

RegexFSM is an educational web application that visualizes the relationship between regular expressions, NFAs (Nondeterministic Finite Automata), and DFAs (Deterministic Finite Automata). It implements core algorithms from formal language theory.

## Documentation Structure

- [Architecture](./architecture.md) - System architecture and design decisions
- [Algorithms](./algorithms.md) - Detailed algorithm implementations
- [Core Module](./core/README.md) - Regex parsing, automata types, and algorithms
- [Components Module](./components/README.md) - React UI components
- [Visualization Module](./visualization/README.md) - Graph rendering and export

## Tech Stack

- TypeScript (strict mode)
- React 18+
- Vite
- Cytoscape.js
- Tailwind CSS
- Vitest

## Quick Links

- [Project Setup](#project-setup)
- [Running Tests](#running-tests)
- [Build Process](#build-process)

## Project Setup

```bash
npm install
npm run dev
```

## Running Tests

```bash
npm test          # Run all tests
npm run test:ui   # Run tests with UI
```

## Build Process

```bash
npm run build     # Production build
npm run preview   # Preview production build
```

## Module Overview

### Core (`src/core/`)

The core module implements the fundamental algorithms and data structures:

- **Regex Module** - Tokenizer and parser for regular expressions
- **Automata Module** - NFA and DFA type definitions and utilities
- **Algorithms Module** - Thompson's construction, subset construction, simulation

### Components (`src/components/`)

React components organized by function:

- **Input** - RegexInput, StringInput
- **Display** - AutomatonView, TransitionTable, StateList
- **Simulation** - SimulationPanel, SimulationControls, InputTape
- **Education** - TheoryPanel, StepExplanation
- **Common** - Button, Tabs

### Visualization (`src/visualization/`)

Graph rendering using Cytoscape.js:

- **Renderer** - AutomatonGraph component
- **Styles** - Catppuccin Mocha color palette
- **Layout** - Automatic layout algorithms
- **Export** - PNG and SVG export functionality

## Development Guidelines

### Code Style

- Concise, direct code without unnecessary comments
- Comments explain WHY, not WHAT
- Variable names: short but descriptive
- Function names: verb-noun format

### TypeScript

- Strict mode enabled, no `any` types
- Prefer `interface` over `type` for object shapes
- Export types alongside implementations

### React

- Functional components only
- Custom hooks for reusable logic
- No prop drilling beyond 2 levels

## Testing

All core algorithms have comprehensive test coverage:

- Tokenizer: 56 tests
- Parser: 68 tests
- Epsilon closure: 18 tests
- Thompson's construction: 40 tests
- Subset construction: 32 tests
- Simulation: 88 tests
- Visualization: 13 tests

Total: 315 tests
