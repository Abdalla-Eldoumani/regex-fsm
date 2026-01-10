import { Automaton } from '@/core/automata/types'

interface TransitionTableProps {
  automaton: Automaton
  highlightState?: string
}

export function TransitionTable({ automaton, highlightState }: TransitionTableProps) {
  const alphabet = Array.from(automaton.alphabet).sort()
  const hasEpsilon = automaton.transitions.some(t => t.symbol === null)
  const columns = hasEpsilon ? [...alphabet, 'ε'] : alphabet

  const getTransitions = (fromState: string, symbol: string | null): string[] => {
    const targets = automaton.transitions
      .filter(t => t.from === fromState && t.symbol === symbol)
      .map(t => t.to)
    return Array.from(new Set(targets)).sort()
  }

  const isAcceptState = (state: string) => automaton.acceptStates.includes(state)
  const isStartState = (state: string) => state === automaton.startState

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface1">
            <th className="px-3 py-2 text-left border border-overlay0 text-subtext0 font-semibold">
              State
            </th>
            {columns.map(symbol => (
              <th
                key={symbol}
                className="px-3 py-2 text-center border border-overlay0 text-subtext0 font-semibold"
              >
                <code className="text-yellow">{symbol}</code>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {automaton.states.map(state => {
            const isHighlighted = highlightState === state.id
            const rowClasses = isHighlighted
              ? 'bg-blue/20 border-blue'
              : 'hover:bg-surface0/50'

            return (
              <tr key={state.id} className={rowClasses}>
                <td className="px-3 py-2 border border-overlay0 font-mono">
                  <div className="flex items-center gap-2">
                    {isStartState(state.id) && (
                      <span className="text-blue text-xs">→</span>
                    )}
                    <span className={isAcceptState(state.id) ? 'text-green font-semibold' : 'text-text'}>
                      {state.id}
                    </span>
                    {isAcceptState(state.id) && (
                      <span className="text-green text-xs">✓</span>
                    )}
                  </div>
                </td>
                {alphabet.map(symbol => {
                  const targets = getTransitions(state.id, symbol)
                  return (
                    <td
                      key={symbol}
                      className="px-3 py-2 text-center border border-overlay0 font-mono text-text"
                    >
                      {targets.length === 0 ? (
                        <span className="text-subtext0">∅</span>
                      ) : targets.length === 1 ? (
                        targets[0]
                      ) : (
                        `{${targets.join(',')}}`
                      )}
                    </td>
                  )
                })}
                {hasEpsilon && (
                  <td className="px-3 py-2 text-center border border-overlay0 font-mono text-text">
                    {(() => {
                      const targets = getTransitions(state.id, null)
                      return targets.length === 0 ? (
                        <span className="text-subtext0">∅</span>
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

      <div className="mt-3 px-2 text-xs text-subtext0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-blue">→</span>
          <span>Start state</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green">✓</span>
          <span>Accept state</span>
        </div>
        <div className="flex items-center gap-2">
          <span>∅</span>
          <span>No transition (empty set)</span>
        </div>
      </div>
    </div>
  )
}
