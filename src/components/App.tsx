import { useState, useMemo, useCallback, useEffect } from 'react'
import { parse, buildNFA, nfaToDFA, minimizeDFA, asuDirectDFA, brzozowskiDFA } from '@/core/cachedAlgorithms'
import { simulateNFA, simulateDFA, SimulationResult } from '@/core/algorithms/simulate'
import { DFA, TooLargeError } from '@/core/automata/types'
import { decodeShareState, buildShareHash } from '@/share/shareCodec'
import { toShareState, applyShareState, type AppShareFields } from '@/share/shareState'
import { listSaved, saveCurrent, loadSaved, deleteSaved } from '@/share/savedLibrary'
import { TooLargeNotice } from './common/TooLargeNotice'
import { RegexInput } from './input/RegexInput'
import { StringInput } from './input/StringInput'
import { PatternBuilder } from './input/PatternBuilder'
import { AutomatonView } from './display/AutomatonView'
import { SimulationPanel } from './simulation/SimulationPanel'
import { FailClosedNotice } from './share/FailClosedNotice'
import { LoadedFromShareChip } from './share/LoadedFromShareChip'
import { LibraryDialog } from './share/LibraryDialog'
import { Hero } from './Hero'

type ConstructionMethod = 'thompson' | 'asu' | 'brzozowski'

// The default home scratchpad fields and the outcome of reading an incoming share
// hash. status drives the chip ('loaded') and the fail-closed banner ('failed').
interface InitialState {
  fields: AppShareFields
  status: 'none' | 'loaded' | 'failed'
}

const DEFAULT_FIELDS: AppShareFields = {
  regex: '',
  alphabet: '',
  testString: '',
  constructionMethod: 'thompson',
  shouldMinimize: true,
  useLetterNames: false,
}

// Read the incoming share hash ONCE and resolve the initial scratchpad. This is
// the only place that touches window.location.hash. It delegates all parsing to
// the fail-closed codec (decodeShareState never throws and returns null-or-valid):
// a valid regex document seeds the fields and marks the view loaded-from-share; a
// null decode, or an automaton document the home view cannot apply, leaves the
// safe default fields and flags the calm fail-closed banner. Reading at first
// render via a lazy useState initializer (not an effect) keeps a malformed hash
// from ever driving a setState-in-effect cascade and keeps the load synchronous.
function readInitialState(): InitialState {
  if (typeof window === 'undefined') return { fields: DEFAULT_FIELDS, status: 'none' }
  const match = /^#s=(.+)$/.exec(window.location.hash)
  if (!match) return { fields: DEFAULT_FIELDS, status: 'none' }
  const decoded = decodeShareState(match[1])
  if (decoded === null) return { fields: DEFAULT_FIELDS, status: 'failed' }
  const fields = applyShareState(decoded)
  if (fields === null) return { fields: DEFAULT_FIELDS, status: 'failed' }
  return { fields, status: 'loaded' }
}

function App() {
  // Resolve any incoming shared link exactly once, before the first paint.
  const [initial] = useState<InitialState>(readInitialState)

  const [regex, setRegex] = useState(initial.fields.regex)
  const [alphabet, setAlphabet] = useState(initial.fields.alphabet)
  const [testString, setTestString] = useState(initial.fields.testString)
  const [simulationMode, setSimulationMode] = useState<'nfa' | 'dfa' | 'both'>('nfa')
  const [nfaHighlightStates, setNfaHighlightStates] = useState<string[]>([])
  const [dfaHighlightStates, setDfaHighlightStates] = useState<string[]>([])
  const [nfaHighlightEdges, setNfaHighlightEdges] = useState<string[]>([])
  const [dfaHighlightEdges, setDfaHighlightEdges] = useState<string[]>([])
  const [autoBuild, setAutoBuild] = useState(true)
  const [shouldMinimize, setShouldMinimize] = useState(initial.fields.shouldMinimize)
  const [useLetterNames, setUseLetterNames] = useState(initial.fields.useLetterNames)
  const [constructionMethod, setConstructionMethod] = useState<ConstructionMethod>(initial.fields.constructionMethod)

  // Share / load-from-hash state (SHARE-01/02). loadError drives the fail-closed
  // banner; loadedFromShare drives the loaded-from-a-shared-link chip. Both are
  // dismissible and, once dismissed, do not reappear within the session. They are
  // seeded from the one-time hash read so no effect-setState cascade is needed.
  const [loadError, setLoadError] = useState(initial.status === 'failed')
  const [loadedFromShare, setLoadedFromShare] = useState(initial.status === 'loaded')
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)

  // Direct DFA state (for pattern builder direct construction). Declared before
  // the callbacks that call setDirectDfa so the compiler can preserve their
  // memoization (a setter referenced before its declaration breaks the chain).
  const [directDfa, setDirectDfa] = useState<DFA | null>(null)

  // Debounced regex for heavy computation (300ms delay). Seeded from the resolved
  // initial regex so a shared link builds its automata on the first pass.
  const [debouncedRegex, setDebouncedRegex] = useState(initial.fields.regex)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedRegex(regex), 300)
    return () => clearTimeout(timer)
  }, [regex])

  // After the one-time read, strip the payload from the address bar without a
  // navigation so a refresh starts clean and the hash is not mistaken for live
  // state. This effect performs no setState, so it does not trigger a re-render.
  useEffect(() => {
    if (initial.status === 'none') return
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [initial.status])

  // Apply a validated ShareState to the home scratchpad. The codec has already run
  // the full fail-closed validation, so this only maps the regex-document fields
  // back onto App state (an automaton document returns null from applyShareState
  // and is not applied here). Used by the Library load path. Decoded values flow
  // through React state and text interpolation only, never an HTML sink (T-12-15).
  const applyShared = useCallback((state: ReturnType<typeof decodeShareState>): boolean => {
    if (state === null) return false
    const fields = applyShareState(state)
    if (fields === null) return false
    setDirectDfa(null)
    setRegex(fields.regex)
    setDebouncedRegex(fields.regex)
    setAlphabet(fields.alphabet)
    setTestString(fields.testString)
    setConstructionMethod(fields.constructionMethod)
    setShouldMinimize(fields.shouldMinimize)
    setUseLetterNames(fields.useLetterNames)
    return true
  }, [])

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

  // Snapshot the current scratchpad as a ShareState. Used by both the Share button
  // (which builds the hash URL) and the Library dialog (which saves it). The
  // alphabet boundary (App string <-> ShareState string[]) lives in toShareState.
  const buildSharePayload = useCallback(() => {
    return toShareState({
      regex,
      alphabet,
      testString,
      constructionMethod,
      shouldMinimize,
      useLetterNames,
    })
  }, [regex, alphabet, testString, constructionMethod, shouldMinimize, useLetterNames])

  // The hash a Share click copies. Pure string assembly over the current state.
  const buildHash = useCallback(() => buildShareHash(buildSharePayload()), [buildSharePayload])

  // Load a saved automaton: re-validate its stored payload through the same
  // fail-closed codec the URL surface uses (untrusted at rest), apply it on a pass,
  // and surface the loaded-from-share chip exactly as a shared URL does.
  const handleLibraryLoad = useCallback((id: string) => {
    const decoded = loadSaved(id)
    if (decoded !== null && applyShared(decoded)) {
      setLoadedFromShare(true)
      setIsLibraryOpen(false)
    }
  }, [applyShared])

  const isDirectMethod = constructionMethod !== 'thompson'

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 relative z-10">

        {/* Fail-closed banner (SHARE-02): the first thing read when an incoming
            hash failed to decode. It is a banner over the usable default, not a
            modal, so it does not block the page. */}
        {loadError && (
          <section>
            <FailClosedNotice onDismiss={() => setLoadError(false)} />
          </section>
        )}

        {/* The live-automaton signature, decorative (aria-hidden inside Hero).
            Shares the page gutter and the section rhythm of the views below. */}
        <section className="pt-2 pb-4">
          <Hero />
        </section>

        <section className="bg-surface rounded-3xl shadow-lg border border-border hover:border-border-strong transition-all duration-300 p-8 md:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start relative">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {/* Decorative accent bar -- brand chrome, not a state color */}
                    <div className="w-1.5 h-6 bg-gradient-to-b from-brand to-brand-pressed rounded-full"></div>
                    <h2 className="text-xl font-display font-bold text-text-hi">Pattern</h2>
                  </div>
                  {/* Loaded-from-share chip (SHARE-01): neutral chrome, shows only
                      after a valid restore, dismissible for the session. */}
                  {loadedFromShare && (
                    <LoadedFromShareChip onDismiss={() => setLoadedFromShare(false)} />
                  )}
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

                {/* Saved-automata library launcher (SHARE-04). One home-view
                    control; Save current lives inside the dialog. */}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setIsLibraryOpen(true)}
                    className="cursor-pointer min-h-[44px] w-full px-4 py-2 text-xs font-semibold text-text-mid hover:text-brand-hover border border-border hover:border-border-strong bg-surface-raised hover:bg-surface-overlay rounded-lg transition-all shadow-sm flex items-center justify-center gap-2"
                    aria-haspopup="dialog"
                    aria-expanded={isLibraryOpen}
                    data-testid="library-open"
                  >
                    {/* Bookmark glyph -- aria-hidden; the text carries the meaning. */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                    </svg>
                    Saved automata
                  </button>
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
                  onBuildShareHash={buildHash}
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
                    onBuildShareHash={buildHash}
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

      {/* Saved-automata library dialog (SHARE-04). Save current, list, load
          (through the SHARE-02 validator via handleLibraryLoad), and delete.
          Mounted only while open so its list is read fresh from storage each
          time it opens (the dialog seeds its state from a lazy initializer). */}
      {isLibraryOpen && (
        <LibraryDialog
          isOpen={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          buildPayload={buildSharePayload}
          onLoad={handleLibraryLoad}
          listSaved={listSaved}
          saveCurrent={saveCurrent}
          deleteSaved={deleteSaved}
        />
      )}

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
