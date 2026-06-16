import { describe, it, expect, vi } from 'vitest'
import { useRef, useState } from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useTourDialog } from '@/hooks/useTourDialog'

// A small harness that mounts the hook the same way TourDialog will: a trigger
// button outside the panel (the restore target), and a panel holding a focusable
// heading plus Back / Next / Close controls. isOpen and stepIndex are driven by
// buttons so a test can open, change step, and close, then inspect focus.
function Harness({
  onClose,
  onNext,
  onPrev,
}: {
  onClose: () => void
  onNext: () => void
  onPrev: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useTourDialog(panelRef, {
    isOpen,
    stepIndex,
    onClose,
    onNext,
    onPrev,
    triggerRef,
  })

  return (
    <div>
      <button
        ref={triggerRef}
        data-testid="harness-trigger"
        onClick={() => setIsOpen(true)}
      >
        Launch
      </button>
      {/* harness-only controls to drive the hook inputs from a test */}
      <button data-testid="harness-step" onClick={() => setStepIndex(s => s + 1)}>
        bump step
      </button>
      <button data-testid="harness-hide" onClick={() => setIsOpen(false)}>
        hide
      </button>
      {isOpen && (
        <div ref={panelRef} role="dialog" aria-modal="true">
          <h2 data-tour-title tabIndex={-1} data-testid="panel-title">
            Step {stepIndex}
          </h2>
          <button data-testid="panel-back">Back</button>
          <button data-testid="panel-next">Next</button>
          <button data-testid="panel-close">Close</button>
        </div>
      )}
    </div>
  )
}

function renderHarness() {
  const onClose = vi.fn()
  const onNext = vi.fn()
  const onPrev = vi.fn()
  render(<Harness onClose={onClose} onNext={onNext} onPrev={onPrev} />)
  return { onClose, onNext, onPrev }
}

describe('useTourDialog', () => {
  describe('focus into the dialog', () => {
    it('moves focus to the title heading on open', async () => {
      renderHarness()
      await userEvent.click(screen.getByTestId('harness-trigger'))
      expect(document.activeElement).toBe(screen.getByTestId('panel-title'))
    })

    it('re-focuses the title heading on every step change', async () => {
      renderHarness()
      await userEvent.click(screen.getByTestId('harness-trigger'))
      // Move focus off the heading, then bump the step; the hook must pull focus
      // back to the new step heading (WCAG 2.4.3).
      screen.getByTestId('panel-next').focus()
      expect(document.activeElement).toBe(screen.getByTestId('panel-next'))
      await userEvent.click(screen.getByTestId('harness-step'))
      expect(document.activeElement).toBe(screen.getByTestId('panel-title'))
    })
  })

  describe('keyboard handling', () => {
    it('Escape calls onClose', async () => {
      const { onClose } = renderHarness()
      await userEvent.click(screen.getByTestId('harness-trigger'))
      await userEvent.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('ArrowRight calls onNext', async () => {
      const { onNext } = renderHarness()
      await userEvent.click(screen.getByTestId('harness-trigger'))
      await userEvent.keyboard('{ArrowRight}')
      expect(onNext).toHaveBeenCalledTimes(1)
    })

    it('ArrowLeft calls onPrev', async () => {
      const { onPrev } = renderHarness()
      await userEvent.click(screen.getByTestId('harness-trigger'))
      await userEvent.keyboard('{ArrowLeft}')
      expect(onPrev).toHaveBeenCalledTimes(1)
    })
  })

  describe('tab containment', () => {
    // The title heading carries tabIndex=-1, so it is NOT a Tab stop; the cycle
    // is the real controls Back / Next / Close. Tab from the last wraps to the
    // first, and Shift+Tab from the first wraps to the last, so focus never
    // escapes the panel to the page body behind it.
    it('Tab from the last focusable wraps to the first', async () => {
      renderHarness()
      await userEvent.click(screen.getByTestId('harness-trigger'))
      const close = screen.getByTestId('panel-close')
      close.focus()
      expect(document.activeElement).toBe(close)
      await userEvent.keyboard('{Tab}')
      expect(document.activeElement).toBe(screen.getByTestId('panel-back'))
    })

    it('Shift+Tab from the first focusable wraps to the last', async () => {
      renderHarness()
      await userEvent.click(screen.getByTestId('harness-trigger'))
      const back = screen.getByTestId('panel-back')
      back.focus()
      expect(document.activeElement).toBe(back)
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
      expect(document.activeElement).toBe(screen.getByTestId('panel-close'))
    })
  })

  describe('restore on close', () => {
    it('returns focus to the launching trigger when the dialog closes', async () => {
      renderHarness()
      const trigger = screen.getByTestId('harness-trigger')
      await userEvent.click(trigger)
      // Sanity: focus is inside the dialog now, not on the trigger.
      expect(document.activeElement).not.toBe(trigger)
      await act(async () => {
        screen.getByTestId('harness-hide').click()
      })
      expect(document.activeElement).toBe(trigger)
    })
  })
})
