import { useRef } from 'react'
import type { JSX } from 'react'
import { useTour } from '@/hooks/useTour'

// The header trigger that replaces WalkthroughToggle in both Layout slots (the
// swap itself happens in a later plan). It reuses the chrome-button shape at the
// same 44px footprint so the header layout and the 768px row are unchanged. It
// is a labeled button (not icon-only): aria-haspopup="dialog" and aria-expanded
// reflect the tour state, and it opens the one course path. The element that
// launched the tour is recorded as the controller's restore target, so focus
// returns here on close (2.4.3).
export function TourLauncher(): JSX.Element {
  const { open, close, state, triggerRef } = useTour()
  const buttonRef = useRef<HTMLButtonElement>(null)

  function handleClick() {
    if (state.isOpen) {
      close()
      return
    }
    // Record the launching control so focus restores to it on close.
    triggerRef.current = buttonRef.current
    open('course')
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      className="cursor-pointer min-w-[44px] min-h-[44px] px-3 rounded-lg bg-surface-raised border border-border flex items-center gap-2 text-sm font-medium text-text-mid hover:text-brand-hover transition-colors"
      title="Guided tour"
      aria-haspopup="dialog"
      aria-expanded={state.isOpen}
      data-testid="tour-launch"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5 shrink-0"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      Guided tour
    </button>
  )
}
