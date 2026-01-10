import { Automaton } from '@/core/automata/types'

interface StateListProps {
  automaton: Automaton
  highlightStates?: string[]
}

export function StateList({ automaton, highlightStates = [] }: StateListProps) {
  const isAcceptState = (state: string) => automaton.acceptStates.includes(state)
  const isStartState = (state: string) => state === automaton.startState

  const getOutgoingTransitions = (stateId: string) => {
    return automaton.transitions.filter(t => t.from === stateId)
  }

  const getIncomingTransitions = (stateId: string) => {
    return automaton.transitions.filter(t => t.to === stateId)
  }

  return (
    <div className="space-y-3">
      {automaton.states.map(state => {
        const isHighlighted = highlightStates.includes(state.id)
        const outgoing = getOutgoingTransitions(state.id)
        const incoming = getIncomingTransitions(state.id)

        return (
          <div
            key={state.id}
            className={`p-4 rounded-lg border ${
              isHighlighted
                ? 'bg-blue/20 border-blue'
                : 'bg-surface1 border-overlay0'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <code className="text-lg font-mono font-semibold text-text">
                {state.id}
              </code>
              <div className="flex gap-2">
                {isStartState(state.id) && (
                  <span className="px-2 py-0.5 bg-blue/20 border border-blue rounded text-xs text-blue font-medium">
                    START
                  </span>
                )}
                {isAcceptState(state.id) && (
                  <span className="px-2 py-0.5 bg-green/20 border border-green rounded text-xs text-green font-medium">
                    ACCEPT
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs font-semibold text-subtext0 mb-1.5">
                  Outgoing ({outgoing.length})
                </div>
                {outgoing.length === 0 ? (
                  <div className="text-xs text-subtext0 italic">None</div>
                ) : (
                  <div className="space-y-1">
                    {outgoing.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <code className="px-1.5 py-0.5 bg-surface0 rounded text-yellow">
                          {t.symbol === null ? 'ε' : t.symbol}
                        </code>
                        <span className="text-subtext0">→</span>
                        <code className="px-1.5 py-0.5 bg-surface0 rounded text-text">
                          {t.to}
                        </code>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-subtext0 mb-1.5">
                  Incoming ({incoming.length})
                </div>
                {incoming.length === 0 ? (
                  <div className="text-xs text-subtext0 italic">None</div>
                ) : (
                  <div className="space-y-1">
                    {incoming.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <code className="px-1.5 py-0.5 bg-surface0 rounded text-text">
                          {t.from}
                        </code>
                        <span className="text-subtext0">→</span>
                        <code className="px-1.5 py-0.5 bg-surface0 rounded text-yellow">
                          {t.symbol === null ? 'ε' : t.symbol}
                        </code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}

      <div className="mt-4 p-3 bg-surface0 rounded-lg text-xs text-subtext0">
        <div className="font-semibold mb-2">Summary</div>
        <div className="space-y-1">
          <div>Total states: {automaton.states.length}</div>
          <div>Start state: <code className="text-blue">{automaton.startState}</code></div>
          <div>
            Accept states: {automaton.acceptStates.length === 0 ? (
              <span className="italic">none</span>
            ) : (
              automaton.acceptStates.map((s, idx) => (
                <code key={s} className="text-green">
                  {s}{idx < automaton.acceptStates.length - 1 ? ', ' : ''}
                </code>
              ))
            )}
          </div>
          <div>Total transitions: {automaton.transitions.length}</div>
        </div>
      </div>
    </div>
  )
}
