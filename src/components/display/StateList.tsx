import { memo, useMemo } from 'react'
import { Automaton } from '@/core/automata/types'
import { SimulationResult } from '@/core/algorithms/simulate'

interface StateListProps {
  automaton: Automaton
  highlightStates?: string[]
  simulationResult?: SimulationResult | null
}

export const StateList = memo(function StateList({ automaton, highlightStates = [], simulationResult = null }: StateListProps) {
  const acceptSet = useMemo(() => new Set(automaton.acceptStates), [automaton.acceptStates])
  const isAcceptState = (state: string) => acceptSet.has(state)
  const isStartState = (state: string) => state === automaton.startState
  const isTrapState = (state: string) => state === '∅'

  // Build outgoing/incoming indexes once
  const { outgoingMap, incomingMap } = useMemo(() => {
    const out = new Map<string, typeof automaton.transitions>()
    const inc = new Map<string, typeof automaton.transitions>()
    for (const t of automaton.transitions) {
      const outList = out.get(t.from)
      if (outList) outList.push(t)
      else out.set(t.from, [t])
      const incList = inc.get(t.to)
      if (incList) incList.push(t)
      else inc.set(t.to, [t])
    }
    return { outgoingMap: out, incomingMap: inc }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pre-existing; revisit under test in its owning phase (see .agent/TECH_DEBT.md)
  }, [automaton.transitions])

  const getOutgoingTransitions = (stateId: string) => outgoingMap.get(stateId) ?? []
  const getIncomingTransitions = (stateId: string) => incomingMap.get(stateId) ?? []

  const isSimulationComplete = simulationResult && simulationResult.steps.length > 0
  const isRejected = isSimulationComplete && !simulationResult.accepted

  const getRejectionReason = () => {
    if (!isSimulationComplete || simulationResult.accepted) return ''

    const lastStep = simulationResult.steps[simulationResult.steps.length - 1]
    if (lastStep.nextStates.length === 0) {
      return 'No valid transition found - reached trap state'
    }

    const hasAcceptState = lastStep.nextStates.some(state => automaton.acceptStates.includes(state))
    if (!hasAcceptState) {
      return 'Ended in non-accepting state'
    }

    return 'String not accepted'
  }

  return (
    <div className="space-y-4 max-h-[800px] min-h-[400px] overflow-y-auto pr-2">
      {isRejected && (
        <div className="p-4 bg-error-light border-2 border-error/30 rounded-xl animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-error">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-error">String Rejected</h3>
              <p className="text-sm text-error/80">{getRejectionReason()}</p>
            </div>
          </div>
        </div>
      )}

      {isSimulationComplete && simulationResult.accepted && (
        <div className="p-4 bg-success-light border-2 border-success/30 rounded-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-success">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-success">String Accepted</h3>
              <p className="text-sm text-success/80">The automaton successfully accepted this input</p>
            </div>
          </div>
        </div>
      )}

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
            <div className="flex items-center gap-3 mb-4 overflow-hidden">
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-full font-mono font-bold text-sm flex-shrink-0 ${
                  isTrapState(state.id) ? 'bg-error text-white' :
                  isAcceptState(state.id) ? 'bg-success text-white' : 'bg-secondary-light text-text-primary'
                }`}
                title={state.id}
              >
                <span className="truncate max-w-[2rem]">{state.id}</span>
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
                {isTrapState(state.id) && (
                  <span className="px-2 py-0.5 bg-error-light border border-error/20 rounded-md text-xs text-error font-medium uppercase tracking-wider">
                    Trap
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
                          {t.symbol === null ? 'λ' : t.symbol}
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
                          {t.symbol === null ? 'λ' : t.symbol}
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
})
