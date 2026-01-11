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
    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
      {automaton.states.map(state => {
        const isHighlighted = highlightStates.includes(state.id)
        const outgoing = getOutgoingTransitions(state.id)
        const incoming = getIncomingTransitions(state.id)

        return (
          <div
            key={state.id}
            className={`p-4 rounded-xl border transition-all ${
              isHighlighted
                ? 'bg-primary-light/10 border-primary shadow-sm ring-1 ring-primary/20'
                : 'bg-background border-border hover:border-border-hover'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 flex items-center justify-center rounded-full font-mono font-bold text-lg ${
                 isAcceptState(state.id) ? 'bg-success text-white' : 'bg-secondary-light text-text-primary'
              }`}>
                {state.id}
              </div>
              <div className="flex gap-2">
                {isStartState(state.id) && (
                  <span className="px-2 py-0.5 bg-primary-light border border-primary/20 rounded-md text-xs text-primary-dark font-medium uppercase tracking-wider">
                    Start
                  </span>
                )}
                {isAcceptState(state.id) && (
                  <span className="px-2 py-0.5 bg-success-light border border-success/20 rounded-md text-xs text-success font-medium uppercase tracking-wider">
                    Accept
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                  Outgoing Transitions ({outgoing.length})
                </div>
                {outgoing.length === 0 ? (
                  <div className="text-sm text-text-tertiary italic">No outgoing transitions</div>
                ) : (
                  <div className="space-y-1.5">
                    {outgoing.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="text-text-secondary">On</span>
                        <code className="px-1.5 py-0.5 bg-secondary-light rounded border border-border text-text-primary font-mono text-xs">
                          {t.symbol === null ? 'ε' : t.symbol}
                        </code>
                        <span className="text-text-tertiary">→</span>
                        <code className="px-1.5 py-0.5 bg-secondary-light rounded border border-border text-text-primary font-mono text-xs">
                          {t.to}
                        </code>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                  Incoming Transitions ({incoming.length})
                </div>
                {incoming.length === 0 ? (
                  <div className="text-sm text-text-tertiary italic">No incoming transitions</div>
                ) : (
                  <div className="space-y-1.5">
                    {incoming.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="text-text-secondary">From</span>
                        <code className="px-1.5 py-0.5 bg-secondary-light rounded border border-border text-text-primary font-mono text-xs">
                          {t.from}
                        </code>
                        <span className="text-text-secondary">on</span>
                        <code className="px-1.5 py-0.5 bg-secondary-light rounded border border-border text-text-primary font-mono text-xs">
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

      <div className="mt-6 p-4 bg-secondary-light/30 rounded-xl border border-border/50 text-sm text-text-secondary">
        <div className="font-semibold text-text-primary mb-2">Summary</div>
        <div className="grid grid-cols-2 gap-4">
          <div>Total states: <span className="font-mono text-text-primary">{automaton.states.length}</span></div>
          <div>Total transitions: <span className="font-mono text-text-primary">{automaton.transitions.length}</span></div>
          <div>Start state: <code className="text-primary font-mono">{automaton.startState}</code></div>
          <div>
            Accept states: {automaton.acceptStates.length === 0 ? (
              <span className="italic">none</span>
            ) : (
              automaton.acceptStates.map((s, idx) => (
                <code key={s} className="text-success font-mono">
                  {s}{idx < automaton.acceptStates.length - 1 ? ', ' : ''}
                </code>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
