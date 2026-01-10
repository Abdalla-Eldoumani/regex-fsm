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
  totalSteps,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onReset,
  onComplete,
}: SimulationControlsProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onReset}
          disabled={!canReset}
          className="px-4 py-2.5 bg-canvas hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed rounded-sm text-ink border-2 border-border hover:border-border-dark transition-all font-medium"
          title="Reset to start"
        >
          ⏮ Reset
        </button>

        <button
          onClick={onStepBack}
          disabled={currentStep === 0}
          className="px-4 py-2.5 bg-canvas hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed rounded-sm text-ink border-2 border-border hover:border-border-dark transition-all font-medium"
          title="Step back"
        >
          ◀ Back
        </button>

        <button
          onClick={isRunning ? onPause : onPlay}
          disabled={!canStep && !isRunning}
          className={`px-6 py-2.5 rounded-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
            isRunning
              ? 'bg-ochre hover:bg-ochre-dark text-paper'
              : 'bg-teal hover:bg-teal-dark text-paper'
          }`}
          title={isRunning ? 'Pause' : 'Play'}
        >
          {isRunning ? '⏸ Pause' : '▶ Play'}
        </button>

        <button
          onClick={onStepForward}
          disabled={!canStep}
          className="px-4 py-2.5 bg-canvas hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed rounded-sm text-ink border-2 border-border hover:border-border-dark transition-all font-medium"
          title="Step forward"
        >
          Forward ▶
        </button>

        <button
          onClick={onComplete}
          disabled={!canStep}
          className="px-4 py-2.5 bg-canvas hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed rounded-sm text-ink border-2 border-border hover:border-border-dark transition-all font-medium"
          title="Run to completion"
        >
          ⏭ Complete
        </button>
      </div>

      <div className="flex items-center gap-3 text-sm text-ink-light">
        <div>
          <span className="uppercase tracking-wide text-xs text-ink-lighter font-medium">Step:</span>{' '}
          <span className="font-mono text-base text-ink font-semibold">{currentStep}</span>
          <span className="text-ink-lighter"> / </span>
          <span className="font-mono text-base text-ink font-semibold">{totalSteps - 1}</span>
        </div>
      </div>
    </div>
  )
}
