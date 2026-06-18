# Components module

`src/components/` holds the React views, one per route, plus the shared chrome and UI primitives. This page describes what each view does; for routing and data flow see [../architecture.md](../architecture.md).

## Layout

```
src/components/
├── App.tsx               # the "/" regex scratchpad
├── layout/               # Layout, header, route chrome
├── ErrorBoundary.tsx     # top-level render-error fallback
├── editor/               # /editor   hand-built automaton editor
├── multiview/            # /multi    synchronized regex / NFA / DFA / min-DFA
├── challenges/           # /challenges  build-to-spec and find-the-bug
├── simulation/           # /simulate  DFA, NFA, and side-by-side runs
├── n2r/                  # /n2r      NFA → regex (GNFA elimination)
├── closure/              # /closure  union / intersection / complement
├── pumping/              # /pumping  the pumping-lemma game
├── tour/                 # the guided course tour
├── command/              # the Ctrl/Cmd+K command palette
├── nav/                  # the mobile navigation menu
├── a11y/                 # GraphSummary, the screen-reader graph description
├── display/              # AutomatonView, TransitionTable, StateList
├── input/                # RegexInput, StringInput, PatternBuilder
├── education/            # TheoryPanel, StepExplanation
└── common/               # Tabs, TooLargeNotice
```

## The tool views

### Scratchpad (`App.tsx`, `/`)

Type a regex with live validation and an auto-detected or user-defined alphabet, pick a construction method (Thompson, ASU direct, or Brzozowski), and see the NFA and DFA as a graph, a transition table, and a state list. DFA options toggle Moore minimization (on by default) and letter naming (`q0` to `A`). A test string drives a simulation in NFA, DFA, or both modes. Input is debounced 300 ms before computation. Current state can be shared as a link or saved to the library.

### Hand editor (`editor/`, `/editor`)

Build an automaton directly. Tap the canvas to add a state; drag from a state to draw a transition; use the side panel to name states, mark start and accepting states, and edit or delete transitions and states. A live badge reports DFA, nondeterministic NFA, or NFA with λ-moves. A non-blocking advisory flags missing `(state, symbol)` pairs when the structure is a partial DFA. The editor is keyboard-operable.

### Multi-view (`multiview/`, `/multi`)

The regex, its Thompson NFA, the subset DFA, and the Moore-minimized DFA shown together. Clicking a state in any panel highlights its correspondents in the others, using the NFA-state-set and merged-state maps recorded during construction. On desktop the four panels sit in a row; on tablet, a two-by-two grid; below `md`, a single tabbed panel so only one graph renders. Selection clears when the regex changes.

### Challenges (`challenges/`, `/challenges`)

Pick an exercise, build an automaton to match the target language, and check it. Grading is by language equivalence only -- a correct answer of any shape passes. A wrong answer returns the shortest distinguishing string and whether the machine wrongly accepts or wrongly rejects it; an empty counterexample renders as `λ`. A find-the-bug mode loads a broken machine to repair. The build surface resets when the exercise changes, and an over-cap construction shows a too-large notice.

### Simulation (`simulation/`, `/simulate`)

Three modes over a preset or a typed (debounced) regex:

- **DFA run**: one active state lights up per step.
- **NFA run**: the full λ-closed active set lights up, with a computation tree of the parallel branches.
- **Side by side**: the NFA and its determinized DFA step together from one control, aligned by state-set correspondence.

Each mode has an animated input tape with a position marker and a verdict badge, step-forward and step-back, play and pause, and a speed slider. Auto-play is disabled under reduced-motion. The computation tree degrades to a notice on fan-out blow-up while the graph and tape stay usable.

### NFA to regex (`n2r/`, `/n2r`)

GNFA state elimination. Step through the algorithm: at each step one state is highlighted and removed, and the surviving edges show regex labels rather than single symbols. The new start and accept states are labeled `S` and `A`. The result panel shows the final regex in course notation. A source NFA over the state cap shows a notice before elimination begins.

### Closure (`closure/`, `/closure`)

Union, intersection, and complement. Union and intersection take two source DFAs and build the product step by step as state pairs are discovered; complement takes one source, completes it, and flips the accepting set. Sources are presets or typed regexes. The transient automaton shows only what has been discovered at the current step, and a legend states the accepting condition for the current operation.

### Pumping-lemma game (`pumping/`, `/pumping`)

An adversarial proof of non-regularity. The tool fixes the pumping length, the user chooses a witness word in the language with `|w| ≥ p`, the tool picks the worst-case split `w = xyz` with `|xy| ≤ p` and `|y| ≥ 1`, and the user chooses a pump exponent `i ≠ 1`. The tool computes `xy^i z` and checks membership; a string outside the language closes the contradiction. A demo mode plays a full round automatically. Stage cards highlight the active step, and stepping respects reduced-motion.

## Shared chrome

### Layout and header (`layout/`)

A sticky header with the home link, the notation toggle, the command-palette trigger, the tour launcher, and a source link. Below `md` the link row collapses into the mobile menu while the tour launcher stays reachable. The layout scrolls to top on route change and renders routes through an `<Outlet />`.

### Command palette (`command/`)

Opened with `Ctrl`/`Cmd`+`K` or a header button. A filter input matches a label and keywords; arrow keys move the cursor with wrap, `Enter` runs the highlighted command, `Escape` closes. It lists every route plus global actions (toggle notation, open the tour). The active row is marked with a tint and a left bar, never color alone.

### Mobile navigation (`nav/`)

Below `md`, a menu button toggles a panel listing every route as a link with `aria-current` on the active one. It closes on an outside click or `Escape` and restores focus to its trigger.

### Guided tour (`tour/`)

A bottom-sheet dialog on mobile, a centered card on larger screens. Lessons run in course order; each pairs a plain-language explanation with the formal notation and may offer an "open this view" button that navigates to the matching tool. Back, next, finish, a counter, and a progress bar. Focus moves into the dialog on open, `Escape` closes, and focus restores to the launcher.

### Error boundary (`ErrorBoundary.tsx`)

Catches render errors and shows a fallback with reload and home actions.

## Display and input

- **AutomatonView** (`display/`) wraps the graph with tabs for the graph, the transition table, and the state list, plus export controls. The graph stays mounted across tab switches so its layout is not recomputed.
- **TransitionTable** renders `δ` with `→` for the start, `✓` for accepting, and `∅` for the trap. It is the navigable, screen-reader-friendly form of the diagram. Lookups are Map-indexed.
- **StateList** lists states with roles and shows accept and reject banners after a simulation, each with an icon and text.
- **RegexInput** validates as you type and exposes the optional alphabet field. **PatternBuilder** turns a template into a regex. **StringInput** takes the test string.

## Styling and accessibility

Components use Tailwind v4 utilities driven by design tokens defined in the app's CSS. Backgrounds are a cool indigo-slate; the brand iris-indigo is for UI chrome only. State colors are reserved for automaton roles and are colorblind-safe, each paired with a non-color cue: start has an incoming arrow, accept a double ring, trap a dashed dimmed stroke, active a thicker stroke. The graph canvas and the DOM read the same tokens, so a role is the same color everywhere.

The accessibility floor is enforced, not aspirational. Every interactive element is keyboard-operable, carries a visible focus ring, and meets a 44px touch target at the 360px floor. Dialogs trap focus while open, close on `Escape`, and restore focus on close. Every graph has a screen-reader description via `a11y/GraphSummary.tsx` and `visualization/describe.ts`, alongside the navigable transition table. There is no horizontal scroll at 360px, and routes are checked with axe in the end-to-end suite.
