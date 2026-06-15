import { useState, useEffect } from 'react'
import { Automaton } from '@/core/automata/types'
import { SimulationPanel } from './SimulationPanel'
import { AutomatonGraph } from '@/visualization/renderer'

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing setState-in-effect; refactor under test in its owning phase (see .agent/TECH_DEBT.md)
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
    <div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface/80 backdrop-blur-sm shadow-lg">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${mode === 'nfa' ? 'bg-primary' : 'bg-secondary'} shadow-lg animate-pulse`}></div>
            <h2 className="text-2xl font-display font-bold text-text-primary">
              {mode === 'nfa' ? 'NFA' : 'DFA'} Simulation
            </h2>
          </div>
          <button
            onClick={onClose}
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
        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left side: Graph */}
            <div className="bg-surface/80 backdrop-blur-sm rounded-2xl border-2 border-border shadow-xl overflow-hidden">
              <div className={`p-4 border-b border-border bg-gradient-to-r ${mode === 'nfa' ? 'from-primary/10' : 'from-secondary/10'} via-transparent to-transparent`}>
                <h3 className="text-lg font-semibold text-text-primary">Automaton Graph</h3>
              </div>
              <div className="h-[calc(100%-64px)]">
                <AutomatonGraph
                  automaton={automaton}
                  highlightStates={highlightStates}
                  highlightEdges={highlightEdges}
                />
              </div>
            </div>

            {/* Right side: Simulation controls */}
            <div className="bg-surface/80 backdrop-blur-sm rounded-2xl border-2 border-border shadow-xl overflow-hidden flex flex-col">
              <div className={`p-4 border-b border-border bg-gradient-to-r ${mode === 'nfa' ? 'from-primary/10' : 'from-secondary/10'} via-transparent to-transparent`}>
                <h3 className="text-lg font-semibold text-text-primary">Simulation Controls</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                    Test String
                  </label>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full px-4 py-3 bg-background/80 backdrop-blur-sm border-2 rounded-xl font-mono text-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-4 transition-all shadow-inner border-border hover:border-border-hover focus:ring-primary/20 focus:border-primary shadow-primary/5"
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
