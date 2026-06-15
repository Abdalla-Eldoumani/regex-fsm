import type { JSX } from 'react'

// TooLargeNotice: the single SAFETY-01 surface for constructions that hit a hard
// cap. Reused by EditorView (Plan 05) and shared-URL decode (Plan 12). The icon
// is aria-hidden; the role=status text is the accessible announcement.
//
// Warning tokens (bg-warning/10 + border-warning/30 + text-warning) come from
// the design system's feedback palette — never color alone; icon + text paired.
export function TooLargeNotice({
  message,
  partial,
}: {
  message: string
  partial?: { states: number }
}): JSX.Element {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4"
    >
      {/* Warning triangle — aria-hidden because the text carries the meaning */}
      <svg
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 shrink-0 text-warning"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>

      <div className="space-y-1">
        <p className="text-sm font-medium text-warning">{message}</p>
        {partial !== undefined && (
          <p className="text-sm text-text-mid">
            Reached {partial.states} state{partial.states === 1 ? '' : 's'} before stopping.
          </p>
        )}
      </div>
    </div>
  )
}
