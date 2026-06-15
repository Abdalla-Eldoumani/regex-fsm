import { useState, useMemo, useEffect, useCallback } from 'react'
import type { JSX } from 'react'
import { parse } from '@/core/cachedAlgorithms'
import { buildNFAWithCorrespondence } from '@/core/algorithms/thompson'
import { nfaToDFAWithCorrespondence } from '@/core/algorithms/subset'
import { minimizeDFA } from '@/core/cachedAlgorithms'
import { TooLargeError } from '@/core/automata/types'
import type { MinimizationResult } from '@/core/cachedAlgorithms'
import { AutomatonGraph } from '@/visualization/renderer'
import { TooLargeNotice } from '@/components/common/TooLargeNotice'
import { resolve, type Pane, type CorrespondenceMaps } from './correspondence'

// Quintuple caption shown under each pane header to match course notation.
// (Q, Σ, δ, q₀, A) is the standard five-tuple for a finite automaton.
const QUINTUPLE = '(Q, Σ, δ, q₀, A)'

// RegexPane renders the regex string in course notation.
// When fragments are available each AST node id maps to a clickable span
// that sets the cross-pane selection. Without fragments the regex is plain text.
function RegexPane({
  regex,
  fragments,
  linkedIds,
  onSelectNodeId,
}: {
  regex: string
  fragments: CorrespondenceMaps['fragments']
  linkedIds: string[]
  onSelectNodeId: (nodeId: string) => void
}): JSX.Element {
  const linkedSet = useMemo(() => new Set(linkedIds), [linkedIds])

  if (!regex) {
    return (
      <div className="flex items-center justify-center h-full text-text-low text-sm font-mono">
        Enter a regex to display it here.
      </div>
    )
  }

  // Without fragment map: plain mono text — no interaction from this pane.
  // This is the graceful absence described in the plan.
  if (!fragments || fragments.size === 0) {
    return (
      <div className="flex items-center justify-center h-full px-4">
        <span className="font-mono text-lg text-text-hi break-all">{regex}</span>
      </div>
    )
  }

  // With fragments: render the full regex as a single span whose node id is n0
  // (the root pre-order id). Clicking it selects the whole expression.
  // A more granular per-character render would need AST position ranges, which
  // is beyond this plan's scope. We highlight the root span when any linked
  // node id falls in the fragment set.
  const rootLinked = [...linkedSet].some(id => fragments.has(id))

  return (
    <div className="flex items-center justify-center h-full px-4">
      <button
        type="button"
        onClick={() => onSelectNodeId('n0')}
        className={
          'font-mono text-lg break-all rounded px-2 py-1 transition-all cursor-pointer ' +
          (rootLinked
            ? 'text-brand-hover ring-2 ring-brand-hover bg-brand-tint'
            : 'text-text-hi hover:text-brand-hover hover:bg-brand-tint')
        }
        title="Click to highlight corresponding NFA states"
      >
        {regex}
      </button>
    </div>
  )
}

// PaneHeader renders the pane title and the quintuple caption.
function PaneHeader({ title }: { title: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 border-b border-border shrink-0">
      <span className="text-sm font-display font-semibold text-text-hi">{title}</span>
      <span className="text-xs font-mono text-text-low tracking-widest">{QUINTUPLE}</span>
    </div>
  )
}

// Derivation result: all four representations plus correspondence maps.
// null fields signal a pane that couldn't be computed (parse error or too-large).
interface Derivation {
  regex: string
  nfa: import('@/core/automata/types').NFA | null
  dfa: import('@/core/automata/types').DFA | null
  minResult: MinimizationResult | null
  maps: CorrespondenceMaps
  nfaError: string | null
  dfaTooLarge: { message: string; partial?: { states: number } } | null
  minTooLarge: { message: string; partial?: { states: number } } | null
  parseError: string | null
}

// Build all four representations from a debounced regex string.
function deriveAll(debouncedRegex: string): Derivation {
  const empty: Derivation = {
    regex: debouncedRegex,
    nfa: null,
    dfa: null,
    minResult: null,
    maps: { nfaStateSets: new Map(), mergedStates: new Map(), stateMapping: new Map() },
    nfaError: null,
    dfaTooLarge: null,
    minTooLarge: null,
    parseError: null,
  }

  if (!debouncedRegex.trim()) return empty

  try {
    const ast = parse(debouncedRegex)

    // NFA with Thompson fragment map for regex-pane interaction.
    const { nfa, fragments } = buildNFAWithCorrespondence(ast)

    const alphaSet = new Set(nfa.alphabet)

    // DFA with subset correspondence map; may throw TooLargeError.
    let dfaResult: { dfa: import('@/core/automata/types').DFA; nfaStateSets: Map<string, string[]> } | null = null
    let dfaTooLarge: Derivation['dfaTooLarge'] = null
    try {
      dfaResult = nfaToDFAWithCorrespondence(nfa, alphaSet)
    } catch (e) {
      if (e instanceof TooLargeError) {
        dfaTooLarge = { message: e.message, partial: e.partial }
      } else throw e
    }

    // Minimized DFA; may throw TooLargeError (edge case: very large subset DFA).
    let minResult: MinimizationResult | null = null
    let minTooLarge: Derivation['minTooLarge'] = null
    if (dfaResult) {
      try {
        minResult = minimizeDFA(dfaResult.dfa)
      } catch (e) {
        if (e instanceof TooLargeError) {
          minTooLarge = { message: e.message, partial: e.partial }
        } else throw e
      }
    }

    const nfaStateSets = dfaResult?.nfaStateSets ?? new Map<string, string[]>()
    const mergedStates = minResult?.mergedStates ?? new Map<string, string[]>()
    const stateMapping = minResult?.stateMapping ?? new Map<string, string>()

    return {
      regex: debouncedRegex,
      nfa,
      dfa: dfaResult?.dfa ?? null,
      minResult,
      maps: { nfaStateSets, mergedStates, stateMapping, fragments },
      nfaError: null,
      dfaTooLarge,
      minTooLarge,
      parseError: null,
    }
  } catch (e) {
    // Parse error or unexpected exception from NFA construction.
    return {
      ...empty,
      parseError: e instanceof Error ? e.message : 'Unexpected error',
    }
  }
}

// MOBILE TAB names in display order.
const MOBILE_TABS: { key: Pane | 'regex'; label: string }[] = [
  { key: 'regex', label: 'Regex' },
  { key: 'nfa', label: 'NFA' },
  { key: 'dfa', label: 'DFA' },
  { key: 'min', label: 'Min DFA' },
]

// The four-pane synchronized MultiView route container.
// Reuses AutomatonGraph, TooLargeNotice, and the pure resolve() from correspondence.ts.
// No new Cytoscape wrapper; no re-derived correspondence logic.
export default function MultiView(): JSX.Element {
  const [regex, setRegex] = useState('(a+b)*abb')
  const [debouncedRegex, setDebouncedRegex] = useState('(a+b)*abb')
  const [activeTab, setActiveTab] = useState<'regex' | Pane>('regex')
  // selectionSource tracks the regex that was active when the selection was made.
  // If it differs from the current debouncedRegex the selection is stale (VIEW-03).
  const [selectionState, setSelectionState] = useState<{
    pane: Pane
    nodeIds: string[]
    source: string
  } | null>(null)

  // Derive the effective selection: null whenever the source has changed since
  // the selection was made. This replaces a useEffect(() => setX(null), [dep])
  // pattern that the project eslint rule (react-hooks/set-state-in-effect) flags.
  const selection = useMemo<{ pane: Pane; nodeIds: string[] } | null>(() => {
    if (!selectionState) return null
    if (selectionState.source !== debouncedRegex) return null
    return { pane: selectionState.pane, nodeIds: selectionState.nodeIds }
  }, [selectionState, debouncedRegex])

  // Expose a setter that captures the current source so staleness is detectable.
  const setSelection = useCallback(
    (sel: { pane: Pane; nodeIds: string[] } | null) => {
      setSelectionState(sel ? { ...sel, source: debouncedRegex } : null)
    },
    [debouncedRegex]
  )

  // 300ms debounce mirroring App.tsx.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedRegex(regex), 300)
    return () => clearTimeout(timer)
  }, [regex])

  // Track whether we are in a desktop context (lg breakpoint, 1024px).
  // On mobile (isDesktop=false) we only mount the active pane's Cytoscape
  // instance to cap to one canvas (RESEARCH Pitfall 4).
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Derive all representations from the debounced regex (VIEW-01).
  const derivation = useMemo(() => deriveAll(debouncedRegex), [debouncedRegex])

  // Compute linked ids for each graph pane from the current selection.
  // Returns empty arrays when there is no selection (VIEW-02).
  const linked = useMemo(() => {
    if (!selection) return { regex: [], nfa: [], dfa: [], min: [] }
    return resolve(selection, derivation.maps)
  }, [selection, derivation.maps])

  // Selection handlers — one per graph pane. Each stores pane identity + node ids.
  const handleNfaSelect = useCallback((nodeIds: string[]) => {
    setSelection(nodeIds.length === 0 ? null : { pane: 'nfa', nodeIds })
  }, [setSelection])
  const handleDfaSelect = useCallback((nodeIds: string[]) => {
    setSelection(nodeIds.length === 0 ? null : { pane: 'dfa', nodeIds })
  }, [setSelection])
  const handleMinSelect = useCallback((nodeIds: string[]) => {
    setSelection(nodeIds.length === 0 ? null : { pane: 'min', nodeIds })
  }, [setSelection])
  const handleRegexNodeSelect = useCallback((nodeId: string) => {
    setSelection({ pane: 'regex', nodeIds: [nodeId] })
  }, [setSelection])

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      {/* Page header */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <h2 className="text-2xl font-display font-semibold text-text-hi">
          Multi-View
        </h2>
        <p className="text-sm text-text-mid mt-1">
          Regex, NFA, DFA, and minimized DFA together. Select a state to highlight its correspondence.
        </p>
      </div>

      {/* Regex input bar */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
          <label htmlFor="multiview-regex-input" className="shrink-0 text-sm font-mono text-text-mid">
            Regex
          </label>
          <input
            id="multiview-regex-input"
            type="text"
            value={regex}
            onChange={e => setRegex(e.target.value)}
            placeholder="e.g. (a+b)*abb"
            spellCheck={false}
            className="flex-1 min-w-0 bg-transparent font-mono text-text-hi text-sm focus:outline-none placeholder:text-text-low"
          />
          {derivation.parseError && (
            <span className="text-xs text-error shrink-0">{derivation.parseError}</span>
          )}
        </div>
      </div>

      {/* Mobile tab switcher — hidden on lg and above */}
      <div className="lg:hidden max-w-7xl w-full mx-auto px-4 sm:px-6 pb-2">
        <div
          role="tablist"
          aria-label="Pane selector"
          className="flex rounded-lg border border-border bg-surface-raised overflow-hidden"
        >
          {MOBILE_TABS.map(({ key, label }) => (
            <button
              key={key}
              id={`tab-${key}`}
              role="tab"
              aria-selected={activeTab === key}
              aria-controls={`panel-${key}`}
              type="button"
              onClick={() => setActiveTab(key)}
              className={
                'flex-1 min-h-[44px] text-sm font-medium transition-colors ' +
                (activeTab === key
                  ? 'bg-brand-tint text-brand-hover border-b-2 border-brand'
                  : 'text-text-mid hover:text-text-hi')
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Four-pane grid
          - Desktop (lg+): grid-cols-4 (4 equal columns)
          - Tablet (md): grid-cols-2 (2x2)
          - Mobile: single pane controlled by tab switcher
          Each pane is min-h-[420px] for a usable canvas height.
      */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-8 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full">

          {/* REGEX PANE — DOM, always visible */}
          <div
            id="panel-regex"
            role="tabpanel"
            aria-labelledby="tab-regex"
            className={
              'flex flex-col rounded-xl border border-border bg-surface overflow-hidden min-h-[420px] ' +
              (activeTab !== 'regex' ? 'hidden lg:flex' : 'flex')
            }
          >
            <PaneHeader title="Regex" />
            <div className="flex-1 overflow-auto">
              <RegexPane
                regex={derivation.regex}
                fragments={derivation.maps.fragments}
                linkedIds={linked.regex}
                onSelectNodeId={handleRegexNodeSelect}
              />
            </div>
          </div>

          {/* NFA PANE */}
          <div
            id="panel-nfa"
            role="tabpanel"
            aria-labelledby="tab-nfa"
            className={
              'flex flex-col rounded-xl border border-border bg-surface overflow-hidden min-h-[420px] ' +
              (activeTab !== 'nfa' ? 'hidden lg:flex' : 'flex')
            }
          >
            <PaneHeader title="NFA (Thompson)" />
            <div className="flex-1 relative" data-testid="multiview-nfa-canvas">
              {/* On mobile, only mount the active pane's canvas (RESEARCH Pitfall 4).
                  On desktop (isDesktop) all panes are always mounted. */}
              {(activeTab === 'nfa' || isDesktop) && derivation.nfa ? (
                <AutomatonGraph
                  automaton={derivation.nfa}
                  highlightLinked={linked.nfa}
                  onSelect={handleNfaSelect}
                />
              ) : !derivation.nfa && derivation.parseError ? (
                <div className="flex items-center justify-center h-full px-4 text-sm text-text-low font-mono">
                  {derivation.parseError}
                </div>
              ) : !derivation.nfa ? (
                <div className="flex items-center justify-center h-full text-sm text-text-low">
                  Enter a valid regex above.
                </div>
              ) : null}
            </div>
          </div>

          {/* DFA PANE */}
          <div
            id="panel-dfa"
            role="tabpanel"
            aria-labelledby="tab-dfa"
            className={
              'flex flex-col rounded-xl border border-border bg-surface overflow-hidden min-h-[420px] ' +
              (activeTab !== 'dfa' ? 'hidden lg:flex' : 'flex')
            }
          >
            <PaneHeader title="DFA (Subset)" />
            <div className="flex-1 relative" data-testid="multiview-dfa-canvas">
              {derivation.dfaTooLarge ? (
                <div className="p-4">
                  <TooLargeNotice
                    message={derivation.dfaTooLarge.message}
                    partial={derivation.dfaTooLarge.partial}
                  />
                </div>
              ) : (activeTab === 'dfa' || isDesktop) && derivation.dfa ? (
                <AutomatonGraph
                  automaton={derivation.dfa}
                  highlightLinked={linked.dfa}
                  onSelect={handleDfaSelect}
                />
              ) : !derivation.dfa && !derivation.dfaTooLarge ? (
                <div className="flex items-center justify-center h-full text-sm text-text-low">
                  Enter a valid regex above.
                </div>
              ) : null}
            </div>
          </div>

          {/* MIN DFA PANE */}
          <div
            id="panel-min"
            role="tabpanel"
            aria-labelledby="tab-min"
            className={
              'flex flex-col rounded-xl border border-border bg-surface overflow-hidden min-h-[420px] ' +
              (activeTab !== 'min' ? 'hidden lg:flex' : 'flex')
            }
          >
            <PaneHeader title="Min DFA (Moore)" />
            <div className="flex-1 relative" data-testid="multiview-min-canvas">
              {derivation.minTooLarge ? (
                <div className="p-4">
                  <TooLargeNotice
                    message={derivation.minTooLarge.message}
                    partial={derivation.minTooLarge.partial}
                  />
                </div>
              ) : (activeTab === 'min' || isDesktop) && derivation.minResult ? (
                <AutomatonGraph
                  automaton={derivation.minResult.dfa}
                  highlightLinked={linked.min}
                  onSelect={handleMinSelect}
                />
              ) : !derivation.minResult && !derivation.minTooLarge ? (
                <div className="flex items-center justify-center h-full text-sm text-text-low">
                  Enter a valid regex above.
                </div>
              ) : null}
              {/* State count annotation for the minimization comparison (VIEW-04). */}
              {derivation.dfa && derivation.minResult && (
                <div className="absolute bottom-2 right-2 text-xs font-mono text-text-low bg-surface/80 rounded px-2 py-1">
                  <span data-testid="multiview-dfa-state-count" className="sr-only">
                    DFA states: {derivation.dfa.states.length}
                  </span>
                  <span data-testid="multiview-min-state-count">
                    {derivation.minResult.dfa.states.length} states
                  </span>
                  {derivation.minResult.dfa.states.length < derivation.dfa.states.length && (
                    <span className="ml-1 text-brand-hover">
                      (vs {derivation.dfa.states.length})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Selection status bar */}
      {selection && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4 text-xs text-text-mid font-mono">
          Selected in <span className="text-brand-hover">{selection.pane}</span>:{' '}
          {selection.nodeIds.join(', ')}
        </div>
      )}
    </div>
  )
}

