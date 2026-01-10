interface SimulationControlsProps {
  isRunning: boolean
  canStep: boolean
  canReset: boolean
  currentStep: number
  totalSteps: number
  onPlay: () => void
  onPause: () => void
  onStepForward: () => void
  onStepBack: () => void
  onReset: () => void
  onComplete: () => void
}

export function SimulationControls({
  isRunning,
  canStep,
  canReset,
  currentStep,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onReset,
  onComplete,
}: SimulationControlsProps) {
  const secondaryBtnClass = "px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium text-text-secondary hover:text-primary hover:border-primary/50 hover:bg-primary-light/10 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-background disabled:border-border"
  
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={onReset}
        disabled={!canReset}
        className={secondaryBtnClass}
        title="Reset to start"
      >
        <span className="mr-1">⏮</span> Reset
      </button>

      <button
        onClick={onStepBack}
        disabled={currentStep === 0}
        className={secondaryBtnClass}
        title="Step back"
      >
        <span className="mr-1">◀</span> Back
      </button>

      <button
        onClick={isRunning ? onPause : onPlay}
        disabled={!canStep && !isRunning}
        className={`px-6 py-2 rounded-lg text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all flex items-center gap-2 min-w-[110px] justify-center transform active:scale-95 ${
            isRunning
              ? 'bg-secondary hover:bg-secondary-hover'
              : 'bg-primary hover:bg-primary-hover'
          } disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
        title={isRunning ? 'Pause' : 'Play'}
      >
        {isRunning ? (
          <>
            <span>⏸</span> Pause
          </>
        ) : (
          <>
            <span>▶</span> Play
          </>
        )}
      </button>

      <button
        onClick={onStepForward}
        disabled={!canStep}
        className={secondaryBtnClass}
        title="Step forward"
      >
        Forward <span className="ml-1">▶</span>
      </button>

      <button
        onClick={onComplete}
        disabled={!canStep}
        className={secondaryBtnClass}
        title="Run to completion"
      >
        Finish <span className="ml-1">⏭</span>
      </button>
    </div>
  )
}