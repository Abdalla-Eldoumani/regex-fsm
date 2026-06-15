import { memo } from 'react'

interface InputTapeProps {
  input: string
  currentPosition: number
  accepted?: boolean | null
}

export const InputTape = memo(function InputTape({ input, currentPosition }: InputTapeProps) {
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
    </div>
  )
})
