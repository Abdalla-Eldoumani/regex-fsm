import { useState, useEffect } from 'react'
import { parse } from '@/core/regex/parser'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateNFA, simulateDFA, SimulationResult } from '@/core/algorithms/simulate'
import { NFA, DFA } from '@/core/automata/types'
import { RegexInput } from './input/RegexInput'
import { StringInput } from './input/StringInput'
import { PatternBuilder } from './input/PatternBuilder'
import { AutomatonView } from './display/AutomatonView'
import { SimulationPanel } from './simulation/SimulationPanel'

function App() {
  const [regex, setRegex] = useState('')
  const [alphabet, setAlphabet] = useState('')
  const [testString, setTestString] = useState('')
  const [nfa, setNfa] = useState<NFA | null>(null)
  const [dfa, setDfa] = useState<DFA | null>(null)
  const [error, setError] = useState<string>('')
  const [simulationMode, setSimulationMode] = useState<'nfa' | 'dfa'>('nfa')
  const [nfaHighlightStates, setNfaHighlightStates] = useState<string[]>([])
  const [dfaHighlightStates, setDfaHighlightStates] = useState<string[]>([])
  const [nfaHighlightEdges, setNfaHighlightEdges] = useState<string[]>([])
  const [dfaHighlightEdges, setDfaHighlightEdges] = useState<string[]>([])
  const [nfaSimResult, setNfaSimResult] = useState<SimulationResult | null>(null)
  const [dfaSimResult, setDfaSimResult] = useState<SimulationResult | null>(null)

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

      let effectiveAlphabet: Set<string> | undefined
      if (alphabet.trim()) {
        effectiveAlphabet = new Set(alphabet.trim().split(''))
      } else {
        effectiveAlphabet = new Set(generatedNfa.alphabet)
        if (testString) {
          for (const char of testString) {
            effectiveAlphabet.add(char)
          }
        }
      }

      const generatedDfa = nfaToDFA(generatedNfa, effectiveAlphabet)

      setNfa(generatedNfa)
      setDfa(generatedDfa)
      setError('')
    } catch (err) {
      setNfa(null)
      setDfa(null)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    }
  }, [regex, alphabet, testString])

  useEffect(() => {
    if (!nfa || testString === null || testString === undefined) {
      setNfaSimResult(null)
      return
    }

    try {
      const result = simulateNFA(nfa, testString)
      setNfaSimResult(result)
    } catch {
      setNfaSimResult(null)
    }
  }, [nfa, testString])

  useEffect(() => {
    if (!dfa || testString === null || testString === undefined) {
      setDfaSimResult(null)
      return
    }

    try {
      const result = simulateDFA(dfa, testString)
      setDfaSimResult(result)
    } catch {
      setDfaSimResult(null)
    }
  }, [dfa, testString])

  const handlePatternInsert = (pattern: string) => {
    setRegex(pattern)
  }

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 relative z-10">

        <section className="bg-surface/80 backdrop-blur-md rounded-3xl shadow-hard border border-border hover:border-border-hover transition-all duration-300 p-8 md:p-10 animate-slide-up group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start relative">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                  <h2 className="text-xl font-display font-bold text-text-primary">Pattern</h2>
                </div>
                <p className="text-sm text-text-secondary mb-5 ml-3.5">Enter a regular expression to generate the automata.</p>
                <div className="space-y-4">
                  <PatternBuilder onInsert={handlePatternInsert} />
                  <RegexInput value={regex} onChange={setRegex} alphabet={alphabet} onAlphabetChange={setAlphabet} error={error} />
                </div>
              </div>
            </div>
            <div className="space-y-6">
               <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-secondary to-primary rounded-full"></div>
                  <h2 className="text-xl font-display font-bold text-text-primary">Test String</h2>
                </div>
                <p className="text-sm text-text-secondary mb-5 ml-3.5">Simulate how the machine processes input.</p>
                <StringInput value={testString} onChange={setTestString} />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface/80 backdrop-blur-md rounded-3xl shadow-hard border border-border overflow-hidden animate-slide-up animate-delay-200 hover:border-border-hover transition-all duration-300">
           <div className="border-b border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 relative">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-50"></div>
             <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-accent to-accent-secondary rounded-full"></div>
                  <h2 className="text-xl font-display font-bold text-text-primary">Simulation</h2>
                </div>
                <p className="text-sm text-text-secondary ml-3.5">Step through the state transitions.</p>
             </div>
             <div className="flex p-1.5 bg-background/60 rounded-xl border border-border shadow-inner relative backdrop-blur-sm">
                <button
                  onClick={() => setSimulationMode('nfa')}
                  className={`cursor-pointer px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    simulationMode === 'nfa'
                      ? 'bg-gradient-to-br from-primary to-primary-hover shadow-lg text-background ring-2 ring-primary/50 scale-105'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  NFA Simulation
                </button>
                <button
                  onClick={() => setSimulationMode('dfa')}
                  className={`cursor-pointer px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    simulationMode === 'dfa'
                      ? 'bg-gradient-to-br from-secondary to-secondary-hover shadow-lg text-background ring-2 ring-secondary/50 scale-105'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  DFA Simulation
                </button>
             </div>
           </div>

           <div className="p-6 md:p-8 bg-gradient-to-b from-transparent to-background/30">
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
          <article className="bg-surface/80 backdrop-blur-md rounded-3xl shadow-hard border border-border overflow-hidden flex flex-col h-[700px] transition-all duration-300 hover:border-primary/50 hover:shadow-glow-primary group">
            <div className="p-5 border-b border-border bg-gradient-to-r from-primary/20 via-primary/10 to-transparent flex justify-between items-center backdrop-blur-sm relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <h3 className="font-display font-bold text-text-primary flex items-center gap-3 relative z-10">
                 <span className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50 animate-pulse"></span>
                 <span className="text-lg">Nondeterministic Finite Automaton</span>
               </h3>
               <span className="text-xs font-mono px-3 py-1.5 rounded-full bg-primary/20 border border-primary/40 text-primary font-bold shadow-inner relative z-10">NFA</span>
            </div>
            <div className="flex-1 relative bg-gradient-to-br from-background to-background-secondary">
              <AutomatonView
                automaton={nfa}
                title=""
                error={error}
                mode="nfa"
                highlightStates={simulationMode === 'nfa' ? nfaHighlightStates : []}
                highlightEdges={simulationMode === 'nfa' ? nfaHighlightEdges : []}
                simulationResult={simulationMode === 'nfa' ? nfaSimResult : null}
              />
            </div>
          </article>

          <article className="bg-surface/80 backdrop-blur-md rounded-3xl shadow-hard border border-border overflow-hidden flex flex-col h-[700px] transition-all duration-300 hover:border-secondary/50 hover:shadow-glow-secondary group">
             <div className="p-5 border-b border-border bg-gradient-to-r from-secondary/20 via-secondary/10 to-transparent flex justify-between items-center backdrop-blur-sm relative">
               <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <h3 className="font-display font-bold text-text-primary flex items-center gap-3 relative z-10">
                  <span className="w-3 h-3 rounded-full bg-secondary shadow-lg shadow-secondary/50 animate-pulse" style={{ animationDelay: '0.5s' }}></span>
                  <span className="text-lg">Deterministic Finite Automaton</span>
               </h3>
               <span className="text-xs font-mono px-3 py-1.5 rounded-full bg-secondary/20 border border-secondary/40 text-secondary font-bold shadow-inner relative z-10">DFA</span>
            </div>
            <div className="flex-1 relative bg-gradient-to-br from-background to-background-secondary">
              <AutomatonView
                automaton={dfa}
                title=""
                error={error}
                mode="dfa"
                highlightStates={simulationMode === 'dfa' ? dfaHighlightStates : []}
                highlightEdges={simulationMode === 'dfa' ? dfaHighlightEdges : []}
                simulationResult={simulationMode === 'dfa' ? dfaSimResult : null}
              />
            </div>
          </article>
        </section>

        {nfa && dfa && (
          <section className="animate-slide-up animate-delay-400">
             <div className="bg-surface/80 backdrop-blur-md rounded-3xl shadow-hard border border-border p-8 md:p-10 hover:border-border-hover transition-all duration-300">
               <div className="flex items-center gap-2 mb-8">
                 <div className="w-1.5 h-6 bg-gradient-to-b from-success to-accent rounded-full"></div>
                 <h3 className="text-xl font-display font-bold text-text-primary">Automaton Statistics</h3>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <StatCard label="NFA States" value={nfa.states.length} color="text-primary" gradient="from-primary/20 to-primary/5" />
                  <StatCard label="NFA Transitions" value={nfa.transitions.length} color="text-primary" gradient="from-primary/20 to-primary/5" />
                  <StatCard label="DFA States" value={dfa.states.length} color="text-secondary" gradient="from-secondary/20 to-secondary/5" />
                  <StatCard label="DFA Transitions" value={dfa.transitions.length} color="text-secondary" gradient="from-secondary/20 to-secondary/5" />
               </div>
             </div>
          </section>
        )}
      </main>

      <footer className="mt-16 py-10 border-t border-border bg-surface/50 backdrop-blur-md relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-text-tertiary">
            Designed for educational purposes. Visualizing Formal Language Theory.
          </p>
          <div className="mt-4 flex justify-center items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-primary animate-pulse"></div>
            <div className="w-1 h-1 rounded-full bg-secondary animate-pulse" style={{ animationDelay: '0.3s' }}></div>
            <div className="w-1 h-1 rounded-full bg-accent animate-pulse" style={{ animationDelay: '0.6s' }}></div>
          </div>
        </div>
      </footer>
    </>
  )
}

function StatCard({ label, value, color, gradient }: { label: string, value: number, color: string, gradient: string }) {
  return (
    <div className={`p-6 rounded-2xl bg-gradient-to-br ${gradient} border border-border hover:border-border-bright transition-all group hover:shadow-lg hover:scale-105 duration-300`}>
      <div className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-3">{label}</div>
      <div className={`text-4xl font-mono font-black ${color} group-hover:scale-110 transition-transform origin-left`}>
        {value}
      </div>
    </div>
  )
}

export default App
