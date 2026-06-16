import type { JSX } from 'react'

// The SHARE-02 security crux surfaced visually. When an incoming hash decodes to
// invalid, wrong-version, schema-violating, or oversized state, the app applies
// the safe default workspace and shows THIS one calm banner. It mirrors the
// TooLargeNotice role=status shape but in the error idiom.
//
// It is a banner, not a modal: it does not trap focus and does not block the page,
// because the user is already on a usable default. The copy is LOCKED (12-UI-SPEC):
// it renders fixed text only and NEVER the decoded string, never raw HTML, never a
// stack trace. A failed decode is data that stays data -- the only thing rendered
// is the two fixed lines below, so a crafted payload can reach no sink here.
export function FailClosedNotice({ onDismiss }: { onDismiss: () => void }): JSX.Element {
  return (
    <div
      role="status"
      data-testid="share-failclosed"
      className="flex items-start gap-3 rounded-xl border border-error/30 bg-error/10 p-4"
    >
      {/* Alert glyph -- aria-hidden because the text carries the meaning (icon + text,
          never color alone). */}
      <svg
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 shrink-0 text-error"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>

      <div className="flex-1 space-y-1">
        {/* The two LOCKED copy lines. Calm, non-technical, no raw payload. */}
        <p className="text-sm font-medium text-error">
          This shared link could not be loaded, so the app opened a fresh workspace.
        </p>
        <p className="text-sm text-text-mid">
          The link may be incomplete, out of date, or too large to open here.
        </p>
      </div>

      {/* 44px dismiss X. The notice clears; the safe default workspace stays. */}
      <button
        type="button"
        onClick={onDismiss}
        className="cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-text-low hover:text-text-hi hover:bg-surface-raised transition-all"
        title="Dismiss notice"
        aria-label="Dismiss notice"
        data-testid="share-failclosed-dismiss"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  )
}
