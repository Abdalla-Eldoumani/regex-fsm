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
      {/* Result banners use feedback tokens (success/error) — these communicate a simulation
          outcome, not a state role. animate-fade-in has been removed as the animation token
          no longer exists in the theme. */}
      {isRejected && (
        <div className="p-4 bg-error/10 border-2 border-error/30 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-error/20 border border-error/40">
              <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="p-4 bg-success/10 border-2 border-success/30 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-success/20 border border-success/40">
              <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                // Highlighted row: brand-tint bg with brand border ring (UI highlight, not state role)
                ? 'bg-brand-tint border-brand shadow-sm ring-1 ring-brand-hover/20'
                : 'bg-bg border-border hover:border-border-strong'
            }`}
          >
            <div className="flex items-center gap-3 mb-4 overflow-hidden">
              {/* State badge — uses state-semantic tokens, not bg-error/bg-success with text-white.
                  Same tokens as graph node colors; non-color cue is the text id itself.
                  on-state token doesn't exist in this theme — text-on-bg is the correct choice
                  since the soft tints have enough contrast against text-text-hi. */}
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-full font-mono font-bold text-sm flex-shrink-0 border-2 ${
                  isTrapState(state.id) ? 'bg-state-trap-soft border-state-trap text-state-trap' :
                  isAcceptState(state.id) ? 'bg-state-accept-soft border-state-accept text-state-accept' :
                  'bg-surface-raised border-border text-text-hi'
                }`}
                title={state.id}
              >
                <span className="truncate max-w-[2rem]">{state.id}</span>
              </div>
              <div className="flex gap-2">
                {isStartState(state.id) && (
                  /* Start label chip — state-semantic token (no-drift contract) */
                  <span className="px-2 py-0.5 bg-state-start-soft border border-state-start/40 rounded-md text-xs text-state-start font-medium uppercase tracking-wider">
                    Start
                  </span>
                )}
                {isAcceptState(state.id) && (
                  /* Accept label chip — state-semantic token (no-drift contract) */
                  <span className="px-2 py-0.5 bg-state-accept-soft border border-state-accept/40 rounded-md text-xs text-state-accept font-medium uppercase tracking-wider">
                    Accept
                  </span>
                )}
                {isTrapState(state.id) && (
                  /* Trap label chip — state-semantic token (no-drift contract) */
                  <span className="px-2 py-0.5 bg-state-trap-soft border border-state-trap/40 rounded-md text-xs text-state-trap font-medium uppercase tracking-wider">
                    Trap
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-xs font-semibold text-text-low uppercase tracking-wider mb-2">
                  Outgoing Transitions ({outgoing.length})
                </div>
                {outgoing.length === 0 ? (
                  <div className="text-sm text-text-low italic">No outgoing transitions</div>
                ) : (
                  <div className="space-y-1.5">
                    {outgoing.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="text-text-mid">On</span>
                        {/* Transition symbol chip — neutral surface, not a state role */}
                        <code className="px-1.5 py-0.5 bg-surface-raised rounded border border-border text-text-hi font-mono text-xs">
                          {t.symbol === null ? 'λ' : t.symbol}
                        </code>
                        <span className="text-text-low">→</span>
                        <code className="px-1.5 py-0.5 bg-surface-raised rounded border border-border text-text-hi font-mono text-xs">
                          {t.to}
                        </code>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-text-low uppercase tracking-wider mb-2">
                  Incoming Transitions ({incoming.length})
                </div>
                {incoming.length === 0 ? (
                  <div className="text-sm text-text-low italic">No incoming transitions</div>
                ) : (
                  <div className="space-y-1.5">
                    {incoming.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="text-text-mid">From</span>
                        <code className="px-1.5 py-0.5 bg-surface-raised rounded border border-border text-text-hi font-mono text-xs">
                          {t.from}
                        </code>
                        <span className="text-text-mid">on</span>
                        <code className="px-1.5 py-0.5 bg-surface-raised rounded border border-border text-text-hi font-mono text-xs">
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

      {/* Summary footer — neutral surface, not state-semantic */}
      <div className="mt-6 p-4 bg-surface-raised/40 rounded-xl border border-border/50 text-sm text-text-mid">
        <div className="font-semibold text-text-hi mb-2">Summary</div>
        <div className="grid grid-cols-2 gap-4">
          <div>Total states: <span className="font-mono text-text-hi">{automaton.states.length}</span></div>
          <div>Total transitions: <span className="font-mono text-text-hi">{automaton.transitions.length}</span></div>
          {/* Start/accept refs in summary use state-semantic tokens — same as graph */}
          <div>Start state: <code className="text-state-start font-mono">{automaton.startState}</code></div>
          <div>
            Accept states: {automaton.acceptStates.length === 0 ? (
              <span className="italic">none</span>
            ) : (
              automaton.acceptStates.map((s, idx) => (
                <code key={s} className="text-state-accept font-mono">
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
