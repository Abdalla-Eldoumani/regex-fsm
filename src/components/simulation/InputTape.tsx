interface InputTapeProps {
  input: string
  currentPosition: number
  accepted?: boolean | null
}

export function InputTape({ input, currentPosition, accepted }: InputTapeProps) {
  if (!input) {
    return (
      <div className="flex items-center justify-center h-20 bg-surface0 rounded border border-overlay0 text-subtext0">
        Enter a test string to simulate
      </div>
    )
  }

  const cells = input.split('')

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {cells.map((char, idx) => {
          const isConsumed = idx < currentPosition
          const isCurrent = idx === currentPosition
          const isRemaining = idx > currentPosition

          return (
            <div
              key={idx}
              className={`
                relative flex items-center justify-center min-w-12 h-12
                border-2 rounded font-mono text-lg font-semibold
                ${isCurrent ? 'border-yellow bg-yellow/20 text-yellow scale-110' : ''}
                ${isConsumed ? 'border-overlay0 bg-surface1 text-overlay0 opacity-50' : ''}
                ${isRemaining ? 'border-blue bg-surface0 text-text' : ''}
              `}
            >
              {char}
              {isCurrent && (
                <div className="absolute -bottom-6 text-yellow text-xs">▲ current</div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-subtext0">
          Position: {currentPosition} / {input.length}
        </div>
        {accepted !== null && accepted !== undefined && (
          <div className={`font-semibold ${accepted ? 'text-green' : 'text-red'}`}>
            {accepted ? '✓ Accepted' : '✗ Rejected'}
          </div>
        )}
      </div>
    </div>
  )
}
