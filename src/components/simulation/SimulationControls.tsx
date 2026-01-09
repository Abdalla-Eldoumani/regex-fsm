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
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          disabled={!canReset}
          className="px-3 py-2 bg-surface1 hover:bg-surface2 disabled:opacity-50 disabled:cursor-not-allowed rounded text-text transition-colors"
          title="Reset to start"
        >
          ⏮ Reset
        </button>

        <button
          onClick={onStepBack}
          disabled={currentStep === 0}
          className="px-3 py-2 bg-surface1 hover:bg-surface2 disabled:opacity-50 disabled:cursor-not-allowed rounded text-text transition-colors"
          title="Step back"
        >
          ◀ Back
        </button>

        <button
          onClick={isRunning ? onPause : onPlay}
          disabled={!canStep && !isRunning}
          className={`px-4 py-2 rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isRunning
              ? 'bg-yellow hover:bg-yellow/80 text-base'
              : 'bg-blue hover:bg-blue/80 text-base'
          }`}
          title={isRunning ? 'Pause' : 'Play'}
        >
          {isRunning ? '⏸ Pause' : '▶ Play'}
        </button>

        <button
          onClick={onStepForward}
          disabled={!canStep}
          className="px-3 py-2 bg-surface1 hover:bg-surface2 disabled:opacity-50 disabled:cursor-not-allowed rounded text-text transition-colors"
          title="Step forward"
        >
          Forward ▶
        </button>

        <button
          onClick={onComplete}
          disabled={!canStep}
          className="px-3 py-2 bg-surface1 hover:bg-surface2 disabled:opacity-50 disabled:cursor-not-allowed rounded text-text transition-colors"
          title="Run to completion"
        >
          ⏭ Complete
        </button>
      </div>

      <div className="flex items-center gap-3 text-sm text-subtext0">
        <div>
          Step: <span className="font-mono text-text">{currentStep}</span> /{' '}
          <span className="font-mono text-text">{totalSteps - 1}</span>
        </div>
      </div>
    </div>
  )
}
