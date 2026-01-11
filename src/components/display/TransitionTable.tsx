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
  const isTrapState = (state: string) => state === '∅'

  return (
    <div className="overflow-auto rounded-lg border border-border max-h-[600px]">
      <table className="w-full border-collapse text-sm">
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
                  <div className="flex items-center gap-2">
                    {isStartState(state.id) && (
                      <span className="text-primary text-xs" title="Start State">→</span>
                    )}
                    <span className={
                      isTrapState(state.id) ? 'text-error font-semibold' :
                      isAcceptState(state.id) ? 'text-success font-semibold' : 'text-text-primary'
                    }>
                      {state.id}
                    </span>
                    {isAcceptState(state.id) && (
                      <span className="text-success text-xs" title="Accept State">✓</span>
                    )}
                    {isTrapState(state.id) && (
                      <span className="text-error text-xs" title="Trap State">⊗</span>
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
                {hasEpsilon && (
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
}
