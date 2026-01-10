import { useEffect } from 'react'
import { Automaton } from '@/core/automata/types'
import { useSimulation } from '@/hooks/useSimulation'
import { SimulationControls } from './SimulationControls'
import { InputTape } from './InputTape'
import { StepExplanation } from '../education/StepExplanation'

interface SimulationPanelProps {
  automaton: Automaton | null
  input: string
  mode: 'nfa' | 'dfa'
  onHighlightChange: (states: string[], edges: string[]) => void
}

export function SimulationPanel({
  automaton,
  input,
  mode,
  onHighlightChange,
}: SimulationPanelProps) {
  const {
    result,
    currentStep,
    currentStepData,
    isRunning,
    canStep,
    canReset,
    stepForward,
    stepBack,
    reset,
    play,
    pause,
    complete,
  } = useSimulation({ automaton, input, mode })

  // Update highlights when step changes
  useEffect(() => {
    if (currentStepData) {
      onHighlightChange(currentStepData.nextStates, [])
    } else {
      onHighlightChange([], [])
    }
  }, [currentStepData, onHighlightChange])

  if (!automaton || !input) {
    return (
      <div className="p-4 bg-surface0 rounded-lg">
        <h3 className="text-lg font-semibold text-text mb-3">Simulation</h3>
        <div className="text-subtext0 text-center py-8">
          Enter a regex and test string to simulate
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="p-4 bg-surface0 rounded-lg">
        <h3 className="text-lg font-semibold text-text mb-3">Simulation</h3>
        <div className="text-red text-center py-8">
          Unable to simulate with the current input
        </div>
      </div>
    )
  }

  const totalSteps = result.steps.length

  return (
    <div className="p-4 bg-surface0 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text">
          {mode === 'nfa' ? 'NFA' : 'DFA'} Simulation
        </h3>
        {currentStep === totalSteps - 1 && (
          <div
            className={`px-3 py-1 rounded font-semibold ${
              result.accepted
                ? 'bg-green/20 text-green border border-green'
                : 'bg-red/20 text-red border border-red'
            }`}
          >
            {result.accepted ? '✓ String Accepted' : '✗ String Rejected'}
          </div>
        )}
      </div>

      <InputTape
        input={input}
        currentPosition={currentStepData?.position || 0}
        accepted={currentStep === totalSteps - 1 ? result.accepted : null}
      />

      <SimulationControls
        isRunning={isRunning}
        canStep={canStep}
        canReset={canReset}
        currentStep={currentStep}
        totalSteps={totalSteps}
        onPlay={play}
        onPause={pause}
        onStepForward={stepForward}
        onStepBack={stepBack}
        onReset={reset}
        onComplete={complete}
      />

      <StepExplanation
        step={currentStepData}
        mode={mode}
        isComplete={currentStep === totalSteps - 1}
        accepted={result.accepted}
      />

      {currentStepData && (
        <div className="space-y-2 pt-2 border-t border-surface1">
          <div className="text-sm text-subtext0">
            <span className="font-semibold">Current States:</span>{' '}
            {currentStepData.nextStates.length > 0 ? (
              <span className="inline-flex gap-2 flex-wrap">
                {currentStepData.nextStates.map(state => (
                  <code key={state} className="px-2 py-1 bg-surface1 rounded text-blue text-xs">
                    {state}
                  </code>
                ))}
              </span>
            ) : (
              <span className="text-red">No valid states (rejected)</span>
            )}
          </div>

          {currentStepData.symbol && (
            <div className="text-sm text-subtext0">
              <span className="font-semibold">Reading Symbol:</span>{' '}
              <code className="px-2 py-1 bg-surface1 rounded text-yellow text-xs">
                {currentStepData.symbol}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
