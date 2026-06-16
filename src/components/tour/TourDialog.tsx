import { useId, useRef } from 'react'
import type { JSX } from 'react'
import { useTour } from '@/hooks/useTour'
import { useTourDialog } from '@/hooks/useTourDialog'

// The tour step surface: a bottom sheet at the 360px floor, a centered card at
// md+. It is a role="dialog" aria-modal container labelled by the step title.
// The scrim reuses the SimulationModal look; a tap on the scrim closes the tour
// (a dismiss path beyond Escape and Close). The slide-up is a token transition,
// so the global reduced-motion reset stills it by construction -- no JS gate.
//
// Symbolic fragments in the lesson body are wrapped font-mono. The control row
// mirrors ClosureControls (44px, disabled-at-ends, i / N counter); the focus
// hook is mounted with the panel ref so focus moves in on open and each step and
// restores to the launcher on close. The global :focus-visible ring is never
// overridden.
export function TourDialog(): JSX.Element | null {
  const tour = useTour()
  const { state, currentPath, currentLesson, totalSteps, triggerRef, close, next, prev, openCurrentView } = tour
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useTourDialog(panelRef, {
    isOpen: state.isOpen,
    stepIndex: state.stepIndex,
    onClose: close,
    onNext: next,
    onPrev: prev,
    triggerRef,
  })

  if (!state.isOpen || !currentPath || !currentLesson) return null

  const stepNumber = state.stepIndex + 1
  const isLastStep = state.stepIndex === totalSteps - 1
  const isFirstStep = state.stepIndex === 0
  const progressPercent = totalSteps > 0 ? (stepNumber / totalSteps) * 100 : 0

  const secondaryBtnClass =
    'cursor-pointer px-4 min-h-[44px] bg-surface-raised border border-border rounded-lg ' +
    'text-sm font-medium text-text-mid hover:text-brand-hover hover:border-border-strong ' +
    'transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'

  function handleScrimClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) close()
  }

  return (
    // Scrim: dark backdrop reused from SimulationModal. A tap on the scrim (not
    // the sheet) closes the tour. The sheet docks bottom at the floor, centers
    // from md up; the flex layout positions it without absolute pixel math.
    <div
      className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-md flex flex-col justify-end md:justify-center md:items-center"
      onClick={handleScrimClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="tour-dialog"
        className={
          'relative w-full md:max-w-lg bg-surface-overlay border border-border ' +
          'rounded-t-lg md:rounded-lg shadow-lg max-h-[85vh] overflow-y-auto ' +
          'translate-y-0 transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)]'
        }
      >
        {/* Top-right close: 44px X, always reachable, labelled for AT. */}
        <button
          type="button"
          onClick={close}
          className="absolute top-3 right-3 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-text-low hover:text-text-hi hover:bg-surface-raised transition-all"
          title="Close (Esc)"
          aria-label="Close guided tour"
          data-testid="tour-close-x"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-6 h-6"
            aria-hidden="true"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        <div className="p-6 pr-16 flex flex-col gap-4">
          {/* Header: path micro-label, step title (the aria-labelledby target,
              programmatically focusable), and the i / N counter. */}
          <div className="flex flex-col gap-1">
            <span className="text-xs tracking-label uppercase text-text-mid">
              {currentPath.name}
            </span>
            <div className="flex items-baseline justify-between gap-3">
              <h2
                id={titleId}
                data-tour-title
                tabIndex={-1}
                className="text-xl font-display font-bold text-text-hi focus:outline-none"
              >
                {currentLesson.title}
              </h2>
              <span className="shrink-0 text-xs font-mono text-text-mid" data-testid="tour-counter">
                {stepNumber} / {totalSteps}
              </span>
            </div>
          </div>

          {/* Progress bar: brand fill over the border track, width tracks i / N. */}
          <div className="h-1 w-full bg-border rounded-full overflow-hidden" aria-hidden="true">
            <div
              className="h-full bg-brand transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Lesson body. Paragraphs split on \n; symbolic fragments inside the
              copy are rendered in the body font, but each paragraph is laid out
              so the course notation reads cleanly. */}
          <div className="flex flex-col gap-3 text-sm leading-relaxed text-text">
            {currentLesson.body.split('\n').map((para, i) =>
              para.trim().length === 0 ? null : (
                <p key={i} className="font-mono whitespace-pre-wrap">
                  {para}
                </p>
              )
            )}
          </div>

          {/* Optional lecture reference. */}
          {currentLesson.lectureRef && (
            <p className="text-xs text-brand-hover">
              Lecture reference: {currentLesson.lectureRef}
            </p>
          )}

          {/* Open this view: present only when the lesson targets a route. */}
          {currentLesson.route && (
            <div>
              <button
                type="button"
                onClick={openCurrentView}
                className={secondaryBtnClass}
                aria-label={`Open the view for ${currentLesson.title}`}
                data-testid="tour-open-view"
              >
                Open this view
              </button>
            </div>
          )}

          {/* Control row: mirrors ClosureControls. Back disabled on the first
              step; Next becomes Finish on the last; Close is always present. */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={prev}
              disabled={isFirstStep}
              className={secondaryBtnClass}
              title="Previous step"
              aria-label="Previous lesson"
              data-testid="tour-back"
            >
              <span className="mr-1" aria-hidden="true">&#x25C0;</span> Back
            </button>

            <button
              type="button"
              onClick={next}
              className={
                'cursor-pointer px-6 min-h-[44px] rounded-lg text-sm font-semibold text-on-brand ' +
                'shadow-sm transition-all bg-brand hover:bg-brand-hover'
              }
              title={isLastStep ? 'Finish the tour' : 'Next step'}
              aria-label={isLastStep ? 'Finish guided tour' : 'Next lesson'}
              data-testid="tour-next"
            >
              {isLastStep ? (
                'Finish'
              ) : (
                <>
                  Next <span className="ml-1" aria-hidden="true">&#x25B6;</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={close}
              className={secondaryBtnClass}
              title="Close (Esc)"
              aria-label="Close guided tour"
              data-testid="tour-close"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
