# regex-fsm

A browser-based regex and finite-automata visualizer that runs the constructive procedures from formal language theory step by step, in course-exact notation, and checks them for correctness.

**Live demo: https://regex-fsm.vercel.app**

## What it is

regex-fsm is a learning instrument for CPSC 351 (Theoretical Foundations of Computer Science II) at the University of Calgary. The mathematical content is the product. Each construction the course teaches runs as a sequence of visible steps and produces a result you can check against the definitions, not a black-box answer.

It is client-side only. There is no backend, no account, and nothing to install -- open the page and start building automata.

Notation follows the course exactly:

- `+` for union, with a one-click toggle to the textbook `|`
- `λ` for the empty string
- `∅` for the empty language and the trap state
- `Σ` for the alphabet
- the quintuple `(Q, Σ, δ, q₀, A)`, with `A` for the accepting set

A worked example reads `(a + b)*abb` for "every string over {a, b} that ends in abb", and `a*b` for "zero or more a's followed by a single b". Flip notation mode and the same expression renders as `(a | b)*abb`.

## Features

### Constructions

Every construction is animated and steppable, and every result is the real output of the algorithm, not a precomputed picture.

- **Regex to NFA** via Thompson's construction. One start state, one accept state, λ-moves for union and closure.
- **NFA to DFA** via the subset construction, with λ-closure shown explicitly and a trap state `∅` added so the DFA is total.
- **DFA minimization** via Moore's partition refinement. Unreachable states are dropped, equivalent states merge, and the result is renamed to clean state names.
- **Regex to DFA directly**, two ways: the Aho-Sethi-Ullman syntax-tree method (nullable, firstpos, lastpos, followpos) with no intermediate NFA, and Brzozowski derivatives, where each DFA state is itself a regex.
- **NFA to regex** via GNFA state elimination. Watch one state disappear at a time while the surviving edges pick up regex labels, until only a start and accept state remain.
- **Closure constructions**: union and intersection by the product construction over two source DFAs, and complement by completing a DFA and flipping its accepting set.

### Hand editor

Build an automaton directly on a canvas. Tap to add a state, drag from a state to draw a transition, and use the side panel to name states, mark start and accepting states, and edit or delete transitions. A live badge reports whether the machine is a DFA, a nondeterministic NFA, or an NFA with λ-moves, and a non-blocking advisory flags missing `(state, symbol)` pairs if you are aiming for a complete DFA. The whole editor is keyboard-operable.

### Synchronized multi-view

See the regex, its Thompson NFA, the determinized DFA, and the minimized DFA at once. Click any state in any panel and its correspondents light up everywhere -- the NFA state set behind a DFA state, the original states behind a merged minimal state. On a phone the four panels collapse to a single tabbed view so only one graph renders at a time.

### Construction challenges

Build an automaton to match a target language, then check it. Submissions are graded by **language equivalence**, never by structure: there is no single "right" shape, only the right language. A wrong answer returns the **shortest distinguishing string** and the direction of the error -- whether your machine wrongly accepts that string or wrongly rejects it. A separate find-the-bug mode hands you a broken machine to repair.

### Simulation

- **DFA run**: a single active state lights up as the input tape is consumed symbol by symbol, with the verdict on the final frame.
- **NFA run**: the full λ-closed set of active states lights up at once, and a computation tree shows the genuine parallel branches the NFA explores.
- **Side by side**: the NFA and its determinized DFA step in lockstep from one shared control, so you can watch a set of NFA states correspond to one DFA state.

Every mode has an animated input tape, step-forward and step-back controls, play and pause, and a speed slider. Auto-play respects reduced-motion.

### Guided tour

A mobile-first guided tour walks through the concepts in course order. Each lesson pairs a plain-language explanation with the formal notation, and a lesson can open the matching tool view so you can try the construction immediately.

### Pumping-lemma game

An adversarial game for proving a language is not regular. You play the prover; the tool plays the adversary. It fixes the pumping length, you choose a witness word, it picks the worst-case split `w = xyz`, you choose a pump exponent, and the tool checks whether the pumped string escapes the language. A demo mode plays a full round automatically.

### Sharing and export

- **Shareable URL state**: the current automaton compresses into a link that restores exactly. The decoder **fails closed** -- oversized or malformed input is rejected before anything is parsed. State is read with `JSON.parse` only; there is no code evaluation and no HTML or SVG injection path.
- **Saved library**: name and store automata in the browser. When storage is full the save is refused cleanly with a message to free space, and your existing saves are never overwritten.
- **Export** to SVG, PNG, LaTeX/TikZ, Markdown, and CSV. Each text exporter escapes for its target syntax: XML escaping for SVG, TeX escaping for TikZ, cell escaping for Markdown, and a spreadsheet formula-injection guard for CSV.

### Accessibility and mobile

Accessibility is a quality floor, not a later phase.

- Every feature is keyboard-operable, with a visible focus ring and no focus traps.
- Every graph carries a screen-reader description, and the transition function is available as a navigable table alongside the diagram.
- A `Ctrl`/`Cmd`+`K` command palette jumps to any view or runs a global action.
- A mobile navigation menu reaches every route below the `md` breakpoint.
- Routes are axe-clean, state colors are colorblind-safe and always paired with a non-color cue (an arrow, a double ring, a dashed stroke), and there is no horizontal scroll down to a 360px floor.

## Tech stack

- **TypeScript** in strict mode
- **React 19** with **react-router-dom**, built by **Vite**
- **Tailwind v4** via the `@tailwindcss/vite` plugin, CSS-first with no PostCSS config
- **Cytoscape** (with `cytoscape-edgehandles`) for graph rendering
- **lz-string** for URL state compression
- Self-hosted variable fonts via Fontsource

Testing:

- **Vitest** with **Testing Library** for unit and integration, and **fast-check** for property tests. The property suites check each construction against a brute-force language oracle -- the algorithm and a reference enumeration must agree on every string up to a bound.
- **Playwright** with **@axe-core/playwright** for end-to-end behavior and accessibility.

There are **1181 unit, integration, and property tests** across 70 files, and over 150 end-to-end and accessibility tests across 18 Playwright spec files.

## Quick start

```bash
npm install
npm run dev
```

Then open the printed local URL.

### Build

```bash
npm run build      # tsc, then vite build
npm run preview    # serve the production build
```

### Test

```bash
npm run test       # unit, integration, and property tests (Vitest)
npm run test:run   # the same, single run, no watch
npm run test:e2e   # Playwright end-to-end and axe accessibility
npm run lint       # ESLint, zero warnings allowed
```

## Project structure

```
regex-fsm/
├── src/
│   ├── core/
│   │   ├── regex/             # tokenizer, recursive-descent parser, AST
│   │   ├── automata/          # NFA, DFA, and shared types
│   │   ├── algorithms/        # thompson, subset, minimize, asuDirect,
│   │   │                      #   brzozowski, gnfa, product, complement,
│   │   │                      #   equivalence, computationTree, avoidance,
│   │   │                      #   lambda, simulate, bounds
│   │   ├── cache/             # LRU cache with localStorage persistence
│   │   └── patterns/          # pattern template library
│   ├── components/
│   │   ├── editor/            # hand-built automaton editor
│   │   ├── multiview/         # synchronized regex / NFA / DFA / min-DFA
│   │   ├── challenges/        # construction challenges and find-the-bug
│   │   ├── simulation/        # DFA, NFA, and side-by-side simulation
│   │   ├── n2r/               # NFA to regex (GNFA state elimination)
│   │   ├── closure/           # union, intersection, complement
│   │   ├── pumping/           # pumping-lemma game
│   │   ├── tour/              # guided course tour
│   │   ├── command/           # command palette
│   │   ├── nav/               # mobile navigation
│   │   ├── a11y/              # screen-reader graph summary
│   │   ├── display/           # transition table, state list, automaton view
│   │   └── input/             # regex input, pattern builder
│   ├── notation/             # course / textbook notation toggle
│   ├── share/                # URL share codec and saved library
│   ├── visualization/        # Cytoscape renderer and SVG/PNG/TikZ/MD/CSV export
│   ├── editor/               # editor reducer and model
│   └── hooks/                # shared React hooks
├── e2e/                      # Playwright and axe specs
└── docs/                     # technical documentation
```

## Algorithms

The algorithm layer is pure: no UI, no DOM, fully unit-tested.

- **Thompson's construction** (`core/algorithms/thompson.ts`): regex AST to NFA, linear in regex length, one start and one accept state.
- **Subset construction** (`subset.ts`): NFA to DFA by λ-closure and move, with a trap state for completeness. Tracks which NFA-state set each DFA state represents.
- **Moore minimization** (`minimize.ts`): partition refinement to the minimal DFA, with a map from original states to merged states.
- **ASU direct** (`asuDirect.ts`): regex to DFA through syntax-tree annotation -- nullable, firstpos, lastpos, followpos -- without building an NFA.
- **Brzozowski derivatives** (`brzozowski.ts`): regex to DFA where each state is a normalized regex and each transition is a derivative.
- **GNFA state elimination** (`gnfa.ts`): NFA to regex by eliminating states one at a time and combining the regex labels on the affected edges.
- **Product construction** (`product.ts`) and **complement** (`complement.ts`): the closure constructions for union, intersection, and complement.
- **Language equivalence** (`equivalence.ts`): decides whether two DFAs accept the same language and, if not, returns the shortest counterexample. It completes both machines, then does a breadth-first walk over the product from the start pair; the first reachable pair where exactly one side accepts spells a minimal-length witness. Argument order fixes the direction of the report.
- **Computation tree** (`computationTree.ts`): the parallel configurations an NFA passes through on a given input, level by level, with equal configurations collapsed to one node.

Heavy constructions are bounded so the UI never hangs: a shared guard caps work at 256 states and a 2000 ms budget, and a recursion limit protects the parser. Over the cap, a construction reports that the input is too large rather than locking up; the rest of the view stays usable.

## Documentation

Technical documentation lives in [docs/](./docs/):

- [docs/README.md](./docs/README.md) -- overview and module map
- [docs/architecture.md](./docs/architecture.md) -- layers, routes, and data flow
- [docs/algorithms.md](./docs/algorithms.md) -- algorithm details and complexity
- [docs/core/README.md](./docs/core/README.md) -- regex parsing, automata types, algorithms
- [docs/components/README.md](./docs/components/README.md) -- the tool views and UI components
- [docs/visualization/README.md](./docs/visualization/README.md) -- graph rendering and export

## Companion tool

regex-fsm has a sibling: the **AArch64 Playground** (https://aarch64-playground.vercel.app), a browser-based environment for writing and running AArch64 assembly. Both are carefully built teaching tools for hard university CS topics, made by the same author, with the same standard of correctness and craft.

## Authors

- Abdalla ElDoumani
- Ibrahim Ahmed

## License

MIT
