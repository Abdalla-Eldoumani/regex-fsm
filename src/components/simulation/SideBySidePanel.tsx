import { useMemo } from 'react'
import type { JSX } from 'react'
import { AutomatonGraph } from '@/visualization/renderer'
import { dfaStateForNfaSet } from '@/core/algorithms/dfaStateForNfaSet'
import type { SubsetCorrespondence } from '@/core/algorithms/subset'
import type { NFA } from '@/core/automata/types'

// SideBySidePanel: the side-by-side synced NFA vs determinized-DFA run (SIM-03).
// One shared step index in the parent drives ONE tape and produces ONE nfaActiveSet
// (the lambda-closed set simulateNFA reports at that step); this panel projects that
// single set onto two graphs that cannot desync because there is one source of truth.
//
// The NFA panel lights the WHOLE active set (every simultaneously-active state, never
// one path -- invariant 3). The determinized-DFA panel lights the SINGLE subset state
// whose nfaStateSets entry equals that set, found by dfaStateForNfaSet. Both highlights
// carry the same amber .active role (the colorblind-safe link cue), and the DFA node's
// set-notation label is shown in the caption, so the teaching claim is literal: this one
// DFA state IS that set of NFA states. The determinized DFA is the RAW subset DFA from
// nfaToDFAWithCorrespondence (NOT minimized), because its state ids ARE the subsets, so
// the set identity stays literal; minimizing would destroy the id-equals-subset link.
//
// renderer.tsx is byte-frozen: this composes over AutomatonGraph via the existing
// highlightStates prop only. Course notation throughout (braces set notation, lambda,
// the empty-set glyph for a dead configuration, A for the accepting set in the caption).

interface SideBySidePanelProps {
  nfa: NFA
  correspondence: SubsetCorrespondence
  nfaActiveSet: string[]
}

// Course notation. A configuration is a set in braces; an empty configuration is the
// empty-set glyph (a dead configuration). JetBrains Mono is applied via font-mono so
// the symbolic content renders in the symbolic typeface.
const EMPTY_SET = '∅' // empty set
const LAMBDA = 'λ' // lambda

function formatSet(states: string[]): string {
  if (states.length === 0) return EMPTY_SET
  return `{${states.join(',')}}`
}

export function SideBySidePanel({
  nfa,
  correspondence,
  nfaActiveSet,
}: SideBySidePanelProps): JSX.Element {
  // The single determinized DFA state for the current NFA active set. null only if no
  // determinized state represents the set (e.g. an empty set with no trap in the DFA);
  // in that case the DFA panel simply lights nothing for this frame.
  const dfaState = useMemo(
    () => dfaStateForNfaSet(correspondence.nfaStateSets, nfaActiveSet),
    [correspondence.nfaStateSets, nfaActiveSet]
  )

  // The DFA panel highlight: the single matched state, or [] when there is no match.
  const dfaHighlight = dfaState !== null ? [dfaState] : []

  // The matched DFA state's own set-notation label. The raw subset DFA ids ARE the set
  // notation already, but read it back from nfaStateSets so the label is the canonical
  // sorted set rather than the raw id string (they agree; this is defensive).
  const dfaLabel = dfaState !== null ? formatSet(correspondence.nfaStateSets.get(dfaState) ?? []) : null

  return (
    <div className="flex flex-col gap-4">
      {/* Correspondence caption in course notation: name the teaching claim that the
          highlighted determinized state equals the lambda-closure of the reachable NFA
          states at this step, and show the matched set label. Color is never the only
          signal: the amber active role is reinforced by this set-notation label. */}
      <div
        data-testid="sim-correspondence"
        className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4"
        role="note"
        aria-label="Side-by-side correspondence"
      >
        <span className="text-xs font-sans text-text-low uppercase tracking-wide">
          Correspondence
        </span>
        <span className="text-sm text-text-mid">
          The single determinized-DFA state lit below is exactly the {LAMBDA}-closure of the
          reachable NFA states lit on the left: one DFA state stands for that whole set.
        </span>
        <span className="text-sm font-mono text-text-hi" data-testid="sim-correspondence-set">
          {dfaLabel !== null ? (
            <>
              determinized state = {dfaLabel}
            </>
          ) : (
            <>
              determinized state = {EMPTY_SET} (no live configuration)
            </>
          )}
        </span>
      </div>

      {/* The two panels: a flex row on wide screens that stacks to a single column at
          the 360px floor (NFA above DFA), each graph in its own bordered box. The same
          amber active role lights the NFA active set on the left and its single
          determinized state on the right -- the visible link. */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* NFA panel: the WHOLE lambda-closed active set lights at once (invariant 3). */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-sans text-text-low uppercase tracking-wide">
              NFA
            </span>
            <span className="text-xs font-mono text-text-mid" data-testid="sim-nfa-panel-label">
              active set {formatSet(nfaActiveSet)}
            </span>
          </div>
          <div
            data-testid="sim-nfa-panel"
            className="rounded-xl border border-border bg-surface overflow-hidden"
            style={{ minHeight: '360px' }}
          >
            <AutomatonGraph automaton={nfa} highlightStates={nfaActiveSet} />
          </div>
        </div>

        {/* Determinized-DFA panel: the SINGLE subset state that equals the NFA active
            set lights amber. The raw subset DFA's state id IS the set notation. */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-sans text-text-low uppercase tracking-wide">
              Determinized DFA
            </span>
            <span className="text-xs font-mono text-text-mid" data-testid="sim-dfa-panel-label">
              state {dfaLabel ?? EMPTY_SET}
            </span>
          </div>
          <div
            data-testid="sim-dfa-panel"
            className="rounded-xl border border-border bg-surface overflow-hidden"
            style={{ minHeight: '360px' }}
          >
            <AutomatonGraph automaton={correspondence.dfa} highlightStates={dfaHighlight} />
          </div>
        </div>
      </div>
    </div>
  )
}
