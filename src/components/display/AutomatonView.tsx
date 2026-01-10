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
      <div className="flex flex-col h-full bg-surface0 rounded-lg p-4">
        <h2 className="text-xl font-bold text-text mb-4">{title}</h2>
        <div className="p-4 bg-red/10 border border-red rounded text-red">
          {error}
        </div>
      </div>
    )
  }

  if (!automaton) {
    return (
      <div className="flex flex-col h-full bg-surface0 rounded-lg p-4">
        <h2 className="text-xl font-bold text-text mb-4">{title}</h2>
        <div className="flex items-center justify-center h-full text-subtext0">
          Enter a regex to visualize the {title.toLowerCase()}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-surface0 rounded-lg overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <h2 className="text-xl font-bold text-text">{title}</h2>
          {activeTab === 'graph' && (
            <div className="flex gap-2">
              <Button
                label="PNG"
                onClick={handleExportPNG}
                variant="secondary"
              />
              <Button
                label="SVG"
                onClick={handleExportSVG}
                variant="secondary"
              />
            </div>
          )}
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="flex-1 p-4 overflow-auto">
        {activeTab === 'graph' && (
          <div className="w-full h-full min-h-[400px] bg-base rounded border border-overlay0">
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
          <div className="space-y-3 text-text">
            <div>
              <span className="font-semibold text-subtext0">States:</span>{' '}
              {automaton.states.length}
            </div>
            <div>
              <span className="font-semibold text-subtext0">Transitions:</span>{' '}
              {automaton.transitions.length}
            </div>
            <div>
              <span className="font-semibold text-subtext0">Start State:</span>{' '}
              <code className="px-2 py-1 bg-surface1 rounded text-blue">
                {automaton.startState}
              </code>
            </div>
            <div>
              <span className="font-semibold text-subtext0">Accept States:</span>{' '}
              <span className="inline-flex gap-2 flex-wrap">
                {automaton.acceptStates.map(state => (
                  <code key={state} className="px-2 py-1 bg-surface1 rounded text-green">
                    {state}
                  </code>
                ))}
              </span>
            </div>
            <div>
              <span className="font-semibold text-subtext0">Alphabet:</span>{' '}
              <span className="inline-flex gap-2 flex-wrap">
                {Array.from(automaton.alphabet).map(symbol => (
                  <code key={symbol} className="px-2 py-1 bg-surface1 rounded text-yellow">
                    {symbol}
                  </code>
                ))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
