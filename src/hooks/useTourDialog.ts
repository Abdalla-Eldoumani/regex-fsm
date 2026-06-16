import { useEffect } from 'react'
import type { RefObject } from 'react'

// Escapable focus management for the tour dialog.
//
// The containment is deliberately escapable. Moving focus into the dialog on
// open and on every step change, and restoring it to the trigger on close,
// satisfies WCAG 2.4.3 (focus order). Wrapping Tab within the dialog keeps a
// keyboard user on the step controls, but Escape always closes and a 44px Close
// is always in the cycle, so the ring is releasable -- it satisfies WCAG 2.1.2
// (no keyboard trap) rather than becoming a hard trap. The global focus-visible
// ring (src/index.css) is never overridden, so every landing is visible (2.4.7).
//
// event.key string comparisons are used throughout, not the deprecated numeric
// key-code property.

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function useTourDialog(
  panelRef: RefObject<HTMLDivElement | null>,
  opts: {
    isOpen: boolean
    // Re-focus the heading whenever this changes so a keyboard or screen-reader
    // user is carried to the new step content (2.4.3).
    stepIndex: number
    onClose: () => void
    onNext: () => void
    onPrev: () => void
    // The restore target on close (the launcher that opened the tour).
    triggerRef: RefObject<HTMLElement | null>
  }
): void {
  const { isOpen, stepIndex, onClose, onNext, onPrev, triggerRef } = opts

  // Move focus INTO the dialog on open and on every step change. The title
  // heading carries tabIndex=-1 so it is programmatically focusable without
  // being a Tab stop; fall back to the first focusable control if it is absent.
  useEffect(() => {
    if (!isOpen) return
    const panel = panelRef.current
    if (!panel) return
    const heading = panel.querySelector<HTMLElement>('[data-tour-title]')
    ;(heading ?? panel.querySelector<HTMLElement>(FOCUSABLE))?.focus()
  }, [isOpen, stepIndex, panelRef])

  // Restore focus to the launcher when the dialog closes (2.4.3).
  useEffect(() => {
    if (isOpen) return
    triggerRef.current?.focus()
  }, [isOpen, triggerRef])

  // Key handling: Escape closes (2.1.2), Arrow keys advance / retreat as an
  // extra affordance, and Tab / Shift+Tab wrap within the focusable controls so
  // the containment holds without trapping (Escape and Close always release it).
  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      const panel = panelRef.current
      if (!panel) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        onNext()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onPrev()
        return
      }
      if (e.key === 'Tab') {
        const items = Array.from(
          panel.querySelectorAll<HTMLElement>(FOCUSABLE)
        ).filter(el => !el.hasAttribute('disabled'))
        if (items.length === 0) {
          e.preventDefault()
          return
        }
        const first = items[0]
        const last = items[items.length - 1]
        const active = document.activeElement
        if (e.shiftKey && (active === first || active === panel)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose, onNext, onPrev, panelRef])
}
