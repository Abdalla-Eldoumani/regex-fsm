import { SimulationStep } from '@/core/algorithms/simulate'

interface StepExplanationProps {
  step: SimulationStep | null
  mode: 'nfa' | 'dfa'
  isComplete: boolean
  accepted: boolean
  inputLength?: number
}

export function StepExplanation({ step, mode, isComplete, accepted, inputLength = 0 }: StepExplanationProps) {
  if (!step) {
    return (
      <div className="p-4 bg-surface0 rounded-lg">
        <div className="text-sm text-subtext0 italic">
          No simulation in progress. Enter a test string and start the simulation.
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

    const symbol = step.symbol || 'ε'
    const currentStates = Array.isArray(step.currentStates)
      ? step.currentStates
      : [step.currentStates]

    if (step.position === 0 && !step.symbol) {
      if (mode === 'nfa') {
        return `Starting in state ${currentStates[0]}. Computing ε-closure: {${currentStates.join(', ')}}.`
      } else {
        return `Starting in state ${currentStates[0]}.`
      }
    }

    if (step.symbol === null) {
      return `Following ε-transition. Current state set: {${currentStates.join(', ')}}.`
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
    <div className="p-4 bg-surface0 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isComplete ? (
            <span className={`text-lg ${accepted ? 'text-green' : 'text-red'}`}>
              {accepted ? '✓' : '✗'}
            </span>
          ) : (
            <span className="text-blue text-lg">→</span>
          )}
        </div>
        <div className="flex-1">
          <div className="text-sm text-text leading-relaxed">{explanation}</div>
          {additionalInfo && (
            <div className="mt-2 text-xs text-subtext0 italic">{additionalInfo}</div>
          )}
        </div>
      </div>

      {!isComplete && step.position !== undefined && (
        <div className="mt-3 pt-3 border-t border-overlay0">
          <div className="text-xs text-subtext0">
            Position: {step.position} / {inputLength}
          </div>
        </div>
      )}
    </div>
  )
}
