import { useMemo } from 'react'
import type { JSX } from 'react'
import type {
  ComputationTreeResult,
  ComputationEdge,
  ComputationNode,
} from '@/core/algorithms/computationTree'

// ComputationTree: the bespoke DOM view of an NFA's genuine nondeterministic
// execution on one input. It renders the configuration-set DAG produced by
// computationTree.ts (plan 01) without re-deriving anything: one row per level
// (level 0 the start closure at the top, one row per consumed symbol below it),
// each configuration drawn as a font-mono set, lambda-closure expansions and
// dead branches labelled, accepting leaves ringed.
//
// It reuses the SAME state-semantic tokens as the graph (AutomatonView legend)
// so a tree node MEANS the same thing as a graph node: accept = double ring +
// state-accept; the current-step frontier = state-active + the is-active glow
// (CSS, so reduced motion holds a still amber frame by construction); a dead or
// empty configuration = dashed state-trap, dimmed, ending in the empty-set glyph.
// This is why it is plain DOM and never Cytoscape: the renderer is byte-frozen,
// and the tree's teaching value is the stacked-level branching, not a force layout.
//
// Lockstep: only levels 0..currentStep are drawn, and the level-currentStep
// frontier carries the active cue, so the tree advances on the single shared step
// index that also drives the tape and the parallel-active-set graph.

interface ComputationTreeProps {
  result: ComputationTreeResult
  currentStep: number
}

// Course notation. A configuration is a set in braces; the empty configuration is
// the empty-set glyph (a dead branch). JetBrains Mono is applied by the caller's
// font-mono class so the symbols render in the symbolic typeface.
const EMPTY_SET = '∅' // empty set
const LAMBDA = 'λ' // lambda

function formatSet(states: string[]): string {
  if (states.length === 0) return EMPTY_SET
  return `{${states.join(',')}}`
}

// The classes for a single configuration node, chosen by its semantic role so the
// node reads identically to the graph. Precedence: the active frontier cue layers
// on top of the resting role (accept / dead / live) via the is-active outline, so
// an accepting node on the current step shows both the accept ring and the amber
// active glow.
function nodeClasses(node: ComputationNode, isFrontier: boolean): string {
  const base =
    'inline-flex items-center justify-center rounded-lg px-3 py-2 font-mono text-sm shrink-0 border transition-colors'

  // A configuration with no live members is a dead leaf: dashed mauve, dimmed,
  // the empty-set glyph. isDead marks a configuration whose whole set lost its
  // successor on the next symbol; either reads as the trap cue.
  const isDead = node.isDead || node.states.length === 0

  let role: string
  if (node.isAccepting) {
    // Accept leaf: the double-ring cue (border-double) + state-accept, never color
    // alone (the word "accept" is named in the legend and the ring is the glyph).
    role = 'border-[3px] border-double border-state-accept bg-state-accept-soft text-state-accept'
  } else if (isDead) {
    role = 'border-2 border-dashed border-state-trap bg-state-trap-soft text-state-trap opacity-80'
  } else {
    role = 'border-border bg-surface-raised text-text-hi'
  }

  // The is-active class (index.css) is the shared simulation-active treatment: an
  // amber outline + the breathe glow, stilled to one frame under reduced motion by
  // the global media override. Thicker border is the mandatory non-color cue.
  const frontier = isFrontier ? 'is-active border-state-active' : ''

  return `${base} ${role} ${frontier}`
}

export function ComputationTree({ result, currentStep }: ComputationTreeProps): JSX.Element {
  // Index every node's first incoming edge so a node can name the symbol consumed
  // to reach it and flag a lambda-closure expansion (viaLambda) distinctly from the
  // consuming symbol. parentId keeps the spine; this map keeps the label.
  const incoming = useMemo(() => {
    const map = new Map<string, ComputationEdge>()
    for (const edge of result.edges) {
      if (!map.has(edge.toId)) map.set(edge.toId, edge)
    }
    return map
  }, [result.edges])

  // Draw levels up to and including the current step only (lockstep with the tape).
  // currentStep can exceed the last level on a short run; clamp so the whole tree
  // shows rather than nothing.
  const lastLevel = result.levels.length - 1
  const shownThrough = Math.min(currentStep, lastLevel)
  const shownLevels = result.levels.filter(level => level.index <= shownThrough)

  return (
    <div className="flex flex-col gap-3">
      {/* Legend: names the three cues near the tree (mirrors AcceptingLegend and
          the AutomatonView graph legend) so color is never the only signal. */}
      <div
        data-testid="sim-tree-legend"
        className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface p-3"
        role="note"
        aria-label="Computation tree legend"
      >
        <span className="text-xs font-sans text-text-low uppercase tracking-wide">Legend</span>
        <span className="flex items-center gap-2 text-xs text-text-mid">
          <span className="inline-block w-4 h-4 rounded border-[3px] border-double border-state-accept bg-state-accept-soft" />
          accept leaf
        </span>
        <span className="flex items-center gap-2 text-xs text-text-mid">
          <span className="inline-block w-4 h-4 rounded border-2 border-state-active bg-state-active-soft" />
          active (this step)
        </span>
        <span className="flex items-center gap-2 text-xs text-text-mid">
          <span className="inline-block w-4 h-4 rounded border-2 border-dashed border-state-trap bg-state-trap-soft opacity-80" />
          dead branch ({EMPTY_SET})
        </span>
      </div>

      {/* The tree's own horizontal scroll box. At 360px the wide axis (sibling
          configurations within a level) scrolls HERE, inside this box, so the page
          never gains horizontal scroll. Levels stack vertically. */}
      <div
        data-testid="sim-tree"
        className="overflow-x-auto rounded-xl border border-border bg-surface p-4"
      >
        <div className="flex flex-col gap-5 w-max min-w-full">
          {shownLevels.map(level => {
            // The symbol consumed to reach this level, in course notation. Level 0
            // is the start closure (no symbol consumed yet). A node reached by a
            // lambda-closure expansion flags viaLambda on its incoming edge.
            const viaLambda = level.nodes.some(n => incoming.get(n.id)?.viaLambda)
            const isFrontier = level.index === shownThrough

            return (
              <div key={level.index} className="flex flex-col gap-2">
                {/* Level annotation: "start (q0 closure, λ)" for level 0, else
                    "reading 'x'" plus a λ note when a closure move was taken. */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-sans uppercase tracking-label text-text-low">
                    Level {level.index}
                  </span>
                  <span className="text-xs font-mono text-text-mid">
                    {level.symbol === null
                      ? `start (${LAMBDA}-closure of q₀)`
                      : `reading '${level.symbol}'`}
                    {viaLambda ? ` · ${LAMBDA}-move` : ''}
                  </span>
                </div>

                {/* The configurations at this level as a horizontal row. An empty
                    level (every branch died) renders the empty-set dead leaf so the
                    rejection reads as a configuration that went nowhere. */}
                <div className="flex flex-wrap items-stretch gap-3">
                  {level.nodes.length === 0 ? (
                    <span
                      data-testid="sim-tree-dead"
                      className={nodeClasses(
                        { id: `${level.index}:empty`, level: level.index, states: [], isAccepting: false, isDead: true, parentId: null },
                        isFrontier
                      )}
                    >
                      {EMPTY_SET}
                    </span>
                  ) : (
                    level.nodes.map(node => {
                      const dead = node.isDead || node.states.length === 0
                      const testid = node.isAccepting
                        ? 'sim-tree-accept'
                        : dead
                          ? 'sim-tree-dead'
                          : 'sim-tree-node'
                      return (
                        <span
                          key={node.id}
                          data-testid={testid}
                          className={nodeClasses(node, isFrontier)}
                          aria-label={
                            node.isAccepting
                              ? `accepting configuration ${formatSet(node.states)}`
                              : dead
                                ? `dead configuration ${formatSet(node.states)}`
                                : `configuration ${formatSet(node.states)}`
                          }
                        >
                          {formatSet(node.states)}
                        </span>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
