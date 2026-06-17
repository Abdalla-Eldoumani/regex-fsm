# regex-fsm documentation

Technical documentation for regex-fsm, a browser-based regex and finite-automata visualizer for CPSC 351 at the University of Calgary. The application runs the constructive procedures from formal language theory step by step and checks the results for correctness, in course-exact notation.

Live demo: https://regex-fsm.vercel.app

## Documentation map

- [Architecture](./architecture.md) -- layers, routes, data flow, and state management
- [Algorithms](./algorithms.md) -- algorithm implementations, complexity, and the resource bounds
- [Core module](./core/README.md) -- regex parsing, automata types, and the algorithm layer
- [Components module](./components/README.md) -- the tool views and shared UI components
- [Visualization module](./visualization/README.md) -- Cytoscape rendering and export

## Notation

The application follows course notation. The notation toggle switches a single pair of glyphs:

| Concept        | Course mode (default) | Textbook mode |
|----------------|-----------------------|---------------|
| Union          | `+`                   | `\|`          |
| Empty string   | `λ`                   | `ε`           |

Everything else is mode-invariant: `∅` for the empty language and the trap state, `Σ` for the alphabet, `A` for the accepting set, `*` for Kleene star, `+` as a postfix for positive closure, `?` for optional, and the quintuple `(Q, Σ, δ, q₀, A)`.

The `+` character is overloaded in this course: infix it is union (`a + b`), postfix it is positive closure (`a+`). The tokenizer emits a neutral token for every `+` and the parser decides meaning by grammatical position. See [core/README.md](./core/README.md) for the rule.

## Tech stack

- TypeScript in strict mode
- React 19 with react-router-dom, built by Vite
- Tailwind v4 via the `@tailwindcss/vite` plugin (CSS-first, no PostCSS config)
- Cytoscape with cytoscape-edgehandles for graph rendering
- lz-string for URL state compression
- Self-hosted variable fonts via Fontsource
- Vitest plus Testing Library and fast-check for unit, integration, and property tests
- Playwright plus @axe-core/playwright for end-to-end and accessibility tests

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build     # tsc, then vite build
npm run preview   # serve the production build
```

## Test

```bash
npm run test       # unit, integration, and property tests (Vitest, watch)
npm run test:run   # the same, single run
npm run test:e2e   # Playwright end-to-end and axe accessibility
npm run lint       # ESLint, zero warnings allowed
```

There are 1181 unit, integration, and property tests across 70 files, and over 150 end-to-end and accessibility tests across 18 Playwright spec files. The property tests check each construction against a brute-force language oracle.

## Module overview

### Core (`src/core/`)

The algorithmic heart, pure functions with no UI dependencies.

- **regex** -- tokenizer, recursive-descent parser, AST node definitions
- **automata** -- NFA, DFA, and shared type definitions
- **algorithms** -- Thompson, subset, Moore minimization, ASU direct, Brzozowski, GNFA state elimination, product, complement, equivalence with shortest counterexample, computation tree, KMP avoidance, λ-closure, simulation, and the shared resource bounds
- **cache** -- an LRU cache with localStorage persistence for algorithm results
- **patterns** -- a template library that turns natural-language descriptions into regex

### Components (`src/components/`)

React views, one per route, plus shared UI.

- **editor** -- the hand-built automaton editor (tap to add, drag to connect)
- **multiview** -- synchronized regex, NFA, DFA, and minimal DFA with click-to-correspond highlighting
- **challenges** -- construction challenges graded by language equivalence, and find-the-bug
- **simulation** -- DFA run, NFA run with a computation tree, and side-by-side NFA versus DFA
- **n2r** -- NFA to regex by GNFA state elimination
- **closure** -- union, intersection, and complement
- **pumping** -- the adversarial pumping-lemma game
- **tour** -- the guided course tour
- **command** -- the `Ctrl`/`Cmd`+`K` command palette
- **nav** -- the mobile navigation menu
- **a11y** -- the screen-reader graph summary
- **display**, **input**, **education**, **common** -- transition table, state list, regex input, pattern builder, theory panels, and shared primitives

### Notation (`src/notation/`)

The course-versus-textbook glyph toggle, shared through React context, and the regex formatter that renders an AST in either mode.

### Share (`src/share/`)

The URL share codec (compress, validate, fail closed) and the saved-automata library with storage-quota handling.

### Visualization (`src/visualization/`)

The Cytoscape renderer, the design-token bridge that keeps graph colors in sync with the DOM, and pure serializers for SVG, PNG, LaTeX/TikZ, Markdown, and CSV export, plus the screen-reader text description.

## Conventions

- Strict TypeScript, no `any`.
- Functional components and custom hooks; state lifted to the nearest common ancestor.
- Algorithms are pure and return new objects; they never mutate their inputs.
- Course notation in every label, table, and export. The empty string is `λ`; λ-closure, not ε-closure.
- Accessibility is a floor: keyboard operability, visible focus, colorblind-safe state colors with non-color cues, and a 360px responsive floor.
