import { useState, useEffect } from 'react'
import { parse } from '@/core/regex/parser'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { NFA, DFA } from '@/core/automata/types'
import { RegexInput } from './input/RegexInput'
import { StringInput } from './input/StringInput'
import { AutomatonView } from './display/AutomatonView'
import { SimulationPanel } from './simulation/SimulationPanel'
import { Button } from './common/Button'

function App() {
  const [regex, setRegex] = useState('')
  const [testString, setTestString] = useState('')
  const [nfa, setNfa] = useState<NFA | null>(null)
  const [dfa, setDfa] = useState<DFA | null>(null)
  const [error, setError] = useState<string>('')
  const [simulationMode, setSimulationMode] = useState<'nfa' | 'dfa'>('nfa')
  const [nfaHighlightStates, setNfaHighlightStates] = useState<string[]>([])
  const [dfaHighlightStates, setDfaHighlightStates] = useState<string[]>([])
  const [nfaHighlightEdges, setNfaHighlightEdges] = useState<string[]>([])
  const [dfaHighlightEdges, setDfaHighlightEdges] = useState<string[]>([])

  useEffect(() => {
    if (!regex) {
      setNfa(null)
      setDfa(null)
      setError('')
      return
    }

    try {
      const ast = parse(regex)
      const generatedNfa = buildNFA(ast)
      const generatedDfa = nfaToDFA(generatedNfa)

      setNfa(generatedNfa)
      setDfa(generatedDfa)
      setError('')
    } catch (err) {
      setNfa(null)
      setDfa(null)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    }
  }, [regex])

  return (
    <div className="min-h-screen bg-base text-text">
      <header className="border-b border-surface0 bg-mantle">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-blue">RegexFSM</h1>
          <p className="text-sm text-subtext0 mt-1">
            Regular Expression and Finite State Machine Visualizer
          </p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <RegexInput value={regex} onChange={setRegex} error={error} />
          <StringInput value={testString} onChange={setTestString} />
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-surface0 rounded-lg">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium text-text">Simulate:</span>
              <div className="flex gap-2">
                <Button
                  label="NFA"
                  onClick={() => setSimulationMode('nfa')}
                  variant={simulationMode === 'nfa' ? 'primary' : 'secondary'}
                />
                <Button
                  label="DFA"
                  onClick={() => setSimulationMode('dfa')}
                  variant={simulationMode === 'dfa' ? 'primary' : 'secondary'}
                />
              </div>
            </div>

            {simulationMode === 'nfa' && (
              <SimulationPanel
                automaton={nfa}
                input={testString}
                mode="nfa"
                onHighlightChange={(states, edges) => {
                  setNfaHighlightStates(states)
                  setNfaHighlightEdges(edges)
                }}
              />
            )}

            {simulationMode === 'dfa' && (
              <SimulationPanel
                automaton={dfa}
                input={testString}
                mode="dfa"
                onHighlightChange={(states, edges) => {
                  setDfaHighlightStates(states)
                  setDfaHighlightEdges(edges)
                }}
              />
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="h-[600px]">
              <AutomatonView
                automaton={nfa}
                title="NFA (Nondeterministic Finite Automaton)"
                error={error}
                highlightStates={simulationMode === 'nfa' ? nfaHighlightStates : []}
                highlightEdges={simulationMode === 'nfa' ? nfaHighlightEdges : []}
              />
            </div>

            <div className="h-[600px]">
              <AutomatonView
                automaton={dfa}
                title="DFA (Deterministic Finite Automaton)"
                error={error}
                highlightStates={simulationMode === 'dfa' ? dfaHighlightStates : []}
                highlightEdges={simulationMode === 'dfa' ? dfaHighlightEdges : []}
              />
            </div>
          </div>
        </div>

        {nfa && dfa && (
          <div className="mt-6 p-4 bg-surface0 rounded-lg">
            <h3 className="text-lg font-semibold text-text mb-2">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-subtext0">NFA States</div>
                <div className="text-2xl font-bold text-blue">{nfa.states.length}</div>
              </div>
              <div>
                <div className="text-subtext0">NFA Transitions</div>
                <div className="text-2xl font-bold text-blue">{nfa.transitions.length}</div>
              </div>
              <div>
                <div className="text-subtext0">DFA States</div>
                <div className="text-2xl font-bold text-green">{dfa.states.length}</div>
              </div>
              <div>
                <div className="text-subtext0">DFA Transitions</div>
                <div className="text-2xl font-bold text-green">{dfa.transitions.length}</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
