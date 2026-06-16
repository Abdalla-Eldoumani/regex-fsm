import { memo, useMemo } from 'react'
import { Automaton } from '@/core/automata/types'

interface TransitionTableProps {
  automaton: Automaton
  highlightState?: string
}

export const TransitionTable = memo(function TransitionTable({ automaton, highlightState }: TransitionTableProps) {
  const alphabet = useMemo(() => Array.from(automaton.alphabet).sort(), [automaton.alphabet])
  const hasLambda = useMemo(() => automaton.transitions.some(t => t.symbol === null), [automaton.transitions])
  const columns = useMemo(() => hasLambda ? [...alphabet, 'λ'] : alphabet, [alphabet, hasLambda])

  // Build transition index: Map<fromState, Map<symbol|'λ', sortedTargets[]>>
  const transitionIndex = useMemo(() => {
    const idx = new Map<string, Map<string, Set<string>>>()
    for (const t of automaton.transitions) {
      const symKey = t.symbol ?? 'λ'
      let fromMap = idx.get(t.from)
      if (!fromMap) {
        fromMap = new Map()
        idx.set(t.from, fromMap)
      }
      let targets = fromMap.get(symKey)
      if (!targets) {
        targets = new Set()
        fromMap.set(symKey, targets)
      }
      targets.add(t.to)
    }
    // Convert sets to sorted arrays
    const result = new Map<string, Map<string, string[]>>()
    for (const [from, fromMap] of idx) {
      const sortedMap = new Map<string, string[]>()
      for (const [sym, targets] of fromMap) {
        sortedMap.set(sym, [...targets].sort())
      }
      result.set(from, sortedMap)
    }
    return result
  }, [automaton.transitions])

  const getTransitions = (fromState: string, symbol: string | null): string[] => {
    const symKey = symbol ?? 'λ'
    return transitionIndex.get(fromState)?.get(symKey) ?? []
  }

  const acceptSet = useMemo(() => new Set(automaton.acceptStates), [automaton.acceptStates])
  const isAcceptState = (state: string) => acceptSet.has(state)
  const isStartState = (state: string) => state === automaton.startState
  const isTrapState = (state: string) => state === '∅'

  return (
    <div className="overflow-x-auto overflow-y-auto rounded-lg border border-border max-h-[800px] min-h-[400px]">
      <table className="w-full border-collapse text-sm min-w-max">
        {/* sr-only caption names the table as the transition function δ for the same
            automaton the diagram renders, so AT announces the table's purpose. Hidden
            from sighted users (the visible layout is unchanged) but in the a11y tree. */}
        <caption className="sr-only">Transition function δ for the automaton</caption>
        <thead>
          <tr className="bg-surface-raised">
            <th scope="col" className="px-4 py-3 text-left border-b border-r border-border text-text-mid font-semibold">
              State
            </th>
            {columns.map(symbol => (
              <th
                key={symbol}
                scope="col"
                className="px-4 py-3 text-center border-b border-border text-text-mid font-semibold"
              >
                {/* Symbol column header — neutral bg, not a state role */}
                <code className="px-2 py-1 bg-bg rounded border border-border text-text-hi font-mono text-xs">{symbol}</code>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {automaton.states.map(state => {
            const isHighlighted = highlightState === state.id
            // Highlighted row uses brand-tint (UI chrome); zebra and hover use surface tokens.
            // State role glyphs (→ ✓ ⊗) use state-semantic colors, not brand/feedback colors,
            // enforcing the no-drift contract: same token as the graph legend.
            const rowClasses = isHighlighted
              ? 'bg-brand-tint'
              : 'hover:bg-surface-raised/40 even:bg-surface-raised/20'

            return (
              <tr key={state.id} className={`${rowClasses} transition-colors`}>
                {/* Row header: scope="row" ties this state to its δ cells for AT. It
                    is a th, not a td, but keeps the identical className so the visual
                    styling is unchanged (font-weight is reset by the flex content). */}
                <th scope="row" className="px-4 py-3 border-r border-border border-b border-border/50 font-mono">
                  <div className="flex items-center gap-2 max-w-[200px]">
                    {isStartState(state.id) && (
                      // → glyph uses state-start color — matches graph and legend exactly
                      <span className="text-state-start text-xs flex-shrink-0" title="Start State">→</span>
                    )}
                    <span
                      className={`truncate ${
                        isTrapState(state.id) ? 'text-state-trap font-semibold' :
                        isAcceptState(state.id) ? 'text-state-accept font-semibold' : 'text-text-hi'
                      }`}
                      title={state.id}
                    >
                      {state.id}
                    </span>
                    {isAcceptState(state.id) && (
                      // ✓ glyph uses state-accept color — matches graph and legend exactly
                      <span className="text-state-accept text-xs flex-shrink-0" title="Accept State">✓</span>
                    )}
                    {isTrapState(state.id) && (
                      // ⊗ glyph uses state-trap color — matches graph and legend exactly
                      <span className="text-state-trap text-xs flex-shrink-0" title="Trap State">⊗</span>
                    )}
                  </div>
                </th>
                {alphabet.map(symbol => {
                  const targets = getTransitions(state.id, symbol)
                  return (
                    <td
                      key={symbol}
                      className="px-4 py-3 text-center border-b border-border/50 font-mono text-text-hi"
                    >
                      {targets.length === 0 ? (
                        <span className="text-text-low">∅</span>
                      ) : targets.length === 1 ? (
                        targets[0]
                      ) : (
                        `{${targets.join(',')}}`
                      )}
                    </td>
                  )
                })}
                {hasLambda && (
                  <td className="px-4 py-3 text-center border-b border-border/50 font-mono text-text-hi">
                    {(() => {
                      const targets = getTransitions(state.id, null)
                      return targets.length === 0 ? (
                        <span className="text-text-low">∅</span>
                      ) : targets.length === 1 ? (
                        targets[0]
                      ) : (
                        `{${targets.join(',')}}`
                      )
                    })()}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Legend footer — state-semantic tokens (no-drift contract) */}
      <div className="mt-4 px-2 text-xs text-text-low space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-state-start">→</span>
          <span>Start state</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-state-accept">✓</span>
          <span>Accept state</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-state-trap">⊗</span>
          <span>Trap state (rejection sink)</span>
        </div>
        <div className="flex items-center gap-2">
          <span>∅</span>
          <span>No transition (empty set)</span>
        </div>
      </div>
    </div>
  )
})
