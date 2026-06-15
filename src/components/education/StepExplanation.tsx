import { SimulationStep } from '@/core/algorithms/simulate'

interface StepExplanationProps {
  step: SimulationStep | null
  mode: 'nfa' | 'dfa'
  isComplete: boolean
  accepted: boolean
  inputLength?: number
}

export function StepExplanation({ step, mode, isComplete, accepted }: StepExplanationProps) {
  if (!step) {
    return (
      <div className="p-4 bg-surface border border-border rounded-lg">
        <div className="text-sm text-text-low italic">
          No simulation in progress.
        </div>
      </div>
    )
  }

  const getExplanation = (): string => {
    if (isComplete) {
      if (accepted) {
        const finalStates = Array.isArray(step.currentStates)
          ? step.currentStates
          : [step.currentStates]
        return `String accepted. Final state${finalStates.length > 1 ? 's' : ''}: ${finalStates.join(', ')}.`
      } else {
        return 'String rejected. No valid path to an accept state exists.'
      }
    }

    const symbol = step.symbol || 'λ'
    const currentStates = Array.isArray(step.currentStates)
      ? step.currentStates
      : [step.currentStates]

    if (step.position === 0 && !step.symbol) {
      if (mode === 'nfa') {
        return `Starting in state ${currentStates[0]}. Computing λ-closure: {${currentStates.join(', ')}}.`
      } else {
        return `Starting in state ${currentStates[0]}.`
      }
    }

    if (step.symbol === null) {
      return `Following λ-transition. Current state set: {${currentStates.join(', ')}}.`
    }

    if (mode === 'nfa') {
      const previousPosition = step.position - 1
      return `Read symbol '${symbol}' at position ${previousPosition}. Current states: {${currentStates.join(', ')}}.`
    } else {
      const previousPosition = step.position - 1
      return `Read symbol '${symbol}' at position ${previousPosition}. Transitioned to state ${currentStates[0]}.`
    }
  }

  const getAdditionalInfo = (): string | null => {
    if (isComplete) return null

    const currentStates = Array.isArray(step.currentStates)
      ? step.currentStates
      : [step.currentStates]

    if (mode === 'nfa') {
      const stateCount = currentStates.length
      if (stateCount === 0) {
        return 'No valid transitions available. String will be rejected.'
      } else if (stateCount > 1) {
        return `NFA is in ${stateCount} states simultaneously due to nondeterminism.`
      }
    }

    return null
  }

  const explanation = getExplanation()
  const additionalInfo = getAdditionalInfo()

  return (
    <div className="p-4 bg-surface border border-border rounded-lg shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isComplete ? (
            <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${accepted ? 'bg-success text-on-state' : 'bg-error text-on-state'}`}>
              {accepted ? '✓' : '✗'}
            </span>
          ) : (
            /* step arrow uses brand chrome (UI chrome indicator, not a state role) */
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-tint text-brand-hover text-xs font-bold">
              →
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="text-sm text-text leading-relaxed font-medium">{explanation}</div>
          {additionalInfo && (
            <div className="mt-2 text-xs text-text-mid italic pl-3 border-l-2 border-border">{additionalInfo}</div>
          )}
        </div>
      </div>
    </div>
  )
}
