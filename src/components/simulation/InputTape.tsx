interface InputTapeProps {
  input: string
  currentPosition: number
  accepted?: boolean | null
}

export function InputTape({ input, currentPosition, accepted }: InputTapeProps) {
  if (!input) {
    return (
      <div className="flex items-center justify-center h-24 bg-canvas rounded-sm border-2 border-border text-ink-lighter italic">
        Enter a test string to simulate
      </div>
    )
  }

  const cells = input.split('')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-3">
        {cells.map((char, idx) => {
          const isConsumed = idx < currentPosition
          const isCurrent = idx === currentPosition
          const isRemaining = idx > currentPosition

          return (
            <div
              key={idx}
              className={`
                relative flex items-center justify-center min-w-14 h-14
                border-3 rounded-sm font-mono text-xl font-semibold transition-all
                ${isCurrent ? 'border-ochre bg-ochre/20 text-ochre-dark scale-110 shadow-md' : ''}
                ${isConsumed ? 'border-border bg-parchment text-border-dark opacity-60' : ''}
                ${isRemaining ? 'border-teal bg-paper text-ink' : ''}
              `}
            >
              {char}
              {isCurrent && (
                <div className="absolute -bottom-7 text-ochre-dark text-xs font-sans font-medium">
                  ▲ reading
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
        <div className="text-ink-light">
          <span className="uppercase tracking-wide text-xs text-ink-lighter font-medium">Position:</span>{' '}
          <span className="font-mono font-semibold text-ink">{currentPosition}</span>
          <span className="text-ink-lighter"> / </span>
          <span className="font-mono font-semibold text-ink">{input.length}</span>
        </div>
        {accepted !== null && accepted !== undefined && (
          <div className={`font-semibold text-base ${accepted ? 'text-sage-dark' : 'text-terracotta'}`}>
            {accepted ? '✓ Accepted' : '✗ Rejected'}
          </div>
        )}
      </div>
    </div>
  )
}
