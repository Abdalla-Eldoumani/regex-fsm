# Architecture

regex-fsm is a client-side single-page application. There is no backend. Every construction, simulation, and proof runs in the browser against the pure algorithm layer.

## Layers

```
┌──────────────────────────────────────────────────────────┐
│  Routes (React + react-router-dom)                         │
│  one view per tool: editor, multi-view, challenges,        │
│  simulation, NFA→regex, closure, pumping, scratchpad       │
└───────────────┬────────────────────────────────────────────┘
                │
┌───────────────▼────────────────────────────────────────────┐
│  Shared UI and context                                       │
│  layout and header, command palette, mobile nav, guided      │
│  tour, notation toggle, error boundary, a11y graph summary   │
└───────────────┬────────────────────────────────────────────┘
                │
┌───────────────▼────────────────────────────────────────────┐
│  Visualization                                               │
│  Cytoscape renderer, design-token bridge, layout cache,      │
│  SVG / PNG / TikZ / Markdown / CSV serializers, describe()   │
└───────────────┬────────────────────────────────────────────┘
                │
┌───────────────▼────────────────────────────────────────────┐
│  Core (pure)                                                 │
│  regex parsing, Thompson, subset, minimize, ASU direct,      │
│  Brzozowski, GNFA, product, complement, equivalence,         │
│  computation tree, simulation, bounds; LRU cache; patterns   │
└──────────────────────────────────────────────────────────────┘
```

The dependency arrow points one way: views depend on visualization and core, core depends on nothing in the application.

## Routes

The router is defined in `src/main.tsx`. Each route lazy-loads its view, and all routes render inside a shared `Layout`.

| Path          | View                                  | What it does |
|---------------|---------------------------------------|--------------|
| `/`           | `components/App.tsx`                   | Regex scratchpad: type a regex, pick a construction method, see the NFA and DFA, simulate a test string |
| `/editor`     | `components/editor/EditorView.tsx`     | Build an automaton by hand on a canvas |
| `/multi`      | `components/multiview/MultiView.tsx`   | Regex, NFA, DFA, and minimal DFA synchronized by selection |
| `/n2r`        | `components/n2r/NfaToRegexView.tsx`    | NFA to regex by GNFA state elimination |
| `/closure`    | `components/closure/ClosureView.tsx`   | Union, intersection, and complement constructions |
| `/pumping`    | `components/pumping/PumpingView.tsx`   | The adversarial pumping-lemma game |
| `/challenges` | `components/challenges/ChallengesView.tsx` | Build-to-spec challenges and find-the-bug |
| `/simulate`   | `components/simulation/SimulationView.tsx` | DFA run, NFA run with a computation tree, and side-by-side |

Undefined routes render a 404. A `TourProvider` wraps the routes so the guided tour survives navigation.

## Data flow

### Regex to automaton (the `/` scratchpad)

1. The user types a regex into `RegexInput`.
2. The input is debounced (300 ms) before any computation runs.
3. `tokenize` lexes the string (`core/regex/tokenizer.ts`).
4. `parse` builds an AST by recursive descent (`core/regex/parser.ts`).
5. The chosen construction method runs:
   - **Thompson**: `buildNFA(ast)` then `nfaToDFA(nfa)` (subset construction).
   - **ASU direct**: `asuDirectToDFA(ast)` straight to a DFA, no NFA.
   - **Brzozowski**: `brzozowskiToDFA(ast)` straight to a DFA, no NFA.
6. If minimization is on, `minimizeDFA` runs Moore's refinement.
7. The NFA and DFA render as graphs, tables, and state lists.

Results flow through a cache so repeated patterns return instantly.

### Synchronized multi-view (`/multi`)

The regex is built into a Thompson NFA, a subset DFA, and a Moore-minimized DFA in one pass that also records the correspondence maps: which NFA states sit behind each DFA state, and which original states merged into each minimal state. Clicking a state in any panel highlights its correspondents in the others. Selection clears when the regex changes.

### Step constructions (`/n2r`, `/closure`)

GNFA elimination and the product and complement constructions are computed as a list of steps. The view holds a step index; advancing the index reveals the next state to eliminate, or the next discovered state pair, along with the transient automaton at that step. Auto-play advances the index on a timer and stops under reduced-motion.

### Simulation (`/simulate`)

The source is a preset or a typed (debounced) regex. A shared step index drives the animation:

- **DFA run** lights a single active state per step.
- **NFA run** lights the full λ-closed active set and renders a computation tree from `computationTree.ts`.
- **Side by side** runs the NFA and its determinized DFA from the same index, using the NFA-state-set correspondence to align them.

The input tape, the controls, and the graph all read the same index.

### Challenges (`/challenges`)

The student builds an automaton (in the editor, or as a regex) and submits it. Grading calls `equivalence(student, reference)`, which decides language equality and, on a mismatch, returns the shortest distinguishing string and which side accepts it. Grading never inspects shape. Find-the-bug loads a broken machine pre-filled for the student to repair.

## State management

Each route owns its state with React hooks; there is no global store. The `/` scratchpad, the largest case, holds the regex and its debounced copy, the alphabet, the test string, the construction method, the generated NFA and DFA, simulation results and highlight sets, and the DFA options (minimize, letter names, auto-build).

Two pieces of state are shared through React context:

- **Notation** (`src/notation/`): course versus textbook glyphs, read by every component that renders a regex.
- **Tour** (`src/components/tour/`): the guided-tour controller, mounted above the routes.

## Performance

- **Debounced input** (300 ms) keeps typing responsive; computation runs on the settled value.
- **Algorithm cache** (`src/core/cache/`): an LRU cache with localStorage persistence and hash-based keys, with dirty-flag saves so it only writes when the cache actually changed.
- **Layout cache** (`src/visualization/layoutCache.ts`): graph node positions persist across tab switches and refreshes.
- **Cytoscape**: the instance lifecycle and the event listeners live in separate effects, so callback changes rebind listeners instead of rebuilding the graph; highlight changes are wrapped in a batch.
- **Resource bounds**: a shared guard (`core/algorithms/bounds.ts`) caps construction at 256 states and a 2000 ms budget, with a parser recursion limit. Over the cap, a construction reports the input is too large instead of hanging, and the rest of the view stays usable.

## Failure handling

- **Parse errors** carry a position and render inline with a feedback color and an icon.
- **Oversized constructions** throw a typed too-large error that the view catches and turns into a notice.
- **Shared links**: the decoder fails closed. Oversized or malformed input is rejected before parsing; state is read with `JSON.parse` only; there is no code evaluation and no markup-injection path. See [components/README.md](./components/README.md) and the share module.
- **Storage quota**: a save that would exceed localStorage is refused cleanly, with the prior saves left intact.
- **Render errors** are caught by a top-level error boundary that offers reload and home.

## Accessibility posture

Accessibility is a quality floor enforced in tests, not a later phase.

- Every interactive element is keyboard-operable, has a visible focus ring, and meets a 44px touch target at the 360px floor.
- Dialogs (tour, command palette, mobile nav) trap focus while open, close on `Escape`, and restore focus to their trigger.
- Every graph has a screen-reader description (`a11y/GraphSummary.tsx`, `visualization/describe.ts`) and a navigable transition table beside the diagram.
- State colors are colorblind-safe and never the only signal: start carries an incoming arrow, accept a double ring, trap a dashed dimmed stroke, active a thicker stroke. Graph and DOM read one set of design tokens.
- Animation honors `prefers-reduced-motion`.
- Routes are checked with axe in the end-to-end suite, and there is no horizontal scroll at 360px.

## Design decisions

### Why several construction methods

Thompson plus subset is the canonical pipeline and the easiest to read, so it is the default and the basis of the multi-view. ASU direct shows the position and followpos approach with no intermediate NFA. Brzozowski derivatives show the elegant view where each state is a regex. Offering all three lets a student compare the routes from a regex to a DFA.

### Why grade by language equivalence

A construction exercise has many correct shapes. Grading by structure would reject correct work that does not match a stored answer. Deciding language equality, and returning the shortest counterexample with its direction when the languages differ, grades the only thing that matters and gives feedback a student can act on.

### Why a token bridge for the graph

Cytoscape renders to a canvas, which cannot resolve CSS custom properties. The bridge reads the design tokens from the DOM at stylesheet-build time and injects the resolved colors, so an accepting state is the same green in the graph, the table, and the legend. The single source of truth is the theme block in the app's CSS.
