import type { JSX } from 'react'

// SimulationStepControls: prev / play-pause / next / reset / speed controls for
// the /simulate view.
//
// Cloned from ClosureControls (closure/ClosureControls.tsx) with the data-testid
// values renamed to sim-* so Playwright selectors do not collide with the
// existing closure and simulation E2E specs, plus a Reset button that returns to
// step 0 (SIM-04).
//
// Under reduced motion the Play/Pause button and speed select are hidden so the
// experience becomes a static prev/next step-through (UI-SPEC). The global
// :focus-visible ring is never overridden. This component is presentational
// only; the view owns the stepping state.
export function SimulationStepControls({
  currentStep,
  totalSteps,
  isPlaying,
  speed,
  reducedMotion,
  onPrev,
  onNext,
  onPlay,
  onPause,
  onReset,
  onSpeedChange,
}: {
  currentStep: number
  totalSteps: number
  isPlaying: boolean
  speed: number
  reducedMotion: boolean
  onPrev: () => void
  onNext: () => void
  onPlay: () => void
  onPause: () => void
  onReset: () => void
  onSpeedChange: (ms: number) => void
}): JSX.Element {
  const secondaryBtnClass =
    'cursor-pointer px-4 min-h-[44px] min-w-[44px] bg-surface-raised border border-border rounded-lg ' +
    'text-sm font-medium text-text-mid hover:text-brand-hover hover:border-border-strong ' +
    'transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'

  const speedOptions = [
    { value: 2000, label: '0.5x' },
    { value: 1000, label: '1x' },
    { value: 500, label: '2x' },
    { value: 250, label: '4x' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Prev -- disabled at first step */}
      <button
        type="button"
        onClick={onPrev}
        disabled={currentStep === 0}
        className={secondaryBtnClass}
        title="Previous step"
        aria-label="Previous simulation step"
        data-testid="sim-prev"
      >
        <span className="mr-1" aria-hidden="true">&#x25C0;</span> Prev
      </button>

      {/* Play/Pause -- hidden under reduced motion */}
      {!reducedMotion && (
        <button
          type="button"
          onClick={isPlaying ? onPause : onPlay}
          disabled={totalSteps === 0 || (!isPlaying && currentStep === totalSteps - 1)}
          className={
            'cursor-pointer px-6 min-h-[44px] rounded-lg text-sm font-semibold text-on-brand ' +
            'shadow-sm transition-all flex items-center gap-2 min-w-[110px] justify-center ' +
            'bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
          }
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
          data-testid="sim-play"
        >
          {isPlaying ? (
            <>
              <span aria-hidden="true">&#x23F8;</span> Pause
            </>
          ) : (
            <>
              <span aria-hidden="true">&#x25B6;</span> Play
            </>
          )}
        </button>
      )}

      {/* Next -- disabled at last step */}
      <button
        type="button"
        onClick={onNext}
        disabled={currentStep === totalSteps - 1}
        className={secondaryBtnClass}
        title="Next step"
        aria-label="Next simulation step"
        data-testid="sim-next"
      >
        Next <span className="ml-1" aria-hidden="true">&#x25B6;</span>
      </button>

      {/* Reset -- return to step 0; disabled when already there */}
      <button
        type="button"
        onClick={onReset}
        disabled={currentStep === 0}
        className={secondaryBtnClass}
        title="Reset to the first step"
        aria-label="Reset simulation to the first step"
        data-testid="sim-reset"
      >
        Reset
      </button>

      {/* Speed select -- hidden under reduced motion (auto-play is suppressed) */}
      {!reducedMotion && (
        <div className="flex items-center gap-2 ml-2 px-4 min-h-[44px] bg-surface-raised rounded-lg border border-border">
          <span className="text-sm font-medium text-text-mid">Speed:</span>
          <select
            value={speed}
            onChange={e => onSpeedChange(Number(e.target.value))}
            className={
              'px-3 py-1 bg-surface-overlay border border-border rounded text-sm font-medium ' +
              'text-text-hi hover:border-border-strong focus-visible:outline-none cursor-pointer transition-all'
            }
            title="Playback speed"
            aria-label="Simulation playback speed"
            data-testid="sim-speed"
          >
            {speedOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Step counter */}
      <span className="text-xs font-mono text-text-low ml-1">
        {currentStep + 1} / {totalSteps}
      </span>
    </div>
  )
}
