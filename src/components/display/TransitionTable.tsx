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
        <thead>
          <tr className="bg-secondary-light/50">
            <th className="px-4 py-3 text-left border-b border-r border-border text-text-secondary font-semibold">
              State
            </th>
            {columns.map(symbol => (
              <th
                key={symbol}
                className="px-4 py-3 text-center border-b border-border text-text-secondary font-semibold"
              >
                <code className="px-2 py-1 bg-background rounded border border-border text-text-primary font-mono text-xs">{symbol}</code>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {automaton.states.map(state => {
            const isHighlighted = highlightState === state.id
            const rowClasses = isHighlighted
              ? 'bg-primary-light/20'
              : 'hover:bg-secondary-light/20 even:bg-secondary-light/5'

            return (
              <tr key={state.id} className={`${rowClasses} transition-colors`}>
                <td className="px-4 py-3 border-r border-border border-b border-border/50 font-mono">
                  <div className="flex items-center gap-2 max-w-[200px]">
                    {isStartState(state.id) && (
                      <span className="text-primary text-xs flex-shrink-0" title="Start State">→</span>
                    )}
                    <span
                      className={`truncate ${
                        isTrapState(state.id) ? 'text-error font-semibold' :
                        isAcceptState(state.id) ? 'text-success font-semibold' : 'text-text-primary'
                      }`}
                      title={state.id}
                    >
                      {state.id}
                    </span>
                    {isAcceptState(state.id) && (
                      <span className="text-success text-xs flex-shrink-0" title="Accept State">✓</span>
                    )}
                    {isTrapState(state.id) && (
                      <span className="text-error text-xs flex-shrink-0" title="Trap State">⊗</span>
                    )}
                  </div>
                </td>
                {alphabet.map(symbol => {
                  const targets = getTransitions(state.id, symbol)
                  return (
                    <td
                      key={symbol}
                      className="px-4 py-3 text-center border-b border-border/50 font-mono text-text-primary"
                    >
                      {targets.length === 0 ? (
                        <span className="text-text-tertiary">∅</span>
                      ) : targets.length === 1 ? (
                        targets[0]
                      ) : (
                        `{${targets.join(',')}}`
                      )}
                    </td>
                  )
                })}
                {hasLambda && (
                  <td className="px-4 py-3 text-center border-b border-border/50 font-mono text-text-primary">
                    {(() => {
                      const targets = getTransitions(state.id, null)
                      return targets.length === 0 ? (
                        <span className="text-text-tertiary">∅</span>
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

      <div className="mt-4 px-2 text-xs text-text-tertiary space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-primary">→</span>
          <span>Start state</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-success">✓</span>
          <span>Accept state</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-error">⊗</span>
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
