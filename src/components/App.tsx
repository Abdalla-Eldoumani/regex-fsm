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
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b-2 border-border-dark bg-gradient-to-b from-parchment to-paper">
        <div className="container mx-auto px-8 py-8 animate-fade-in">
          <div className="max-w-4xl">
            <h1 className="text-5xl md:text-6xl font-display font-bold text-ink leading-tight">
              RegexFSM
            </h1>
            <p className="text-lg text-ink-light mt-3 font-sans">
              A Visual Exploration of Regular Expressions and Finite State Machines
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-8 py-12 max-w-7xl">
        <section className="mb-16 animate-slide-up animate-delay-100">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <RegexInput value={regex} onChange={setRegex} error={error} />
            </div>
            <div>
              <StringInput value={testString} onChange={setTestString} />
            </div>
          </div>
        </section>

        <div className="space-y-12">
          <section className="animate-slide-up animate-delay-200">
            <div className="bg-parchment border-2 border-border rounded-sm p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
                <h2 className="text-2xl font-display font-semibold text-ink">
                  Simulation Mode
                </h2>
                <div className="flex gap-3">
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
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-slide-up animate-delay-300">
            <article className="h-[650px]">
              <AutomatonView
                automaton={nfa}
                title="NFA (Nondeterministic Finite Automaton)"
                error={error}
                highlightStates={simulationMode === 'nfa' ? nfaHighlightStates : []}
                highlightEdges={simulationMode === 'nfa' ? nfaHighlightEdges : []}
              />
            </article>

            <article className="h-[650px]">
              <AutomatonView
                automaton={dfa}
                title="DFA (Deterministic Finite Automaton)"
                error={error}
                highlightStates={simulationMode === 'dfa' ? dfaHighlightStates : []}
                highlightEdges={simulationMode === 'dfa' ? dfaHighlightEdges : []}
              />
            </article>
          </section>
        </div>

        {nfa && dfa && (
          <aside className="mt-16 animate-slide-up animate-delay-400">
            <div className="border-t-2 border-border-dark pt-8">
              <h3 className="text-2xl font-display font-semibold text-ink mb-6">
                Automaton Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="group">
                  <div className="text-sm font-medium text-ink-lighter uppercase tracking-wide mb-2">
                    NFA States
                  </div>
                  <div className="text-4xl font-display font-bold text-teal group-hover:text-teal-dark transition-colors">
                    {nfa.states.length}
                  </div>
                </div>
                <div className="group">
                  <div className="text-sm font-medium text-ink-lighter uppercase tracking-wide mb-2">
                    NFA Transitions
                  </div>
                  <div className="text-4xl font-display font-bold text-teal group-hover:text-teal-dark transition-colors">
                    {nfa.transitions.length}
                  </div>
                </div>
                <div className="group">
                  <div className="text-sm font-medium text-ink-lighter uppercase tracking-wide mb-2">
                    DFA States
                  </div>
                  <div className="text-4xl font-display font-bold text-terracotta group-hover:text-terracotta-dark transition-colors">
                    {dfa.states.length}
                  </div>
                </div>
                <div className="group">
                  <div className="text-sm font-medium text-ink-lighter uppercase tracking-wide mb-2">
                    DFA Transitions
                  </div>
                  <div className="text-4xl font-display font-bold text-terracotta group-hover:text-terracotta-dark transition-colors">
                    {dfa.transitions.length}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </main>

      <footer className="border-t border-border mt-20 py-8">
        <div className="container mx-auto px-8 text-center text-sm text-ink-lighter">
          <p>An educational tool for understanding formal language theory</p>
        </div>
      </footer>
    </div>
  )
}

export default App
