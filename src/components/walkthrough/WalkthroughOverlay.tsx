import { useEffect, useState, useCallback, useRef } from 'react'

interface WalkthroughOverlayProps {
  targetSelector: string
}

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

export function WalkthroughOverlay({ targetSelector }: WalkthroughOverlayProps) {
  const [rect, setRect] = useState<SpotlightRect | null>(null)
  const rafRef = useRef(0)

  const updateRect = useCallback(() => {
    if (targetSelector === 'center') {
      setRect(null)
      return
    }
    const el = document.querySelector(`[data-walkthrough="${targetSelector}"]`)
    if (!el) {
      setRect(null)
      return
    }
    const r = el.getBoundingClientRect()
    setRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    })
  }, [targetSelector])

  // RAF-throttled version for scroll/resize
  const throttledUpdateRect = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      updateRect()
    })
  }, [updateRect])

  useEffect(() => {
    if (targetSelector !== 'center') {
      const el = document.querySelector(`[data-walkthrough="${targetSelector}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    const timer = setTimeout(updateRect, 350)

    window.addEventListener('scroll', throttledUpdateRect, true)
    window.addEventListener('resize', throttledUpdateRect)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('scroll', throttledUpdateRect, true)
      window.removeEventListener('resize', throttledUpdateRect)
    }
  }, [targetSelector, updateRect, throttledUpdateRect])

  const pad = 8

  // pointer-events: none so users can scroll the page freely
  // The tooltip component handles its own pointer-events
  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="walkthrough-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - pad}
                y={rect.top - pad}
                width={rect.width + pad * 2}
                height={rect.height + pad * 2}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#walkthrough-mask)"
        />
      </svg>
      {/* Spotlight border ring */}
      {rect && (
        <div
          className="absolute border-2 border-primary rounded-xl shadow-[0_0_0_4px_rgba(99,102,241,0.2)] transition-all duration-300"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
          }}
        />
      )}
    </div>
  )
}
