import { memo } from 'react'

interface SimulationControlsProps {
  isRunning: boolean
  canStep: boolean
  canReset: boolean
  currentStep: number
  totalSteps: number
  speed: number
  onSpeedChange: (speed: number) => void
  onPlay: () => void
  onPause: () => void
  onStepForward: () => void
  onStepBack: () => void
  onReset: () => void
  onComplete: () => void
}

export const SimulationControls = memo(function SimulationControls({
  isRunning,
  canStep,
  canReset,
  currentStep,
  speed,
  onSpeedChange,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onReset,
  onComplete,
}: SimulationControlsProps) {
  const secondaryBtnClass = "cursor-pointer px-4 min-h-[44px] bg-surface-raised border border-border rounded-lg text-sm font-medium text-text-mid hover:text-brand-hover hover:border-border-strong transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"

  const speedOptions = [
    { value: 2000, label: '0.5x' },
    { value: 1000, label: '1x' },
    { value: 500, label: '2x' },
    { value: 250, label: '4x' },
  ]

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
        className={`cursor-pointer px-6 min-h-[44px] rounded-lg text-sm font-semibold text-on-brand shadow-sm transition-all flex items-center gap-2 min-w-[110px] justify-center bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
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

      <div className="flex items-center gap-2 ml-4 px-4 min-h-[44px] bg-surface-raised rounded-lg border border-border">
        <span className="text-sm font-medium text-text-mid">Speed:</span>
        <select
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="px-3 py-1 bg-surface-overlay border border-border rounded text-sm font-medium text-text-hi hover:border-border-strong focus:outline-none cursor-pointer transition-all"
          title="Simulation speed"
        >
          {speedOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
})
