import type { JSX } from 'react'

// The loaded-from-share indicator. It appears only when the home view was
// restored from a valid incoming hash, telling the student the scratchpad in
// front of them came from a shared link rather than a fresh session.
//
// It is informational, not an error, so it uses NEUTRAL chrome (surface-raised +
// border + text-mid), never a state-semantic color and never the feedback red. It
// is distinct from the fail-closed banner: that one means "the link failed", this
// one means "the link worked". Dismissible, and the caller keeps it from
// reappearing within the session once dismissed.
export function LoadedFromShareChip({ onDismiss }: { onDismiss: () => void }): JSX.Element {
  return (
    <div
      data-testid="share-loaded"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised pl-3 text-xs text-text-mid"
    >
      {/* Link glyph -- aria-hidden; the text carries the meaning. */}
      <svg
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-text-mid"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
          clipRule="evenodd"
        />
      </svg>

      <span className="font-medium">Loaded from a shared link</span>

      {/* 44px dismiss X. The chip clears for the rest of the session. */}
      <button
        type="button"
        onClick={onDismiss}
        className="cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-text-low hover:text-text-hi transition-colors"
        title="Dismiss shared-link notice"
        aria-label="Dismiss shared-link notice"
        data-testid="share-loaded-dismiss"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  )
}
