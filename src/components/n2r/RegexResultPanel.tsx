import type { JSX } from 'react'
import { formatRegex } from '@/notation/format'
import type { NotationMode } from '@/notation/glyphs'
import type { NfaToRegexResult } from '@/core/algorithms/gnfa'

// RegexResultPanel: shows the current step's explanation and the running or
// final regex in course notation (JetBrains Mono).
//
// When the language is empty the empty-set glyph is rendered as plain text and
// toRegexNode / formatRegex are never called (Pitfall 5 / A5 from RESEARCH).
// The regex string is a plain text child — never dangerouslySetInnerHTML
// (T-06-06 mitigation).
export function RegexResultPanel({
  result,
  currentStep,
  mode,
}: {
  result: NfaToRegexResult
  currentStep: number
  mode: NotationMode
}): JSX.Element {
  const step = result.steps[currentStep]
  const isLastStep = currentStep === result.steps.length - 1

  // The step note explains what happened at this elimination step.
  const note = step?.note ?? ''

  // Determine what to show in the regex region.
  // On the final step (or if the language resolved) show the result;
  // otherwise the note is the primary explanation.
  const showFinalResult = isLastStep || result.steps.length === 1

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      {/* Step explanation */}
      {note && (
        <div className="text-sm text-text-mid font-mono border-b border-border pb-3">
          <span className="text-xs font-sans text-text-low uppercase tracking-wide block mb-1">
            Step {currentStep + 1} of {result.steps.length}
          </span>
          {note}
        </div>
      )}

      {/* Regex result region */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-sans text-text-low uppercase tracking-wide">
          {showFinalResult ? 'Result' : 'Running'}
        </span>

        {result.isEmptyLanguage ? (
          // Empty language: render the literal empty-set glyph only; no parse round-trip.
          <span
            className="font-mono text-lg text-text-hi break-all"
            aria-label="empty language"
            data-testid="n2r-final-regex"
          >
            {'∅'}
          </span>
        ) : showFinalResult && result.regex !== null ? (
          // Final step: render the eliminated regex via formatRegex in the requested
          // notation mode. result.regex is the completed START->ACCEPT label and is
          // independent of currentStep, so it is only shown once elimination is done.
          <span
            className="font-mono text-lg text-text-hi break-all"
            data-testid="n2r-final-regex"
          >
            {formatRegex(result.regex, mode)}
          </span>
        ) : (
          // Intermediate step: the final regex is not yet "reached", so show the
          // in-progress placeholder rather than revealing the finished answer under
          // a "Running" heading. The step note above explains each elimination.
          <span className="font-mono text-sm text-text-low italic">
            elimination in progress
          </span>
        )}
      </div>
    </div>
  )
}
