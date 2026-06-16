import { useState, useRef, useCallback } from 'react'
import { Automaton } from '@/core/automata/types'
import { SimulationResult } from '@/core/algorithms/simulate'
import { AutomatonGraph, AutomatonGraphHandle } from '@/visualization/renderer'
import { Tabs } from '../common/Tabs'
import { TransitionTable } from './TransitionTable'
import { StateList } from './StateList'
import { SimulationModal } from '../simulation/SimulationModal'
import { ShareButton } from '../share/ShareButton'
import { ExportMenu } from '../share/ExportMenu'

interface AutomatonViewProps {
  automaton: Automaton | null
  title: string
  error?: string
  highlightStates?: string[]
  highlightEdges?: string[]
  simulationResult?: SimulationResult | null
  mode?: 'nfa' | 'dfa'
  // When provided, the Share button is shown in the action row and builds the
  // hash URL for the current scratchpad (the parent owns the conversion).
  onBuildShareHash?: () => string
}

export function AutomatonView({
  automaton,
  error,
  highlightStates = [],
  highlightEdges = [],
  simulationResult = null,
  mode = 'nfa',
  onBuildShareHash,
}: AutomatonViewProps) {
  const [activeTab, setActiveTab] = useState('graph')
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false)
  const [isExpandModalOpen, setIsExpandModalOpen] = useState(false)
  const [modalHighlightStates, setModalHighlightStates] = useState<string[]>([])
  const [modalHighlightEdges, setModalHighlightEdges] = useState<string[]>([])
  const graphRef = useRef<AutomatonGraphHandle>(null)

  const handleModalHighlightChange = useCallback((states: string[], edges: string[]) => {
    setModalHighlightStates(states)
    setModalHighlightEdges(edges)
  }, [])

  const handleCloseModal = () => {
    setIsSimulationModalOpen(false)
    setModalHighlightStates([])
    setModalHighlightEdges([])
  }

  const effectiveHighlightStates = isSimulationModalOpen ? modalHighlightStates : highlightStates
  const effectiveHighlightEdges = isSimulationModalOpen ? modalHighlightEdges : highlightEdges

  const tabs = [
    { id: 'graph', label: 'Graph' },
    { id: 'table', label: 'Table' },
    { id: 'states', label: 'States' },
    { id: 'info', label: 'Info' },
  ]

  // The cy handle for the Export menu's PNG path. Read at click time from the
  // mounted graph; the menu owns both the handle accessor and the automaton model.
  const getCy = useCallback(() => graphRef.current?.getCytoscapeInstance(), [])

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
         {/* Error is UI feedback: uses --color-error with icon (icon is in the parent card) */}
         <div className="max-w-md p-6 bg-error/10 border border-error/30 text-error rounded-2xl text-sm font-semibold">
            {error}
         </div>
      </div>
    )
  }

  if (!automaton) {
    return (
      <div className="flex items-center justify-center h-full text-text-low">
        <div className="text-center space-y-3">
           <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-surface-raised border border-border flex items-center justify-center">
             <svg className="w-10 h-10 text-text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
             </svg>
           </div>
           <p className="text-xl font-bold text-text-mid">No Automaton Generated</p>
           <p className="text-sm text-text-low">Enter a valid regular expression to view the diagram.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-surface sticky top-0 z-10">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsSimulationModalOpen(true)}
            className="cursor-pointer min-h-[44px] px-4 py-2 text-xs font-semibold text-on-brand bg-brand hover:bg-brand-hover border border-brand/50 rounded-lg transition-all shadow-sm hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
            Simulate
          </button>

          {/* Share copies the hash URL for the whole scratchpad, so it is offered
              on every tab when the parent supplies the builder. */}
          {onBuildShareHash && <ShareButton buildHash={onBuildShareHash} />}

          {/* Export folds in the legacy bare PNG/SVG buttons plus the new text
              formats. It is shown on the graph tab, where the cy handle for the
              PNG path is live and the SVG/PNG actions are in context. */}
          {activeTab === 'graph' && <ExportMenu automaton={automaton} getCy={getCy} />}

          {(activeTab === 'table' || activeTab === 'states') && (
            <button
              onClick={() => setIsExpandModalOpen(true)}
              className="cursor-pointer min-h-[44px] px-4 py-2 text-xs font-semibold text-text-mid hover:text-brand-hover border border-border hover:border-border-strong bg-surface-raised hover:bg-surface-overlay rounded-lg transition-all shadow-sm hover:scale-105 active:scale-95 flex items-center gap-2"
              title="Expand view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M13.28 7.78l3.22-3.22v2.69a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.69l-3.22 3.22a.75.75 0 001.06 1.06zM2 17.25v-4.5a.75.75 0 011.5 0v2.69l3.22-3.22a.75.75 0 011.06 1.06L4.56 16.5h2.69a.75.75 0 010 1.5h-4.5a.747.747 0 01-.75-.75zM12.22 13.28l3.22 3.22h-2.69a.75.75 0 000 1.5h4.5a.747.747 0 00.75-.75v-4.5a.75.75 0 00-1.5 0v2.69l-3.22-3.22a.75.75 0 10-1.06 1.06zM3.5 4.56l3.22 3.22a.75.75 0 001.06-1.06L4.56 3.5h2.69a.75.75 0 000-1.5h-4.5a.75.75 0 00-.75.75v4.5a.75.75 0 001.5 0V4.56z" />
              </svg>
              Expand
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className={`absolute inset-0 bg-gradient-to-br from-surface to-surface-raised ${activeTab === 'graph' ? 'block' : 'hidden'}`}>
          <AutomatonGraph
            ref={graphRef}
            automaton={automaton}
            highlightStates={effectiveHighlightStates}
            highlightEdges={effectiveHighlightEdges}
          />
          {/* Legend — state-semantic tokens must match the Cytoscape graph exactly.
              The bridge in styles.ts reads --color-state-* via getComputedStyle;
              these swatches read the same variables via Tailwind utilities.
              This is the no-drift contract: same token = same color in graph + legend. */}
          <div className="absolute bottom-4 left-4 p-3 bg-surface/95 backdrop-blur-sm border border-border rounded-xl shadow-lg text-xs">
            <div className="font-bold text-text-mid mb-2 uppercase tracking-wider text-[10px]">Legend</div>
            <div className="space-y-1.5">
              {/* Start — blue; non-color cue: incoming arrow glyph */}
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border-[3px] border-state-start bg-state-start-soft"></div>
                <span className="text-text-mid">Start State</span>
              </div>
              {/* Accept — green; non-color cue: double ring (border-double) */}
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border-[4px] border-double border-state-accept bg-state-accept-soft"></div>
                <span className="text-text-mid">Accept State</span>
              </div>
              {/* Trap — mauve; non-color cue: dashed stroke + dimmed fill */}
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border-[2px] border-dashed border-state-trap bg-state-trap-soft opacity-80"></div>
                <span className="text-text-mid">Trap State</span>
              </div>
              {/* Active (simulation) — amber; non-color cue: thicker stroke
                  (border-[3px], matching the graph's border-width: 3 active node).
                  The ring halo stays for visual punch but the thicker border is the cue. */}
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border-[3px] border-state-active bg-state-active-soft ring-2 ring-state-active/40"></div>
                <span className="text-text-mid">Active (Simulation)</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`h-full overflow-auto ${activeTab === 'graph' ? 'hidden' : 'block'}`}>
          {activeTab === 'table' && (
            <div className="p-6">
              <TransitionTable
                automaton={automaton}
                highlightState={highlightStates[0]}
              />
            </div>
          )}

          {activeTab === 'states' && (
             <div className="p-6">
               <StateList automaton={automaton} highlightStates={highlightStates} simulationResult={simulationResult} />
             </div>
          )}

          {activeTab === 'info' && (
            <div className="p-8 max-w-2xl mx-auto space-y-8">
              <div className="grid grid-cols-2 gap-6">
                {/* Stat cards — brand chrome, not state-semantic */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-tint to-transparent border border-border text-center hover:border-border-strong transition-all">
                   <div className="text-xs font-bold text-text-low uppercase tracking-widest mb-3">Total States</div>
                   <div className="text-5xl font-display font-black text-brand-hover">{automaton.states.length}</div>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-tint to-transparent border border-border text-center hover:border-border-strong transition-all">
                   <div className="text-xs font-bold text-text-low uppercase tracking-widest mb-3">Total Transitions</div>
                   <div className="text-5xl font-display font-black text-brand-hover">{automaton.transitions.length}</div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  {/* Start State role label — uses state-semantic token, not brand */}
                  <h4 className="text-sm font-bold text-text-mid uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-state-start rounded-full"></div>
                    Start State
                  </h4>
                  <div className="inline-flex items-center px-4 py-2 bg-state-start-soft border-2 border-state-start/30 rounded-xl font-mono text-state-start font-bold shadow-inner">
                    {automaton.startState}
                  </div>
                </div>

                <div>
                  {/* Accept States role label — uses state-semantic token */}
                  <h4 className="text-sm font-bold text-text-mid uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-state-accept rounded-full"></div>
                    Accept States
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {automaton.acceptStates.map(state => (
                      <div key={state} className="inline-flex items-center px-4 py-2 bg-state-accept-soft border-2 border-state-accept/30 rounded-xl font-mono text-state-accept font-bold shadow-inner">
                        {state}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  {/* Alphabet — neutral chrome, symbols are not a state role */}
                  <h4 className="text-sm font-bold text-text-mid uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-border-strong rounded-full"></div>
                    Alphabet
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {Array.from(automaton.alphabet).map(symbol => (
                      <div key={symbol} className="inline-flex items-center w-10 h-10 justify-center bg-surface-raised border-2 border-border rounded-xl font-mono text-text-hi font-bold shadow-inner">
                        {symbol}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {automaton && (
        <>
          <SimulationModal
            automaton={automaton}
            mode={mode}
            isOpen={isSimulationModalOpen}
            onClose={handleCloseModal}
            onHighlightChange={handleModalHighlightChange}
          />

          {/* Expand Modal for Table and States */}
          {isExpandModalOpen && (
            <div
              className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-md"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setIsExpandModalOpen(false)
                }
              }}
            >
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border bg-surface/80 backdrop-blur-sm shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full bg-brand shadow-sm"></div>
                    <h2 className="text-2xl font-display font-bold text-text-hi">
                      {activeTab === 'table' ? 'Transition Table' : 'State List'}
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsExpandModalOpen(false)}
                    className="cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-text-mid hover:text-text-hi hover:bg-surface-raised transition-all hover:scale-110"
                    title="Close (Esc)"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-6 h-6"
                    >
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-8">
                  <div className="max-w-7xl mx-auto">
                    {activeTab === 'table' && (
                      <TransitionTable
                        automaton={automaton}
                        highlightState={highlightStates[0]}
                      />
                    )}

                    {activeTab === 'states' && (
                      <StateList
                        automaton={automaton}
                        highlightStates={highlightStates}
                        simulationResult={simulationResult}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
