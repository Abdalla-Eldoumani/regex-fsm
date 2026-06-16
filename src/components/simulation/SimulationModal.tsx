import { useState, useEffect } from 'react'
import { Automaton } from '@/core/automata/types'
import { SimulationPanel } from './SimulationPanel'
import { AutomatonGraph } from '@/visualization/renderer'
import { GraphSummary } from '@/components/a11y'

interface SimulationModalProps {
  automaton: Automaton
  mode: 'nfa' | 'dfa'
  isOpen: boolean
  onClose: () => void
  onHighlightChange: (states: string[], edges: string[]) => void
}

export function SimulationModal({
  automaton,
  mode,
  isOpen,
  onClose,
  onHighlightChange,
}: SimulationModalProps) {
  const [input, setInput] = useState('')
  const [highlightStates, setHighlightStates] = useState<string[]>([])
  const [highlightEdges, setHighlightEdges] = useState<string[]>([])

  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing setState-in-effect; refactor under test in its owning phase
      setInput('')
      onHighlightChange([], [])
      setHighlightStates([])
      setHighlightEdges([])
    }
  }, [isOpen, onHighlightChange])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleHighlightChange = (states: string[], edges: string[]) => {
    setHighlightStates(states)
    setHighlightEdges(edges)
    onHighlightChange(states, edges)
  }

  return (
    /* bg-bg/95 backdrop so the scrim is dark but the modal card itself is surface-overlay */
    <div
      className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-md"
      onClick={handleBackdropClick}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface-overlay shadow-md">
          <div className="flex items-center gap-4">
            {/* mode indicator uses brand chrome, not a state color */}
            <div className="w-3 h-3 rounded-full bg-brand shadow-sm"></div>
            <h2 className="text-2xl font-display font-bold text-text-hi">
              {mode === 'nfa' ? 'NFA' : 'DFA'} Simulation
            </h2>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-text-low hover:text-text-hi hover:bg-surface-raised transition-all"
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
        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left side: Graph */}
            <div className="bg-surface rounded-lg border border-border shadow-md overflow-hidden">
              <div className="p-4 border-b border-border bg-surface-raised">
                <h3 className="text-lg font-semibold text-text-hi">Automaton Graph</h3>
              </div>
              <div className="h-[calc(100%-64px)]">
                <GraphSummary automaton={automaton} ariaLabel="State diagram">
                  <AutomatonGraph
                    automaton={automaton}
                    highlightStates={highlightStates}
                    highlightEdges={highlightEdges}
                  />
                </GraphSummary>
              </div>
            </div>

            {/* Right side: Simulation controls */}
            <div className="bg-surface rounded-lg border border-border shadow-md overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border bg-surface-raised">
                <h3 className="text-lg font-semibold text-text-hi">Simulation Controls</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-text-mid uppercase tracking-label mb-2">
                    Test String
                  </label>
                  {/* symbolic input field: font-mono for the test string */}
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full px-4 min-h-[44px] bg-surface-raised border border-border rounded-lg font-mono text-lg text-text-hi placeholder:text-text-low focus-visible:outline-none transition-all"
                    placeholder="Enter string to simulate..."
                    autoFocus
                  />
                </div>

                <SimulationPanel
                  automaton={automaton}
                  input={input}
                  mode={mode}
                  onHighlightChange={handleHighlightChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
