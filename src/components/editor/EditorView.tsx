import type { JSX } from 'react'
import { useMemo } from 'react'
import { useAutomatonEditor } from '@/hooks/useAutomatonEditor'
import { AutomatonGraph } from '@/visualization/renderer'
import { GraphSummary } from '@/components/a11y'
import { isDeterministic } from '@/core/automata/dfa'
import { EditorPanel } from './EditorPanel'

// Compute the structural badge text from the live automaton. This is NOT a
// language-equivalence verdict — it reports structural type only (SKILL inv 2:
// decide language correctness by equivalence, never by shape). DFA
// completeness is shown as a non-blocking annotation, never a blocker.
function computeBadge(transitions: Array<{ symbol: string | null }>, isDetResult: boolean): string {
  const hasLambda = transitions.some(t => t.symbol === null)
  if (hasLambda) return 'NFA (λ-moves)'
  if (!isDetResult) return 'NFA (nondeterministic)'
  return 'DFA'
}

// Badge component: structural type indicator. Uses brand chrome for the badge
// pill — never a state-semantic color (the badge is UI metadata, not a state role).
function ValidityBadge({ label }: { label: string }): JSX.Element {
  const isDFA = label === 'DFA'
  return (
    <span
      data-testid="validity-badge"
      className={
        'text-xs font-mono px-3 py-1.5 rounded-full border font-bold ' +
        (isDFA
          ? 'bg-brand-tint border-brand/40 text-brand-hover'
          : 'bg-surface-raised border-border text-text-mid')
      }
    >
      {label}
    </span>
  )
}

// DFA completeness warning: shown when the automaton is structurally a DFA but
// some (state, symbol) pairs have no transition defined. Non-blocking advisory
// only — the editor never prevents interaction (SKILL invariant 1: trap states
// shown explicitly, never blocked, never hidden).
function IncompletenessWarning({ automaton }: { automaton: { states: Array<{ id: string }>; transitions: Array<{ from: string; symbol: string | null }>; alphabet: Set<string> } }): JSX.Element | null {
  const incomplete = useMemo(() => {
    if (automaton.states.length === 0 || automaton.alphabet.size === 0) return false
    for (const state of automaton.states) {
      for (const sym of automaton.alphabet) {
        const hasTransition = automaton.transitions.some(
          t => t.from === state.id && t.symbol === sym
        )
        if (!hasTransition) return true
      }
    }
    return false
  }, [automaton])

  if (!incomplete) return null

  return (
    <p className="text-xs text-text-low px-4 py-2 border-t border-border">
      Incomplete DFA: some (state, symbol) pairs have no transition. Add trap-state
      transitions to make it total.
    </p>
  )
}

export function EditorView(): JSX.Element {
  const { working, automaton, dispatchers } = useAutomatonEditor()

  // Memoised structural badge. The editor route runs no exponential construction
  // (isDeterministic is a single linear pass that cannot throw TooLargeError), so
  // there is no TooLargeNotice path here; the cap and notice fire on the routes
  // that actually construct (home/regex, multi-view, closure, n2r). See WR-01.
  const badge = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => computeBadge(automaton.transitions, isDeterministic(automaton as any)),
    [automaton]
  )

  // Positional editor edge ids fed to the renderer so canvas selection round-trips
  // through the editor id, not the array index (BL-01). Order matches
  // automaton.transitions because toAutomaton is a 1:1 positional map. Memoised on
  // working.transitions (a stable reference unless transitions change) so it does
  // not add Cytoscape re-creations beyond the structural edits that already force one.
  const edgeIds = useMemo(() => working.transitions.map(t => t.id), [working.transitions])

  const isEmpty = working.states.length === 0

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold text-text-hi tracking-tight">
            Automaton Editor
          </h2>
          <p className="text-sm text-text-mid mt-1">
            Tap the canvas to add states. Drag from a state handle to draw transitions.
          </p>
        </div>
        <ValidityBadge label={badge} />
      </div>

      {/* Main editor layout: graph beside panel on lg+; stacked + bottom-sheet on mobile */}
      <div className="flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Graph canvas */}
        <div
          className="relative flex-1 min-h-[420px] lg:min-h-[600px] bg-bg rounded-2xl border border-border overflow-hidden"
          data-testid="editor-canvas"
        >
          {isEmpty && (
            // First-launch affordance: visible canvas instruction so the user
            // never faces a blank void. Pointer-events-none keeps it below the
            // Cytoscape hit layer.
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
              aria-hidden="true"
            >
              <div className="text-center space-y-2 opacity-50">
                <svg
                  className="mx-auto h-10 w-10 text-text-low"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
                </svg>
                <p className="text-sm text-text-low font-medium">Tap the canvas to add a state, or use Add state in the panel</p>
                <p className="text-xs text-text-low">Drag from a state node handle to draw transitions</p>
              </div>
            </div>
          )}
          <GraphSummary automaton={automaton} ariaLabel="State diagram of the automaton you are building">
            <AutomatonGraph
              automaton={automaton}
              edgeIds={edgeIds}
              editable
              onAddStateAt={dispatchers.addStateAt}
              onDrawEdge={dispatchers.drawEdge}
              onSelect={dispatchers.setSelection}
            />
          </GraphSummary>
        </div>

        {/* Control panel: sidebar on lg+, bottom-sheet on mobile */}
        <div className="lg:w-72 xl:w-80 shrink-0">
          <EditorPanel working={working} dispatchers={dispatchers} />
          {/* DFA incompleteness advisory — only shown when structurally a DFA */}
          {badge === 'DFA' && <IncompletenessWarning automaton={automaton} />}
        </div>
      </div>
    </main>
  )
}
