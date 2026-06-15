import { useState } from 'react'

interface AlgorithmStep {
  title: string
  content: string
  detail?: string
}

interface AlgorithmWalkthroughProps {
  title: string
  steps: AlgorithmStep[]
}

export function AlgorithmWalkthrough({ title, steps }: AlgorithmWalkthroughProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)

  if (steps.length === 0) return null

  const step = steps[currentIdx]

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Expand trigger — surface hover, 44px min-height */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer w-full px-4 min-h-[44px] flex items-center justify-between bg-surface hover:bg-surface-raised transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-tint border border-brand-hover/40"></div>
          <span className="text-sm font-bold text-text-hi">{title}</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 text-text-mid transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-border bg-surface">
          {/* Step navigation pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={`cursor-pointer px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  i === currentIdx
                    ? 'bg-brand-tint text-brand-hover border border-brand-hover/30'
                    : 'bg-surface-raised text-text-mid hover:text-text-hi'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Step content */}
          <div>
            <h4 className="text-sm font-bold text-text-hi mb-2">{step.title}</h4>
            <p className="text-sm text-text-mid leading-relaxed whitespace-pre-line">{step.content}</p>
            {step.detail && (
              /* detail block: surface-overlay for depth; font-mono since it contains symbolic content */
              <div className="mt-3 p-3 bg-surface-overlay rounded-lg border border-border">
                <pre className="text-xs font-mono text-text-mid overflow-x-auto whitespace-pre-wrap">{step.detail}</pre>
              </div>
            )}
          </div>

          {/* Prev / Next */}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="cursor-pointer text-xs text-text-low hover:text-text-hi disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentIdx(Math.min(steps.length - 1, currentIdx + 1))}
              disabled={currentIdx === steps.length - 1}
              className="cursor-pointer text-xs text-brand-hover hover:text-brand font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next Step
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
