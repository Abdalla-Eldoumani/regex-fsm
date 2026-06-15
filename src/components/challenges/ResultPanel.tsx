import type { JSX } from 'react'
import type { Equivalence } from '@/core/algorithms/equivalence'

// Lambda glyph for the empty-string counterexample. The equivalence walk returns
// the empty string as a legal counterexample when the start pair is the witness;
// the course writes the empty string as lambda, never a blank span (Pitfall 3).
const LAMBDA = 'λ'

// The feedback surface for a graded submission. It renders nothing until the
// student submits (verdict === null), a success state when the languages match,
// and the shortest counterexample plus the direction of the error when they do
// not. There is no grading logic here: the verdict is decided entirely by
// gradeChallenge (language equivalence, never shape, SKILL invariant 8); this
// component only displays it.
//
// The counterexample is React text content inside a font-mono chip, so it is
// auto-escaped and never interpreted as HTML (threat T-09-13). Every feedback
// state pairs a color token with an icon and text, so the meaning never rests on
// color alone.
export function ResultPanel({ verdict }: { verdict: Equivalence | null }): JSX.Element | null {
  if (verdict === null) return null

  if (verdict.equivalent) {
    return (
      <div
        role="status"
        data-testid="challenge-result-success"
        className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4"
      >
        {/* Check mark — aria-hidden because the text below carries the meaning */}
        <svg
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-success"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M16.704 5.29a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06l2.97 2.97 6.97-6.97a.75.75 0 011.06 0z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-sm font-medium text-success">
          Your construction is language-equivalent to the target.
        </p>
      </div>
    )
  }

  // The empty string is a legal counterexample; render it as the literal lambda so
  // the chip is never blank.
  const counterexample = verdict.counterexample === '' ? LAMBDA : verdict.counterexample

  // Direction wording uses the exact words "accepts" / "rejects" so the meaning is
  // plain and the e2e can assert it. acceptedBy is fixed by gradeChallenge's
  // argument order (student first), so 'student' is a wrongly-accepted string and
  // 'reference' is a wrongly-rejected one.
  const direction =
    verdict.acceptedBy === 'student'
      ? 'Your machine accepts this string, but it should reject it.'
      : 'Your machine rejects this string, but it should accept it.'

  return (
    <div
      role="status"
      data-testid="challenge-result-wrong"
      className="flex flex-col gap-3 rounded-xl border border-error/30 bg-error/10 p-4"
    >
      <div className="flex items-start gap-3">
        {/* Warning triangle — aria-hidden; the text below is the announcement */}
        <svg
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-error"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-sm font-medium text-error">Not equivalent yet. Shortest counterexample:</p>
      </div>

      {/* The distinguishing string in JetBrains Mono. The empty string shows as
          the literal lambda, never a blank chip. */}
      <code
        data-testid="challenge-counterexample"
        className="self-start rounded-md border border-error/30 bg-bg px-3 py-1.5 font-mono text-sm text-text-hi"
      >
        {counterexample}
      </code>

      <p data-testid="challenge-direction" className="text-sm text-text-mid">
        {direction}
      </p>
    </div>
  )
}
