import { useEffect, useState, useRef, useCallback } from 'react'
import { useWalkthrough } from '@/hooks/useWalkthrough'

interface TooltipPos {
  top: number
  left: number
}

export function WalkthroughTooltip() {
  const { currentStep, currentWalkthrough, state, totalSteps, next, prev, skip } = useWalkthrough()
  const [pos, setPos] = useState<TooltipPos>({ top: 0, left: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)

  const updatePosition = useCallback(() => {
    if (!currentStep || !tooltipRef.current) return

    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const tw = tooltipRect.width || 380
    const th = tooltipRect.height || 200
    const pad = 16
    const vh = window.innerHeight
    const vw = window.innerWidth

    if (currentStep.targetSelector === 'center') {
      setPos({
        top: vh / 2 - th / 2,
        left: vw / 2 - tw / 2,
      })
      return
    }

    const el = document.querySelector(`[data-walkthrough="${currentStep.targetSelector}"]`)
    if (!el) {
      setPos({
        top: vh / 2 - th / 2,
        left: vw / 2 - tw / 2,
      })
      return
    }

    // Viewport-relative rect — no scrollY needed since we use fixed positioning
    const r = el.getBoundingClientRect()
    let top = 0
    let left = 0

    // Try the preferred position first
    switch (currentStep.position) {
      case 'bottom':
        top = r.bottom + pad
        left = r.left + r.width / 2 - tw / 2
        break
      case 'top':
        top = r.top - th - pad
        left = r.left + r.width / 2 - tw / 2
        break
      case 'right':
        top = r.top + r.height / 2 - th / 2
        left = r.right + pad
        break
      case 'left':
        top = r.top + r.height / 2 - th / 2
        left = r.left - tw - pad
        break
      case 'center':
        top = vh / 2 - th / 2
        left = vw / 2 - tw / 2
        break
    }

    // If tooltip would go off the bottom of the viewport, try placing it above
    if (top + th > vh - pad && currentStep.position === 'bottom') {
      top = r.top - th - pad
    }
    // If it would go off the top, try below
    if (top < pad && currentStep.position === 'top') {
      top = r.bottom + pad
    }
    // If left/right doesn't fit, try bottom
    if ((left + tw > vw - pad || left < pad) && (currentStep.position === 'left' || currentStep.position === 'right')) {
      top = r.bottom + pad
      left = r.left + r.width / 2 - tw / 2
      if (top + th > vh - pad) {
        top = r.top - th - pad
      }
    }

    // Final clamp to viewport
    left = Math.max(pad, Math.min(left, vw - tw - pad))
    top = Math.max(pad, Math.min(top, vh - th - pad))

    setPos({ top, left })
  }, [currentStep])

  // RAF-throttled version for scroll/resize
  const throttledUpdatePosition = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      updatePosition()
    })
  }, [updatePosition])

  useEffect(() => {
    if (!currentStep) return

    const timer = setTimeout(updatePosition, 400)

    window.addEventListener('scroll', throttledUpdatePosition, true)
    window.addEventListener('resize', throttledUpdatePosition)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('scroll', throttledUpdatePosition, true)
      window.removeEventListener('resize', throttledUpdatePosition)
    }
  }, [currentStep, updatePosition, throttledUpdatePosition])

  if (!currentStep || !currentWalkthrough) return null

  const isFirst = state.stepIndex === 0
  const isLast = state.stepIndex === totalSteps - 1

  return (
    /* Tooltip card uses surface-overlay (the overlay surface tier) */
    <div
      ref={tooltipRef}
      className="fixed z-[9999] w-[380px] max-w-[calc(100vw-32px)] bg-surface-overlay border border-border rounded-lg shadow-lg pointer-events-auto"
      style={{ top: pos.top, left: pos.left }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-surface-raised rounded-t-lg">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand"></div>
            <span className="text-xs font-bold text-text-low uppercase tracking-label">
              {currentWalkthrough.name}
            </span>
          </div>
          <span className="text-xs font-mono text-text-low">
            {state.stepIndex + 1} / {totalSteps}
          </span>
        </div>
        <h3 className="text-lg font-display font-bold text-text-hi">{currentStep.title}</h3>
      </div>

      {/* Content */}
      <div className="px-5 py-4 max-h-[40vh] overflow-y-auto">
        <p className="text-sm text-text-mid leading-relaxed whitespace-pre-line">
          {currentStep.description}
        </p>
        {currentStep.lectureRef && (
          <p className="mt-3 text-xs text-brand-hover font-medium">
            Lecture reference: {currentStep.lectureRef}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="mx-5 h-1 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-brand rounded-full transition-all duration-300"
          style={{ width: `${((state.stepIndex + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Controls */}
      <div className="px-5 py-4 flex items-center justify-between">
        <button
          onClick={skip}
          className="cursor-pointer min-h-[44px] px-2 text-xs text-text-low hover:text-text-hi transition-colors"
        >
          Skip Tour
        </button>
        <div className="flex gap-2">
          {!isFirst && (
            <button
              onClick={prev}
              className="cursor-pointer px-4 min-h-[44px] text-xs font-semibold text-text-mid border border-border rounded-lg hover:border-border-strong hover:text-text-hi transition-all"
            >
              Back
            </button>
          )}
          <button
            onClick={next}
            className="cursor-pointer px-4 min-h-[44px] text-xs font-semibold text-on-brand bg-brand hover:bg-brand-hover rounded-lg shadow-sm transition-all"
          >
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
