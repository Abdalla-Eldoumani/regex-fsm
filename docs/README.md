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
npm test -- --ui  # Run tests with Vitest UI
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
- **Algorithms Module** - Thompson's construction, subset construction, minimization, avoidance, simulation
- **Patterns Module** - Template library for natural language to regex conversion (27 templates across 9 categories)

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

| Module | Tests |
|--------|-------|
| Tokenizer | 56 |
| Parser | 81 |
| Thompson | 37 |
| Subset | 42 |
| Minimize | 14 |
| Avoidance | 21 |
| Simulation | 88 |
| Templates | 45 |
| Integration | 104 |
| Visualization | 13 |
| Lambda closure | 18 |
| Automata | 56 |
| **Total** | **575** |

Test categories:
- Parser validation (consecutive quantifiers)
- Trap state verification (self-loops, transitions)
- Custom alphabet (DFA completeness)
- DFA minimization (equivalence preservation, naming options)
- Avoidance DFA (KMP correctness, acceptance/rejection)
