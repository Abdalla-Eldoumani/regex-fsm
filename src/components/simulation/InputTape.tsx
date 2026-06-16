import { memo } from 'react'

interface InputTapeProps {
  input: string
  currentPosition: number
  accepted?: boolean | null
}

export const InputTape = memo(function InputTape({ input, currentPosition, accepted }: InputTapeProps) {
  if (!input) {
    return (
      <div className="flex items-center justify-center h-24 text-text-low italic text-sm border-2 border-dashed border-border rounded-lg bg-surface">
        Enter a test string to visualize the input tape
      </div>
    )
  }

  const cells = input.split('')

  return (
    /* overflow-x-auto on the inner container so a long string scrolls within
       the tape box rather than pushing the page wider than 360px */
    <div className="relative flex flex-col gap-4 py-8">
      <div className="absolute top-1/2 left-0 w-full h-px bg-border -translate-y-1/2 rounded-full" />

      <div className="overflow-x-auto pb-12 pt-4 px-4 relative z-10">
        <div className="flex items-center gap-3 w-max mx-auto">
          {cells.map((char, idx) => {
            const isConsumed = idx < currentPosition
            const isCurrent = idx === currentPosition
            const isRemaining = idx > currentPosition

            return (
              <div
                key={idx}
                className={`
                  relative flex items-center justify-center w-12 h-12 shrink-0
                  rounded-lg font-mono text-xl font-bold transition-all duration-300
                  ${isCurrent
                    /* shared active treatment: state-active border + pulse class from index.css */
                    ? 'is-active border-state-active bg-state-active-soft text-text-hi scale-110 z-20 -translate-y-1'
                    : ''}
                  ${isConsumed
                    ? 'bg-surface-raised border border-border text-text-low opacity-60'
                    : ''}
                  ${isRemaining
                    ? 'bg-surface border border-border text-text-hi shadow-sm'
                    : ''}
                `}
              >
                {char}
                {isCurrent && (
                  <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-state-active"></div>
                    <span className="text-[10px] font-bold text-state-active uppercase tracking-label mt-1">Head</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Verdict frame on the final step. accepted is null/undefined for every
          intermediate step, so the badge appears only once the run is complete. The
          icon and the literal word carry the meaning; the success/error color is
          reinforcement only, never the sole signal (colorblind-safe floor). Mirrors
          the SimulationPanel accept/reject chip. */}
      {accepted !== null && accepted !== undefined && (
        <div className="flex justify-center">
          <div
            data-testid="sim-tape-verdict"
            className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${
              accepted
                ? 'bg-success/10 text-success border border-success/30'
                : 'bg-error/10 text-error border border-error/30'
            }`}
          >
            {accepted ? (
              <>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Accepted
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                Rejected
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
})
