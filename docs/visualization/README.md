# Visualization module

`src/visualization/` renders automata as interactive graphs with Cytoscape, keeps graph colors in sync with the DOM through a design-token bridge, and serializes automata to several export formats. It also provides the screen-reader text description.

## Layout

```
src/visualization/
├── renderer.tsx              # AutomatonGraph React component (reduced-motion aware)
├── cytoscape-config.ts       # element conversion and the start-arrow marker
├── styles.ts                 # the token bridge: reads --color-* from the DOM
├── layout.ts                 # layout selection (hierarchical / force-directed)
├── layoutCache.ts            # node-position persistence (localStorage)
├── export.ts                 # PNG and SVG download; reads live tokens at click time
├── automatonToSVG.ts         # standalone SVG serializer
├── automatonToTikZ.ts        # LaTeX/TikZ serializer
├── automatonToMarkdown.ts    # Markdown transition-table serializer
├── automatonToCSV.ts         # CSV serializer with formula-injection guard
├── describe.ts               # plain-text description for screen readers
└── animation.ts              # animation helpers
```

## AutomatonGraph

`renderer.tsx` exports `AutomatonGraph`, the React wrapper around a Cytoscape instance. It takes an automaton, highlight sets for states and edges, and optional click and edit handlers, and forwards a ref to the underlying instance for export.

It uses three separate effects so the instance is not needlessly rebuilt:

1. **Instance lifecycle** -- creates and destroys the Cytoscape instance; depends on the automaton.
2. **Event listeners** -- binds tap handlers; a callback change rebinds without rebuilding the graph.
3. **Highlight updates** -- applies and clears the `active` class inside `cy.startBatch()` / `cy.endBatch()` so a step does not trigger per-class style recalculation.

The renderer reads `prefers-reduced-motion`. Highlights are static class changes, not canvas tweens, so edge traversal is a static path highlight and the active pulse (a DOM/CSS treatment) stops under reduce. A live listener re-applies the current highlight when the OS setting changes, without recreating the instance.

### Editable mode

`AutomatonGraph` accepts an optional `editable` prop (default `false`) used by the hand editor. When set, it initializes `cytoscape-edgehandles` with a generous touch target and gestures disabled, so a tap reveals a draw handle and a drag draws an edge. The extension's temporary edge is removed in the complete handler and the real edge is re-added from the editor's model, so the temporary shape never becomes the stored edge. Tapping the background adds a state; selection reports selected node and edge ids.

## Element conversion

`cytoscape-config.ts` converts an automaton to Cytoscape elements. Each state becomes a node carrying `isStart` and `isAccept` flags; the trap state `∅` is recognized by id and styled dashed and dimmed. Each transition becomes an edge whose label is the symbol, or `λ` for a λ-transition. When the automaton has states, an invisible marker node and a visible arrow edge are injected to show the start state.

## The token bridge

Cytoscape renders to a `<canvas>`, which cannot resolve CSS custom properties. So `styles.ts` is a bridge, not a color table: `getStylesheet()` reads each design token from the DOM with `getComputedStyle(document.documentElement).getPropertyValue(name)` at stylesheet-build time and injects the resolved string into the style objects. The graph and the DOM therefore read one set of tokens, and an accepting state is the same green in the graph, the transition table, and the legend. The single source of truth is the theme block in the app's CSS; each read has a per-token fallback so a too-early read never yields a black or transparent node.

Every state role carries a non-color cue, since color is never the only signal:

- **Start**: the incoming start arrow.
- **Accept**: a double ring (`border-style: double`).
- **Trap** (`∅`): a dashed stroke, dimmed.
- **Active / current**: a thicker stroke.

λ-edges are dashed. Selection uses a brand-hover halo reserved for the editor; it never implies a state role.

## Layout

`layout.ts` chooses a layout per automaton. A hierarchical left-to-right layout suits DFAs and simple NFAs; a force-directed layout handles NFAs with many λ-transitions. `layoutCache.ts` persists node positions in localStorage so a graph keeps its arrangement across tab switches and refreshes, and manual drags update the cache.

## Export

All exporters are pure string functions, independent of React and the DOM, each escaping for its target syntax. `export.ts` reads the live design tokens at click time (after the app CSS has loaded) and handles the file download.

| Format       | File                     | Output                                                                 | Injection guard |
|--------------|--------------------------|------------------------------------------------------------------------|-----------------|
| SVG          | `automatonToSVG.ts`      | A standalone `<svg>`: nodes as circles, accepting states double-ringed, edges as curves, the trap dashed and dimmed | XML escaping on all ids, labels, and symbols |
| PNG          | `export.ts`              | A 2x raster of the live graph with the token background                | n/a (raster) |
| LaTeX / TikZ | `automatonToTikZ.ts`     | A compilable `tikzpicture` using `\usetikzlibrary{automata}`; `λ` as `$\lambda$`, the trap as `$\emptyset$` | TeX escaping on ids and symbols |
| Markdown     | `automatonToMarkdown.ts` | A GitHub pipe table mirroring the on-screen transition table, with a λ column for NFAs and set notation for multi-target cells | pipe and newline escaping in cells |
| CSV          | `automatonToCSV.ts`      | RFC 4180 CSV of the transition table                                   | a leading `=`, `+`, `-`, or `@` is prefixed so a spreadsheet cannot run it as a formula, then standard quoting |

There is no HTML or SVG injection path: every interpolated value is escaped for its format, and the text description uses only course-notation symbols.

## Screen-reader description

`describe.ts` produces a plain-text description of an automaton: the quintuple `(Q, Σ, δ, q₀, A)`, the alphabet, the state roster, the start state, the accepting set, and the transitions, with notes for the sink state. It is the prose companion to the on-screen transition table, which is the navigable, table-form view of the same `δ`. Together they make every diagram reachable without the canvas.
