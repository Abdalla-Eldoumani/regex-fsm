import type { JSX } from 'react'

// StageExplanation: a dual-row panel -- a plain-language sentence (font-sans) and
// a course-notation symbolic row (font-mono). The shape mirrors StepExplanation's
// icon + text layout from the education module, adapted for the pumping game's two-
// tier explanation requirement (PUMP-02 / UI-SPEC gate 3).
//
// When tone === 'contradiction', the panel uses text-error to flag the verdict
// visually. A "!" icon is paired with the error color (never color alone -- the
// project colorblind requirement). The notation row is also accented with text-error so the
// course form of the contradiction (e.g. xy²z ∉ L) reads as a failure clearly.

interface StageExplanationProps {
  plain: string
  notation: string
  tone?: 'info' | 'contradiction'
}

export function StageExplanation({
  plain,
  notation,
  tone = 'info',
}: StageExplanationProps): JSX.Element {
  const isContradiction = tone === 'contradiction'

  return (
    <div
      data-testid="pumping-explanation"
      className={
        'rounded-xl border p-4 flex flex-col gap-2 ' +
        (isContradiction
          ? 'border-error/40 bg-error/5'
          : 'border-border bg-surface')
      }
    >
      {/* Plain-language row */}
      <div className="flex items-start gap-2">
        {isContradiction && (
          // Paired icon + text for the error cue (never color alone).
          <span
            aria-hidden="true"
            className="shrink-0 mt-0.5 font-bold text-error"
          >
            !
          </span>
        )}
        <p
          className={
            'font-sans text-sm leading-relaxed ' +
            (isContradiction ? 'text-error font-medium' : 'text-text')
          }
        >
          {plain}
        </p>
      </div>

      {/* Course-notation symbolic row */}
      <p
        data-testid="pumping-explanation-notation"
        className={
          'font-mono text-sm mt-1 ' +
          (isContradiction ? 'text-error' : 'text-text-hi')
        }
      >
        {notation}
      </p>
    </div>
  )
}
