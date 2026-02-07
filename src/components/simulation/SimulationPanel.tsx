import { memo, useEffect } from 'react'
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

export const SimulationPanel = memo(function SimulationPanel({
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
    speed,
    setSpeed,
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

  if (!automaton || input === null || input === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-secondary-light flex items-center justify-center text-secondary">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
        </div>
        <h3 className="text-lg font-medium text-text-primary mb-2">Ready to Simulate</h3>
        <div className="text-text-secondary max-w-sm">
          Enter a regex pattern and a test string to watch the automaton process the input step-by-step.
          <br />
          <span className="text-xs text-text-tertiary mt-2 inline-block">Tip: Empty string is allowed for testing patterns like a* or λ</span>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="p-6 bg-error-light/30 border border-error/20 rounded-xl text-center">
        <h3 className="text-lg font-semibold text-error mb-2">Simulation Error</h3>
        <div className="text-text-secondary">
          Unable to simulate with the current input. Please check your regex and input string.
        </div>
      </div>
    )
  }

  const totalSteps = result.steps.length

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium ${
            mode === 'nfa' ? 'bg-primary-light text-primary-dark' : 'bg-secondary-light text-secondary'
          }`}>
            {mode.toUpperCase()}
          </span>
          <span className="text-sm text-text-tertiary font-mono">
            Step {currentStep} of {totalSteps - 1}
          </span>
        </div>

        {currentStep === totalSteps - 1 && (
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${
              result.accepted
                ? 'bg-success-light text-success'
                : 'bg-error-light text-error'
            }`}
          >
            {result.accepted ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Accepted
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                Rejected
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-background rounded-xl border border-border p-8 overflow-hidden relative">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
         <InputTape
            input={input}
            currentPosition={currentStepData?.position || 0}
            accepted={currentStep === totalSteps - 1 ? result.accepted : null}
         />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
           <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Controls</h4>
           <SimulationControls
             isRunning={isRunning}
             canStep={canStep}
             canReset={canReset}
             currentStep={currentStep}
             totalSteps={totalSteps}
             speed={speed}
             onSpeedChange={setSpeed}
             onPlay={play}
             onPause={pause}
             onStepForward={stepForward}
             onStepBack={stepBack}
             onReset={reset}
             onComplete={complete}
           />
        </div>
        
        <div className="space-y-4">
           <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Analysis</h4>
           <StepExplanation
             step={currentStepData}
             mode={mode}
             isComplete={currentStep === totalSteps - 1}
             accepted={result.accepted}
             inputLength={input.length}
           />
           
           {currentStepData && (
            <div className="flex gap-4 pt-4 border-t border-border">
              <div className="flex-1">
                <div className="text-xs text-text-tertiary mb-1">Current States</div>
                {currentStepData.nextStates.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {currentStepData.nextStates.map(state => (
                      <span key={state} className="px-2 py-1 bg-primary text-white rounded text-xs font-mono">
                        {state}
                      </span>
                    ))}
                  </div>
                ) : (
                   <span className="text-xs text-error font-medium">None (Trap)</span>
                )}
              </div>
              <div>
                <div className="text-xs text-text-tertiary mb-1">Reading</div>
                {currentStepData.symbol ? (
                   <span className="inline-block w-8 h-8 flex items-center justify-center bg-secondary-light text-text-primary rounded font-mono text-sm font-bold border border-secondary/20">
                     {currentStepData.symbol}
                   </span>
                ) : (
                   <span className="text-xs text-text-tertiary italic">λ (lambda)</span>
                )}
              </div>
            </div>
           )}
        </div>
      </div>
    </div>
  )
})
