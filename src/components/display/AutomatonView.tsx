import { useState, useRef } from 'react'
import { Automaton } from '@/core/automata/types'
import { AutomatonGraph, AutomatonGraphHandle } from '@/visualization/renderer'
import { Tabs } from '../common/Tabs'
import { TransitionTable } from './TransitionTable'
import { StateList } from './StateList'
import { Button } from '../common/Button'
import { exportAsPNG, exportAsSVG } from '@/visualization/export'

interface AutomatonViewProps {
  automaton: Automaton | null
  title: string
  error?: string
  highlightStates?: string[]
  highlightEdges?: string[]
}

export function AutomatonView({
  automaton,
  title,
  error,
  highlightStates = [],
  highlightEdges = [],
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
      const filename = `${title.toLowerCase().replace(/\s+/g, '-')}.png`
      exportAsPNG(cy, filename)
    }
  }

  const handleExportSVG = () => {
    const cy = graphRef.current?.getCytoscapeInstance()
    if (cy) {
      const filename = `${title.toLowerCase().replace(/\s+/g, '-')}.svg`
      exportAsSVG(cy, filename)
    }
  }

  if (error) {
    return (
      <figure className="flex flex-col h-full bg-parchment border-2 border-border rounded-sm p-6 shadow-sm">
        <figcaption className="mb-4">
          <h2 className="text-2xl font-display font-bold text-ink">{title}</h2>
        </figcaption>
        <div className="p-4 bg-terracotta/10 border-l-4 border-terracotta rounded-sm">
          <p className="text-terracotta-dark font-medium">{error}</p>
        </div>
      </figure>
    )
  }

  if (!automaton) {
    return (
      <figure className="flex flex-col h-full bg-parchment border-2 border-border rounded-sm p-6 shadow-sm">
        <figcaption className="mb-4">
          <h2 className="text-2xl font-display font-bold text-ink">{title}</h2>
        </figcaption>
        <div className="flex items-center justify-center h-full text-ink-lighter italic text-lg">
          Enter a regex to visualize the {title.toLowerCase()}
        </div>
      </figure>
    )
  }

  return (
    <figure className="flex flex-col h-full bg-parchment border-2 border-border rounded-sm overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <figcaption className="px-6 pt-6 pb-4 border-b-2 border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-2xl font-display font-bold text-ink leading-tight">
            {title}
          </h2>
          {activeTab === 'graph' && (
            <div className="flex gap-2">
              <button
                onClick={handleExportPNG}
                className="px-4 py-2 text-sm font-medium text-ink-light hover:text-ink border border-border hover:border-border-dark rounded-sm transition-all"
              >
                Export PNG
              </button>
              <button
                onClick={handleExportSVG}
                className="px-4 py-2 text-sm font-medium text-ink-light hover:text-ink border border-border hover:border-border-dark rounded-sm transition-all"
              >
                Export SVG
              </button>
            </div>
          )}
        </div>
      </figcaption>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="flex-1 p-6 overflow-auto bg-paper">
        {activeTab === 'graph' && (
          <div className="w-full h-full min-h-[400px] bg-canvas rounded-sm border-2 border-border shadow-inner">
            <AutomatonGraph
              ref={graphRef}
              automaton={automaton}
              highlightStates={highlightStates}
              highlightEdges={highlightEdges}
            />
          </div>
        )}

        {activeTab === 'table' && (
          <TransitionTable
            automaton={automaton}
            highlightState={highlightStates[0]}
          />
        )}

        {activeTab === 'states' && (
          <StateList automaton={automaton} highlightStates={highlightStates} />
        )}

        {activeTab === 'info' && (
          <div className="space-y-5 text-ink">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink-lighter uppercase tracking-wide">States</span>
              <span className="text-3xl font-display font-bold text-teal">{automaton.states.length}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink-lighter uppercase tracking-wide">Transitions</span>
              <span className="text-3xl font-display font-bold text-teal">{automaton.transitions.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink-lighter uppercase tracking-wide">Start State</span>
              <code className="px-3 py-2 bg-teal/10 border-l-4 border-teal rounded-sm font-mono text-teal-dark inline-block">
                {automaton.startState}
              </code>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink-lighter uppercase tracking-wide">Accept States</span>
              <div className="flex gap-2 flex-wrap">
                {automaton.acceptStates.map(state => (
                  <code key={state} className="px-3 py-2 bg-terracotta/10 border-l-4 border-terracotta rounded-sm font-mono text-terracotta-dark">
                    {state}
                  </code>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink-lighter uppercase tracking-wide">Alphabet</span>
              <div className="flex gap-2 flex-wrap">
                {Array.from(automaton.alphabet).map(symbol => (
                  <code key={symbol} className="px-3 py-2 bg-ochre/20 border-l-4 border-ochre rounded-sm font-mono text-ochre-dark">
                    {symbol}
                  </code>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </figure>
  )
}
