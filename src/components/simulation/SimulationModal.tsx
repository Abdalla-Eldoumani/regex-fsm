import { useState, useEffect } from 'react'
import { Automaton } from '@/core/automata/types'
import { SimulationPanel } from './SimulationPanel'

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

  useEffect(() => {
    if (!isOpen) {
      setInput('')
      onHighlightChange([], [])
    }
  }, [isOpen, onHighlightChange])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="bg-surface rounded-2xl shadow-2xl border border-border max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-primary/10 via-transparent to-secondary/10">
          <h3 className="text-xl font-display font-bold text-text-primary">
            {mode === 'nfa' ? 'NFA' : 'DFA'} Simulation
          </h3>
          <button
            onClick={onClose}
            className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="mb-4">
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
            onHighlightChange={onHighlightChange}
          />
        </div>
      </div>
    </div>
  )
}
