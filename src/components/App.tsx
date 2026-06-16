import { useState, useMemo, useCallback, useEffect } from 'react'
import { parse, buildNFA, nfaToDFA, minimizeDFA, asuDirectDFA, brzozowskiDFA } from '@/core/cachedAlgorithms'
import { simulateNFA, simulateDFA, SimulationResult } from '@/core/algorithms/simulate'
import { DFA, TooLargeError } from '@/core/automata/types'
import { TooLargeNotice } from './common/TooLargeNotice'
import { RegexInput } from './input/RegexInput'
import { StringInput } from './input/StringInput'
import { PatternBuilder } from './input/PatternBuilder'
import { AutomatonView } from './display/AutomatonView'
import { SimulationPanel } from './simulation/SimulationPanel'
import { Hero } from './Hero'

type ConstructionMethod = 'thompson' | 'asu' | 'brzozowski'

function App() {
  const [regex, setRegex] = useState('')
  const [alphabet, setAlphabet] = useState('')
  const [testString, setTestString] = useState('')
  const [simulationMode, setSimulationMode] = useState<'nfa' | 'dfa' | 'both'>('nfa')
  const [nfaHighlightStates, setNfaHighlightStates] = useState<string[]>([])
  const [dfaHighlightStates, setDfaHighlightStates] = useState<string[]>([])
  const [nfaHighlightEdges, setNfaHighlightEdges] = useState<string[]>([])
  const [dfaHighlightEdges, setDfaHighlightEdges] = useState<string[]>([])
  const [autoBuild, setAutoBuild] = useState(true)
  const [shouldMinimize, setShouldMinimize] = useState(true)
  const [useLetterNames, setUseLetterNames] = useState(false)
  const [constructionMethod, setConstructionMethod] = useState<ConstructionMethod>('thompson')

  // Debounced regex for heavy computation (300ms delay)
  const [debouncedRegex, setDebouncedRegex] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedRegex(regex), 300)
    return () => clearTimeout(timer)
  }, [regex])

  // Direct DFA state (for pattern builder direct construction)
  const [directDfa, setDirectDfa] = useState<DFA | null>(null)

  // Compute effective alphabet from inputs
  const effectiveAlphabet = useMemo(() => {
    if (alphabet.trim()) {
      return new Set(alphabet.trim().split(''))
    }
    return null // signal to derive from regex
  }, [alphabet])

  // Memoized automata computation
  const { nfa, dfa, error, tooLarge, constructionInfo } = useMemo(() => {
    const nulls = { nfa: null, dfa: null, error: '', tooLarge: null, constructionInfo: '' }

    // If we have a direct DFA (from pattern builder), use that
    if (directDfa) {
      return { nfa: null, dfa: directDfa, error: '', tooLarge: null, constructionInfo: 'Direct DFA construction (pattern builder)' }
    }

    if (!debouncedRegex || !autoBuild) {
      return nulls
    }

    try {
      const ast = parse(debouncedRegex)

      if (constructionMethod === 'thompson') {
        const generatedNfa = buildNFA(ast)

        let alphaSet: Set<string>
        if (effectiveAlphabet) {
          alphaSet = effectiveAlphabet
        } else {
          alphaSet = new Set(generatedNfa.alphabet)
          if (testString) {
            for (const char of testString) {
              alphaSet.add(char)
            }
          }
        }

        let generatedDfa = nfaToDFA(generatedNfa, alphaSet)
        if (shouldMinimize) {
          const minimized = minimizeDFA(generatedDfa, useLetterNames)
          generatedDfa = minimized.dfa
        }

        return { nfa: generatedNfa, dfa: generatedDfa, error: '', tooLarge: null, constructionInfo: "Thompson's Construction + Subset Construction" }
      }

      // Direct methods - compute alphabet from AST
      let alphaSet: Set<string>
      if (effectiveAlphabet) {
        alphaSet = effectiveAlphabet
      } else {
        alphaSet = new Set<string>()
        function collectAlpha(node: typeof ast): void {
          if (node.type === 'symbol') alphaSet.add(node.value)
          if ('left' in node && node.left) collectAlpha(node.left)
          if ('right' in node && node.right) collectAlpha(node.right)
          if ('child' in node && node.child) collectAlpha(node.child)
        }
        collectAlpha(ast)
        if (testString) {
          for (const char of testString) {
            alphaSet.add(char)
          }
        }
      }

      if (constructionMethod === 'asu') {
        const result = asuDirectDFA(ast, alphaSet)
        return { nfa: null, dfa: result.dfa, error: '', tooLarge: null, constructionInfo: result.description }
      }

      if (constructionMethod === 'brzozowski') {
        const result = brzozowskiDFA(ast, alphaSet)
        return { nfa: null, dfa: result.dfa, error: '', tooLarge: null, constructionInfo: result.description }
      }

      return nulls
    } catch (err) {
      // TooLargeError is surfaced via the shared notice, not the inline parse-error
      // box. Ordinary errors (parse failures, invalid regex) use the inline box.
      if (err instanceof TooLargeError) {
        return { ...nulls, tooLarge: { message: err.message, partial: err.partial } }
      }
      return {
        ...nulls,
        error: err instanceof Error ? err.message : 'Unknown error occurred',
      }
    }
  }, [debouncedRegex, testString, shouldMinimize, useLetterNames, autoBuild, directDfa, constructionMethod, effectiveAlphabet])

  // Memoized simulation results
  const nfaSimResult = useMemo<SimulationResult | null>(() => {
    if (!nfa || testString === null || testString === undefined) {
      return null
    }
    try {
      return simulateNFA(nfa, testString)
    } catch {
      return null
    }
  }, [nfa, testString])

  const dfaSimResult = useMemo<SimulationResult | null>(() => {
    if (!dfa || testString === null || testString === undefined) {
      return null
    }
    try {
      return simulateDFA(dfa, testString)
    } catch {
      return null
    }
  }, [dfa, testString])

  // Manual build function for non-auto mode
  const buildAutomata = useCallback(() => {
    if (!regex) return
    setDirectDfa(null)
    setDebouncedRegex(regex)
  }, [regex])

  // Memoized highlight handlers
  const handleNfaHighlightChange = useCallback((states: string[], edges: string[]) => {
    setNfaHighlightStates(states)
    setNfaHighlightEdges(edges)
  }, [])

  const handleDfaHighlightChange = useCallback((states: string[], edges: string[]) => {
    setDfaHighlightStates(states)
    setDfaHighlightEdges(edges)
  }, [])

  const handlePatternInsert = useCallback((pattern: string) => {
    setDirectDfa(null)
    setRegex(pattern)
  }, [])

  const isDirectMethod = constructionMethod !== 'thompson'

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 relative z-10">

        {/* The live-automaton signature, decorative (aria-hidden inside Hero).
            Shares the page gutter and the section rhythm of the views below. */}
        <section className="pt-2 pb-4">
          <Hero />
        </section>

        <section className="bg-surface rounded-3xl shadow-lg border border-border hover:border-border-strong transition-all duration-300 p-8 md:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start relative">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {/* Decorative accent bar — brand chrome, not a state color */}
                  <div className="w-1.5 h-6 bg-gradient-to-b from-brand to-brand-pressed rounded-full"></div>
                  <h2 className="text-xl font-display font-bold text-text-hi">Pattern</h2>
                </div>
                <p className="text-sm text-text-mid mb-5 ml-3.5">Enter a regular expression to generate the automata.</p>
                <div className="space-y-4">
                  <div>
                    <PatternBuilder onInsert={handlePatternInsert} />
                  </div>
                  <div>
                    <RegexInput value={regex} onChange={setRegex} alphabet={alphabet} onAlphabetChange={setAlphabet} error={error} />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
               <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-brand-hover to-brand rounded-full"></div>
                  <h2 className="text-xl font-display font-bold text-text-hi">Test String</h2>
                </div>
                <p className="text-sm text-text-mid mb-5 ml-3.5">Simulate how the machine processes input.</p>
                <StringInput value={testString} onChange={setTestString} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-brand-pressed to-brand rounded-full"></div>
                  <h2 className="text-xl font-display font-bold text-text-hi">Options</h2>
                </div>
                <p className="text-sm text-text-mid mb-5 ml-3.5">Configure automata generation.</p>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={autoBuild}
                      onChange={(e) => setAutoBuild(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-brand focus:ring-brand-hover/50 cursor-pointer"
                    />
                    <span className="text-sm text-text-mid group-hover:text-text-hi transition-colors">
                      Auto-build <span className="text-xs text-text-low">(build on regex change)</span>
                    </span>
                  </label>
                  {!autoBuild && (
                    <button
                      onClick={buildAutomata}
                      disabled={!regex}
                      className="min-h-[44px] px-4 py-2 bg-brand text-on-brand rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-hover transition-colors"
                    >
                      Build Automata
                    </button>
                  )}
                </div>

                {/* Construction Method Selector */}
                <div className="mt-4 p-4 bg-bg/50 rounded-xl border border-border space-y-3">
                  <div className="text-xs font-semibold text-text-mid uppercase tracking-wider">Construction Method</div>
                  <div className="flex flex-col gap-2">
                    {([
                      { value: 'thompson' as const, label: "Thompson + Subset", desc: 'Regex → NFA → DFA' },
                      { value: 'asu' as const, label: 'ASU (Syntax Tree)', desc: 'Regex → DFA (direct)' },
                      { value: 'brzozowski' as const, label: 'Brzozowski', desc: 'Regex → DFA (derivatives)' },
                    ] as const).map(({ value, label, desc }) => (
                      <label key={value} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="constructionMethod"
                          value={value}
                          checked={constructionMethod === value}
                          onChange={() => setConstructionMethod(value)}
                          className="w-4 h-4 border-border text-brand focus:ring-brand-hover/50 cursor-pointer"
                        />
                        <span className="text-sm text-text-mid group-hover:text-text-hi transition-colors">
                          {label} <span className="text-xs text-text-low">({desc})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-4 p-4 bg-bg/50 rounded-xl border border-border space-y-3">
                  <div className="text-xs font-semibold text-text-mid uppercase tracking-wider">DFA Options</div>
                  {constructionMethod === 'thompson' && (
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={shouldMinimize}
                        onChange={(e) => setShouldMinimize(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-brand focus:ring-brand-hover/50 cursor-pointer"
                      />
                      <span className="text-sm text-text-mid group-hover:text-text-hi transition-colors">
                        Minimize DFA <span className="text-xs text-text-low">(optimal states)</span>
                      </span>
                    </label>
                  )}
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={useLetterNames}
                      onChange={(e) => setUseLetterNames(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-brand focus:ring-brand-hover/50 cursor-pointer"
                    />
                    <span className="text-sm text-text-mid group-hover:text-text-hi transition-colors">
                      Use letter names <span className="text-xs text-text-low">(A, B, C vs q0, q1, q2)</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface rounded-3xl shadow-lg border border-border overflow-hidden hover:border-border-strong transition-all duration-300">
           <div className="border-b border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-brand-tint via-transparent to-brand-tint relative">
             <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-brand to-brand-pressed rounded-full"></div>
                  <h2 className="text-xl font-display font-bold text-text-hi">Simulation</h2>
                </div>
                <p className="text-sm text-text-mid ml-3.5">Step through the state transitions.</p>
             </div>
             <div className="flex p-1.5 bg-bg/60 rounded-xl border border-border shadow-inner relative">
                <button
                  onClick={() => setSimulationMode('nfa')}
                  disabled={isDirectMethod}
                  className={`cursor-pointer min-h-[44px] px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    simulationMode === 'nfa' && !isDirectMethod
                      ? 'bg-brand text-on-brand shadow-lg ring-2 ring-brand-hover/50 scale-105'
                      : 'text-text-mid hover:text-text-hi hover:bg-surface-raised'
                  } ${isDirectMethod ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  NFA
                </button>
                <button
                  onClick={() => setSimulationMode('dfa')}
                  className={`cursor-pointer min-h-[44px] px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    simulationMode === 'dfa' || (isDirectMethod && simulationMode !== 'both')
                      ? 'bg-brand text-on-brand shadow-lg ring-2 ring-brand-hover/50 scale-105'
                      : 'text-text-mid hover:text-text-hi hover:bg-surface-raised'
                  }`}
                >
                  DFA
                </button>
                <button
                  onClick={() => setSimulationMode('both')}
                  disabled={isDirectMethod}
                  className={`cursor-pointer min-h-[44px] px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    simulationMode === 'both' && !isDirectMethod
                      ? 'bg-brand text-on-brand shadow-lg ring-2 ring-brand-hover/50 scale-105'
                      : 'text-text-mid hover:text-text-hi hover:bg-surface-raised'
                  } ${isDirectMethod ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Both
                </button>
             </div>
           </div>

           <div className="p-6 md:p-8">
              {!isDirectMethod && simulationMode === 'nfa' && (
                <SimulationPanel
                  automaton={nfa}
                  input={testString}
                  mode="nfa"
                  onHighlightChange={handleNfaHighlightChange}
                />
              )}

              {(simulationMode === 'dfa' || (isDirectMethod && simulationMode !== 'both')) && (
                <SimulationPanel
                  automaton={dfa}
                  input={testString}
                  mode="dfa"
                  onHighlightChange={handleDfaHighlightChange}
                />
              )}

              {!isDirectMethod && simulationMode === 'both' && (
                <div className="text-center py-8 text-text-mid">
                  <p className="text-lg">Both automatons are displayed below. Use the simulation controls on each to step through independently.</p>
                </div>
              )}
           </div>
        </section>

        <section className={`grid gap-8 ${
          !isDirectMethod && simulationMode === 'both' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'
        }`}>
          {!isDirectMethod && (simulationMode === 'nfa' || simulationMode === 'both') && (
            <article className="bg-surface rounded-3xl shadow-lg border border-border overflow-hidden flex flex-col h-[700px] transition-all duration-300 hover:border-border-strong group">
              <div className="p-5 border-b border-border bg-gradient-to-r from-brand-tint to-transparent flex justify-between items-center relative">
                 <div className="relative z-10">
                   <h3 className="font-display font-bold text-text-hi flex items-center gap-3">
                     {/* Chrome dot — brand, not a state color */}
                     <span className="w-3 h-3 rounded-full bg-brand shadow-sm"></span>
                     <span className="text-lg">Nondeterministic Finite Automaton</span>
                   </h3>
                   <p className="text-xs font-mono text-text-low ml-6 mt-0.5">(Q, Σ, δ, q₀, A)</p>
                 </div>
                 <span className="text-xs font-mono px-3 py-1.5 rounded-full bg-brand-tint border border-border text-brand-hover font-bold shadow-inner relative z-10">NFA</span>
              </div>
              <div className="flex-1 relative bg-bg">
                <AutomatonView
                  automaton={nfa}
                  title=""
                  error={error}
                  mode="nfa"
                  highlightStates={simulationMode === 'nfa' || simulationMode === 'both' ? nfaHighlightStates : []}
                  highlightEdges={simulationMode === 'nfa' || simulationMode === 'both' ? nfaHighlightEdges : []}
                  simulationResult={simulationMode === 'nfa' || simulationMode === 'both' ? nfaSimResult : null}
                />
              </div>
            </article>
          )}

          {/* Show NFA "not applicable" message for direct methods when user was on NFA/Both mode */}
          {isDirectMethod && nfa === null && dfa && (simulationMode === 'nfa' || simulationMode === 'both') && (
            <article className="bg-surface rounded-3xl shadow-lg border border-border overflow-hidden flex flex-col h-[200px] transition-all duration-300">
              <div className="p-5 border-b border-border bg-gradient-to-r from-brand-tint to-transparent flex justify-between items-center">
                <h3 className="font-display font-bold text-text-hi flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-brand/50"></span>
                  <span className="text-lg">NFA</span>
                </h3>
              </div>
              <div className="flex-1 flex items-center justify-center text-text-mid p-8 text-center">
                <div>
                  <p className="text-lg font-semibold mb-2">No NFA Generated</p>
                  <p className="text-sm text-text-low">
                    Direct regex-to-DFA construction was used ({constructionMethod === 'asu' ? 'ASU syntax tree method' : "Brzozowski's derivatives"}).
                    No intermediate NFA is produced.
                  </p>
                </div>
              </div>
            </article>
          )}

          {(simulationMode === 'dfa' || simulationMode === 'both' || isDirectMethod) && (
            <article className="bg-surface rounded-3xl shadow-lg border border-border overflow-hidden flex flex-col h-[700px] transition-all duration-300 hover:border-border-strong group">
               <div className="p-5 border-b border-border bg-gradient-to-r from-brand-tint to-transparent flex justify-between items-center relative">
                 <div className="relative z-10">
                   <h3 className="font-display font-bold text-text-hi flex items-center gap-3">
                      {/* Chrome dot — brand, not a state color */}
                      <span className="w-3 h-3 rounded-full bg-brand shadow-sm"></span>
                      <span className="text-lg">Deterministic Finite Automaton</span>
                   </h3>
                   <p className="text-xs font-mono text-text-low ml-6 mt-0.5">(Q, Σ, δ, q₀, A)</p>
                 </div>
                 <div className="flex items-center gap-2 relative z-10">
                   {constructionInfo && (
                     <span className="text-[10px] font-medium text-text-low px-2 py-1 rounded-full bg-surface-raised border border-border">
                       {constructionMethod === 'thompson' ? 'Thompson+Subset' : constructionMethod === 'asu' ? 'ASU Direct' : 'Brzozowski'}
                     </span>
                   )}
                   <span className="text-xs font-mono px-3 py-1.5 rounded-full bg-brand-tint border border-border text-brand-hover font-bold shadow-inner">DFA</span>
                 </div>
              </div>
              <div className="flex-1 relative bg-bg">
                {tooLarge ? (
                  <div className="p-6">
                    <TooLargeNotice message={tooLarge.message} partial={tooLarge.partial} />
                  </div>
                ) : (
                  <AutomatonView
                    automaton={dfa}
                    title=""
                    error={error}
                    mode="dfa"
                    highlightStates={dfaHighlightStates}
                    highlightEdges={dfaHighlightEdges}
                    simulationResult={dfaSimResult}
                  />
                )}
              </div>
            </article>
          )}
        </section>

        {dfa && (
          <section>
             <div className="bg-surface rounded-3xl shadow-lg border border-border p-8 md:p-10 hover:border-border-strong transition-all duration-300">
               <div className="flex items-center gap-2 mb-8">
                 <div className="w-1.5 h-6 bg-gradient-to-b from-brand to-brand-pressed rounded-full"></div>
                 <h3 className="text-xl font-display font-bold text-text-hi">Automaton Statistics</h3>
               </div>
               <div className={`grid gap-6 ${nfa ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'}`}>
                  {nfa && (
                    <>
                      <StatCard label="NFA States" value={nfa.states.length} color="text-brand-hover" gradient="from-brand-tint to-transparent" />
                      <StatCard label="NFA Transitions" value={nfa.transitions.length} color="text-brand-hover" gradient="from-brand-tint to-transparent" />
                    </>
                  )}
                  <StatCard label="DFA States" value={dfa.states.length} color="text-brand-hover" gradient="from-brand-tint to-transparent" />
                  <StatCard label="DFA Transitions" value={dfa.transitions.length} color="text-brand-hover" gradient="from-brand-tint to-transparent" />
               </div>
             </div>
          </section>
        )}
      </main>

      <footer className="mt-16 py-10 border-t border-border bg-surface relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-text-low">
            Designed for educational purposes. Visualizing Formal Language Theory.
          </p>
          {/* Three chrome dots — brand ramp, not state colors */}
          <div className="mt-4 flex justify-center items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-brand"></div>
            <div className="w-1 h-1 rounded-full bg-brand-hover"></div>
            <div className="w-1 h-1 rounded-full bg-brand-pressed"></div>
          </div>
        </div>
      </footer>
    </>
  )
}

function StatCard({ label, value, color, gradient }: { label: string, value: number, color: string, gradient: string }) {
  return (
    <div className={`p-6 rounded-2xl bg-gradient-to-br ${gradient} border border-border hover:border-border-strong transition-all group hover:shadow-md hover:scale-105 duration-300`}>
      <div className="text-xs font-bold text-text-low uppercase tracking-widest mb-3">{label}</div>
      <div className={`text-4xl font-mono font-black ${color} group-hover:scale-110 transition-transform origin-left`}>
        {value}
      </div>
    </div>
  )
}

export default App
