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
- **Algorithms Module** - Thompson's construction, subset construction (with custom alphabet support), simulation
- **Patterns Module** - Template library for natural language to regex conversion (23 templates across 9 categories)

### Components (`src/components/`)

React components organized by function:

- **Input** - RegexInput (with alphabet field), StringInput, PatternBuilder (interactive template selector with 23 templates)
- **Display** - AutomatonView (with fullscreen simulation modal and expandable views), TransitionTable (improved scrolling, expandable), StateList (improved truncation, rejection banners, expandable)
- **Simulation** - SimulationPanel (flexible NFA/DFA/Both modes), SimulationControls, SimulationModal (fullscreen with split-screen layout), InputTape
- **Education** - TheoryPanel, StepExplanation
- **Common** - Button, Tabs

### Visualization (`src/visualization/`)

Graph rendering using Cytoscape.js:

- **Renderer** - AutomatonGraph component
- **Styles** - Indigo/Emerald color palette with enhanced state indicators
- **Layout** - Automatic layout algorithms (Dagre, Cose)
- **Start Arrow** - Clear visual indicator for initial state
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
- Parser: 81 tests (includes 13 validation tests for invalid patterns)
- Lambda closure: 18 tests
- Thompson's construction: 37 tests
- Subset construction: 42 tests (includes 10 custom alphabet tests + trap state verification)
- Simulation: 88 tests
- Pattern templates: 45 tests (structure, categorization, regex generation, parser compatibility)
- Visualization: 13 tests (updated for start arrow)
- Integration tests: 104 tests
- Automata tests: 56 tests

Total: 540 tests (all passing)

### Recent Test Additions

- **Parser Validation**: Tests for consecutive quantifier detection (`a**`, `a*+`, etc.)
- **Trap State Verification**: Tests ensuring trap states have self-loops and proper transitions
- **Visualization Updates**: Tests account for start marker node and arrow in element counts
- **Custom Alphabet**: 10 comprehensive tests for custom alphabet functionality (DFA completeness, trap state generation)
- **Pattern Templates**: 45 tests covering template structure, categorization, regex generation, and parser compatibility for all 23 templates
