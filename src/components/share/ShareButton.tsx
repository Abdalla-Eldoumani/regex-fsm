import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'

// The Share control (SHARE-01). It lives in the AutomatonView action row beside
// Export, as a same-shape chrome button. Activating it builds the compressed hash
// URL for the current scratchpad (the parent owns toShareState + buildShareHash
// and passes a buildHash callback so this stays a presentational control) and
// writes the full URL to the clipboard.
//
// The contract is icon + text, never color alone: on a successful copy the button
// swaps to a check glyph plus "Link copied" and a role=status announces it for a
// screen reader; it reverts to "Share" after a short timeout. On a clipboard that
// is unavailable or rejects, it reveals a selectable read-only font-mono URL field
// with an error-idiom notice so copy is always possible by hand -- never a silent
// failure (threat T-12-18). The URL is rendered through React text only; it is our
// own encoded payload, never an HTML sink.

type CopyState = 'idle' | 'copied' | 'failed'

// The confirmed state reverts after this long. The text swap is instant and
// JS-driven; the only animated part is an optional tint fade the global
// reduced-motion reset stills, so this timing does not depend on motion.
const REVERT_MS = 2000

export function ShareButton({ buildHash }: { buildHash: () => string }): JSX.Element {
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [fallbackUrl, setFallbackUrl] = useState('')
  const fallbackRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear the revert timer on unmount so a late callback cannot set state on an
  // unmounted component.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  // Build the absolute URL the recipient opens: the current origin and path with
  // the hash payload appended, so the link reproduces this exact scratchpad.
  function buildUrl(): string {
    const { origin, pathname } = window.location
    return `${origin}${pathname}${buildHash()}`
  }

  function scheduleRevert() {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopyState('idle'), REVERT_MS)
  }

  // Reveal the manual-copy fallback: a read-only field pre-filled with the URL,
  // selected so the student can copy it by hand. This is the no-silent-failure
  // path when navigator.clipboard is absent or rejects.
  function revealFallback(url: string) {
    setFallbackUrl(url)
    setCopyState('failed')
    // Select the field on the next frame, after it has rendered.
    requestAnimationFrame(() => {
      fallbackRef.current?.focus()
      fallbackRef.current?.select()
    })
  }

  async function handleShare() {
    const url = buildUrl()
    const clipboard = navigator.clipboard
    if (!clipboard || typeof clipboard.writeText !== 'function') {
      revealFallback(url)
      return
    }
    try {
      await clipboard.writeText(url)
      setCopyState('copied')
      setFallbackUrl('')
      scheduleRevert()
    } catch {
      // A rejected write (permission denied, insecure context) degrades to the
      // manual fallback rather than failing silently.
      revealFallback(url)
    }
  }

  const buttonClass =
    'cursor-pointer min-h-[44px] px-4 py-2 text-xs font-semibold border rounded-lg transition-all shadow-sm hover:scale-105 active:scale-95 flex items-center gap-2 ' +
    (copyState === 'copied'
      ? 'text-state-accept border-state-accept/40 bg-state-accept-soft'
      : 'text-text-mid hover:text-brand-hover border-border hover:border-border-strong bg-surface-raised hover:bg-surface-overlay')

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleShare}
        className={buttonClass}
        title="Copy a shareable link to this workspace"
        data-testid="share-copy"
      >
        {copyState === 'copied' ? (
          <>
            {/* Check glyph -- aria-hidden; "Link copied" carries the meaning. */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
            Link copied
          </>
        ) : (
          <>
            {/* Link glyph -- aria-hidden; "Share" carries the meaning. */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
              <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
            </svg>
            Share
          </>
        )}
      </button>

      {/* Screen-reader announcement on a successful copy. role=status is polite,
          so it is read once when the text changes. */}
      <span className="sr-only" role="status">
        {copyState === 'copied' ? 'Share link copied to the clipboard' : ''}
      </span>

      {copyState === 'failed' && (
        <div
          role="status"
          data-testid="share-copy-fallback"
          className="flex flex-col gap-2 rounded-lg border border-error/30 bg-error/10 p-3"
        >
          <div className="flex items-center gap-2 text-xs text-error">
            {/* Alert glyph -- aria-hidden; the text carries the meaning. */}
            <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span>Could not copy the link. Select and copy it from the box below.</span>
          </div>
          <input
            ref={fallbackRef}
            type="text"
            readOnly
            value={fallbackUrl}
            aria-label="Shareable link"
            data-testid="share-copy-url"
            className="w-full min-h-[44px] rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-text-hi"
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      )}
    </div>
  )
}
