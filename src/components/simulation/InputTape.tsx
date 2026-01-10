interface InputTapeProps {
  input: string
  currentPosition: number
  accepted?: boolean | null
}

export function InputTape({ input, currentPosition }: InputTapeProps) {
  if (!input) {
    return (
      <div className="flex items-center justify-center h-24 text-text-tertiary italic text-sm border-2 border-dashed border-border rounded-xl bg-background/50">
        Enter a test string to visualize the input tape
      </div>
    )
  }

  const cells = input.split('')

  return (
    <div className="relative flex flex-col gap-4 py-8 overflow-hidden">
      <div className="absolute top-1/2 left-0 w-full h-1 bg-border/50 -translate-y-1/2 rounded-full" />
      
      <div className="flex items-center justify-center overflow-x-auto pb-4 pt-4 px-4 scrollbar-hide relative z-10">
        <div className="flex items-center gap-3">
          {cells.map((char, idx) => {
            const isConsumed = idx < currentPosition
            const isCurrent = idx === currentPosition
            const isRemaining = idx > currentPosition

            return (
              <div
                key={idx}
                className={`
                  relative flex items-center justify-center w-14 h-14
                  rounded-xl font-mono text-xl font-bold transition-all duration-300
                  ${isCurrent 
                    ? 'bg-primary text-white scale-110 shadow-xl shadow-primary/30 z-20 -translate-y-1 ring-4 ring-primary/20' 
                    : ''}
                  ${isConsumed 
                    ? 'bg-secondary-light border-2 border-border text-text-tertiary opacity-70 grayscale' 
                    : ''}
                  ${isRemaining 
                    ? 'bg-surface border-2 border-border text-text-primary shadow-sm' 
                    : ''}
                `}
              >
                {char}
                {isCurrent && (
                  <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce-small">
                     <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-primary"></div>
                     <span className="text-[10px] font-bold text-primary uppercase tracking-wider mt-1">Head</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}