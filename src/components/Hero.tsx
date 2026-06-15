/**
 * The live-automaton signature motif (DESIGN-04/DESIGN-05).
 *
 * A correct three-state DFA over Sigma = {a, b} that recognizes the language of
 * strings containing "ab" as a substring, drawn as inline SVG and animated with
 * the hero-* keyframes in index.css. The active marking walks q0 -> q1 -> q2 on a
 * loop while a head advances along a JetBrains-Mono tape consuming the demo string
 * "aab" (q0 --a--> q1 --a--> q1 --b--> q2, accept). The active treatment is the
 * SAME language used for an active simulation state: --color-state-active fill,
 * the breathe pulse, and a thicker stroke, so a learner meets one "this is
 * happening now" cue everywhere.
 *
 * The DFA is complete and deterministic (exactly one transition per state and
 * symbol) with a single start state and one accept state, so even as decoration
 * it never displays a wrong automaton (the automata-correctness contract).
 *
 * It is purely decorative this phase: the wrapper is aria-hidden and contains no
 * focusable element, so it stays out of the tab order. Full screen-reader
 * semantics for graphs are Phase 13. Under prefers-reduced-motion the keyframes
 * are stilled (index.css) and a composed frame is held: the accept state lit and
 * the head parked on its tape cell.
 */

// q2 is absorbing once "ab" is seen, so it self-loops on both symbols; that is
// correct for "contains ab", not a trap. Keeping it labelled keeps the picture
// honest about the DFA being complete.

// Geometry constants kept in one place so the SVG and the tape stay in lockstep.
const TAPE_CELL = 34 // px, width of a tape cell
const TAPE_GAP = 6 // px, gap between cells
const TAPE_PITCH = TAPE_CELL + TAPE_GAP // px, head advance per step (= --hero-cell-pitch)
const TAPE_X = 60 // px, x of the first tape cell
const TAPE_Y = 150 // px, y of the tape row
const DEMO = ['a', 'a', 'b'] // the string the head consumes: q0 -a-> q1 -a-> q1 -b-> q2

// The three DFA states laid out left to right.
const NODES = [
  { id: 'q0', cx: 60, label: 'q0', beat: 0 as const, isStart: true, isAccept: false },
  { id: 'q1', cx: 190, label: 'q1', beat: 1 as const, isStart: false, isAccept: false },
  { id: 'q2', cx: 320, label: 'q2', beat: 2 as const, isStart: false, isAccept: true },
]
const NODE_CY = 70
const NODE_R = 26

export function Hero() {
  return (
    <div
      className="hero-automaton w-full"
      aria-hidden="true"
      style={{ ['--hero-cell-pitch' as string]: `${TAPE_PITCH}px` }}
    >
      <p className="font-mono text-xs uppercase tracking-label text-text-mid mb-3">
        A DFA accepting strings that contain <span className="text-text-hi">ab</span>
      </p>
      <svg
        viewBox="0 0 380 200"
        className="w-full max-w-2xl h-auto"
        role="presentation"
        focusable="false"
      >
        {/* Edge definitions: arrowheads in the neutral edge ink. */}
        <defs>
          <marker
            id="hero-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-text-mid)" />
          </marker>
        </defs>

        {/* Start indicator: an incoming arrow from open space into q0, the
            mandatory non-color cue for the start state. */}
        <line
          x1="14"
          y1={NODE_CY}
          x2={NODES[0].cx - NODE_R - 2}
          y2={NODE_CY}
          stroke="var(--color-state-start)"
          strokeWidth="2"
          markerEnd="url(#hero-arrow)"
        />

        {/* Transition edges between states (q0 -a-> q1, q1 -b-> q2). */}
        <g stroke="var(--color-text-mid)" strokeWidth="1.5" fill="none">
          <path
            d={`M ${NODES[0].cx + NODE_R} ${NODE_CY} L ${NODES[1].cx - NODE_R} ${NODE_CY}`}
            markerEnd="url(#hero-arrow)"
          />
          <path
            d={`M ${NODES[1].cx + NODE_R} ${NODE_CY} L ${NODES[2].cx - NODE_R} ${NODE_CY}`}
            markerEnd="url(#hero-arrow)"
          />
        </g>

        {/* Self-loops above each node for the symbols that stay put:
            q0 -b-> q0, q1 -a-> q1, q2 -a,b-> q2 (q2 is absorbing). */}
        <g stroke="var(--color-text-mid)" strokeWidth="1.5" fill="none">
          {NODES.map((n) => (
            <path
              key={`loop-${n.id}`}
              d={`M ${n.cx - 10} ${NODE_CY - NODE_R + 4}
                  C ${n.cx - 22} ${NODE_CY - NODE_R - 26},
                    ${n.cx + 22} ${NODE_CY - NODE_R - 26},
                    ${n.cx + 10} ${NODE_CY - NODE_R + 4}`}
              markerEnd="url(#hero-arrow)"
            />
          ))}
        </g>

        {/* Edge symbol labels in mono, on a small surface chip like the graph. */}
        <g
          fontFamily="var(--font-mono)"
          fontSize="12"
          fill="var(--color-text)"
          textAnchor="middle"
        >
          <text x={(NODES[0].cx + NODES[1].cx) / 2} y={NODE_CY - 6}>a</text>
          <text x={(NODES[1].cx + NODES[2].cx) / 2} y={NODE_CY - 6}>b</text>
          <text x={NODES[0].cx} y={NODE_CY - NODE_R - 30}>b</text>
          <text x={NODES[1].cx} y={NODE_CY - NODE_R - 30}>a</text>
          <text x={NODES[2].cx} y={NODE_CY - NODE_R - 30}>a, b</text>
        </g>

        {/* The state nodes. Each has a resting circle, an accept double ring where
            applicable, the cycling active overlay, and a mono label. */}
        {NODES.map((n) => (
          <g key={n.id}>
            {/* Resting node: neutral raised surface with the strong control border. */}
            <circle
              cx={n.cx}
              cy={NODE_CY}
              r={NODE_R}
              fill="var(--color-surface-raised)"
              stroke="var(--color-border-strong)"
              strokeWidth="2"
            />
            {/* Accept double ring (the conventional accept notation). */}
            {n.isAccept && (
              <circle
                cx={n.cx}
                cy={NODE_CY}
                r={NODE_R - 4}
                fill="none"
                stroke="var(--color-state-accept)"
                strokeWidth="2"
              />
            )}
            {/* The shared active overlay: lit only on this node's beat, reusing
                --color-state-active + thicker stroke + the breathe pulse. The
                final-frame node (q2) is the composed still frame under reduce. */}
            <circle
              className="hero-node-active"
              data-beat={n.beat}
              data-still={n.isAccept ? '' : undefined}
              cx={n.cx}
              cy={NODE_CY}
              r={NODE_R}
              fill="var(--color-state-active)"
            />
            {/* Mono state label in two stacked layers so the contrast tracks the
                fill (the styles.ts "--color-on-state ink on colored fills" rule).
                Base layer: --color-text-hi for the resting neutral frames. */}
            <text
              x={n.cx}
              y={NODE_CY + 4}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="14"
              fontWeight="500"
              fill="var(--color-text-hi)"
            >
              {n.label}
            </text>
            {/* Ink layer: --color-on-state, faded in on the same per-beat keyframe
                as the amber overlay so the dark ink shows exactly when the fill is
                lit (~8.4:1 vs the ~1.8:1 of off-white on amber). Held in the
                reduced-motion still frame for the accept node via data-still. */}
            <text
              className="hero-node-label-ink"
              data-beat={n.beat}
              data-still={n.isAccept ? '' : undefined}
              x={n.cx}
              y={NODE_CY + 4}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="14"
              fontWeight="500"
              fill="var(--color-on-state)"
            >
              {n.label}
            </text>
          </g>
        ))}

        {/* The input tape: a mono row of cells the head walks across. */}
        <g
          fontFamily="var(--font-mono)"
          fontSize="16"
          fontWeight="500"
          textAnchor="middle"
        >
          {DEMO.map((sym, i) => {
            const x = TAPE_X + i * TAPE_PITCH
            return (
              <g key={`cell-${i}`}>
                <rect
                  x={x - TAPE_CELL / 2}
                  y={TAPE_Y - TAPE_CELL / 2}
                  width={TAPE_CELL}
                  height={TAPE_CELL}
                  rx="6"
                  fill="var(--color-surface)"
                  stroke="var(--color-border)"
                  strokeWidth="1"
                />
                {/* State-active wash on the cell under the head, in step with the
                    active node; the last cell is the composed still-frame cell. */}
                <rect
                  className="hero-cell-active"
                  data-beat={i}
                  data-still={i === DEMO.length - 1 ? '' : undefined}
                  x={x - TAPE_CELL / 2}
                  y={TAPE_Y - TAPE_CELL / 2}
                  width={TAPE_CELL}
                  height={TAPE_CELL}
                  rx="6"
                  fill="var(--color-state-active-soft)"
                />
                <text x={x} y={TAPE_Y + 6} fill="var(--color-text-hi)">
                  {sym}
                </text>
              </g>
            )
          })}

          {/* The advancing head: a small triangle + caret that translates across
              the cells via hero-head-advance, eased like an edge traversal. */}
          <g className="hero-head">
            <path
              d={`M ${TAPE_X - 6} ${TAPE_Y + TAPE_CELL / 2 + 6}
                  L ${TAPE_X + 6} ${TAPE_Y + TAPE_CELL / 2 + 6}
                  L ${TAPE_X} ${TAPE_Y + TAPE_CELL / 2 - 2} z`}
              fill="var(--color-state-active)"
            />
          </g>
        </g>
      </svg>
    </div>
  )
}
