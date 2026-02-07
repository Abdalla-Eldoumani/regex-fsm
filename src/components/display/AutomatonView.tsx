import { useState, useRef, useCallback } from 'react'
import { Automaton } from '@/core/automata/types'
import { SimulationResult } from '@/core/algorithms/simulate'
import { AutomatonGraph, AutomatonGraphHandle } from '@/visualization/renderer'
import { Tabs } from '../common/Tabs'
import { TransitionTable } from './TransitionTable'
import { StateList } from './StateList'
import { SimulationModal } from '../simulation/SimulationModal'
import { exportAsPNG, exportAsSVG } from '@/visualization/export'

interface AutomatonViewProps {
  automaton: Automaton | null
  title: string
  error?: string
  highlightStates?: string[]
  highlightEdges?: string[]
  simulationResult?: SimulationResult | null
  mode?: 'nfa' | 'dfa'
}

export function AutomatonView({
  automaton,
  error,
  highlightStates = [],
  highlightEdges = [],
  simulationResult = null,
  mode = 'nfa',
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

  const handleExportPNG = () => {
    const cy = graphRef.current?.getCytoscapeInstance()
    if (cy) {
      const filename = `automaton.png`
      exportAsPNG(cy, filename)
    }
  }

  const handleExportSVG = () => {
    const cy = graphRef.current?.getCytoscapeInstance()
    if (cy) {
      const filename = `automaton.svg`
      exportAsSVG(cy, filename)
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
         <div className="max-w-md p-6 bg-error-light border border-error/30 text-error rounded-2xl text-sm font-semibold shadow-glow-error">
            {error}
         </div>
      </div>
    )
  }

  if (!automaton) {
    return (
      <div className="flex items-center justify-center h-full text-text-tertiary">
        <div className="text-center space-y-3">
           <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-surface-hover border border-border flex items-center justify-center">
             <svg className="w-10 h-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
             </svg>
           </div>
           <p className="text-xl font-bold text-text-secondary">No Automaton Generated</p>
           <p className="text-sm text-text-tertiary">Enter a valid regular expression to view the diagram.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-surface sticky top-0 z-10">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="flex gap-2">
          <button
            onClick={() => setIsSimulationModalOpen(true)}
            className="cursor-pointer px-4 py-2 text-xs font-semibold text-white bg-gradient-to-br from-primary to-primary-hover hover:from-primary-hover hover:to-primary border border-primary/50 rounded-lg transition-all shadow-sm hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
            Simulate
          </button>

          {activeTab === 'graph' && (
            <>
              <button
                onClick={handleExportPNG}
                className="cursor-pointer px-4 py-2 text-xs font-semibold text-text-secondary hover:text-primary border border-border hover:border-primary/50 bg-surface-hover hover:bg-surface-elevated rounded-lg transition-all shadow-sm hover:scale-105 active:scale-95"
              >
                PNG
              </button>
              <button
                onClick={handleExportSVG}
                className="cursor-pointer px-4 py-2 text-xs font-semibold text-text-secondary hover:text-secondary border border-border hover:border-secondary/50 bg-surface-hover hover:bg-surface-elevated rounded-lg transition-all shadow-sm hover:scale-105 active:scale-95"
              >
                SVG
              </button>
            </>
          )}

          {(activeTab === 'table' || activeTab === 'states') && (
            <button
              onClick={() => setIsExpandModalOpen(true)}
              className="cursor-pointer px-4 py-2 text-xs font-semibold text-text-secondary hover:text-accent border border-border hover:border-accent/50 bg-surface-hover hover:bg-surface-elevated rounded-lg transition-all shadow-sm hover:scale-105 active:scale-95 flex items-center gap-2"
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
        <div className={`absolute inset-0 bg-gradient-to-br from-surface to-surface-hover ${activeTab === 'graph' ? 'block' : 'hidden'}`}>
          <AutomatonGraph
            ref={graphRef}
            automaton={automaton}
            highlightStates={effectiveHighlightStates}
            highlightEdges={effectiveHighlightEdges}
          />
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
                <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 text-center hover:border-primary/40 transition-all">
                   <div className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-3">Total States</div>
                   <div className="text-5xl font-display font-black text-primary">{automaton.states.length}</div>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 text-center hover:border-secondary/40 transition-all">
                   <div className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-3">Total Transitions</div>
                   <div className="text-5xl font-display font-black text-secondary">{automaton.transitions.length}</div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                    Start State
                  </h4>
                  <div className="inline-flex items-center px-4 py-2 bg-primary/10 border-2 border-primary/30 rounded-xl font-mono text-primary font-bold shadow-inner">
                    {automaton.startState}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-success rounded-full"></div>
                    Accept States
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {automaton.acceptStates.map(state => (
                      <div key={state} className="inline-flex items-center px-4 py-2 bg-success/10 border-2 border-success/30 rounded-xl font-mono text-success font-bold shadow-inner">
                        {state}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-secondary rounded-full"></div>
                    Alphabet
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {Array.from(automaton.alphabet).map(symbol => (
                      <div key={symbol} className="inline-flex items-center w-10 h-10 justify-center bg-secondary/10 border-2 border-secondary/30 rounded-xl font-mono text-secondary font-bold shadow-inner">
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
              className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md animate-fade-in"
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
                    <div className="w-3 h-3 rounded-full bg-accent shadow-lg"></div>
                    <h2 className="text-2xl font-display font-bold text-text-primary">
                      {activeTab === 'table' ? 'Transition Table' : 'State List'}
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsExpandModalOpen(false)}
                    className="cursor-pointer w-10 h-10 flex items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all hover:scale-110"
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
