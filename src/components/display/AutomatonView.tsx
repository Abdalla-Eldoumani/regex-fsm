import { useState, useRef } from 'react'
import { Automaton } from '@/core/automata/types'
import { SimulationResult } from '@/core/algorithms/simulate'
import { AutomatonGraph, AutomatonGraphHandle } from '@/visualization/renderer'
import { Tabs } from '../common/Tabs'
import { TransitionTable } from './TransitionTable'
import { StateList } from './StateList'
import { exportAsPNG, exportAsSVG } from '@/visualization/export'

interface AutomatonViewProps {
  automaton: Automaton | null
  title: string
  error?: string
  highlightStates?: string[]
  highlightEdges?: string[]
  simulationResult?: SimulationResult | null
}

export function AutomatonView({
  automaton,
  error,
  highlightStates = [],
  highlightEdges = [],
  simulationResult = null,
}: AutomatonViewProps) {
  const [activeTab, setActiveTab] = useState('graph')
  const graphRef = useRef<AutomatonGraphHandle>(null)

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
      <div className="px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-surface/80 backdrop-blur-md sticky top-0 z-10">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'graph' && (
          <div className="flex gap-2">
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
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className={`absolute inset-0 bg-gradient-to-br from-surface to-surface-hover ${activeTab === 'graph' ? 'block' : 'hidden'}`}>
          <AutomatonGraph
            ref={graphRef}
            automaton={automaton}
            highlightStates={highlightStates}
            highlightEdges={highlightEdges}
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
    </div>
  )
}
