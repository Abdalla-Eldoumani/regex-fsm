import { useState, useRef, useEffect } from 'react'
import { useWalkthrough } from '@/hooks/useWalkthrough'
import { Walkthrough } from '@/types/walkthrough'
import { uiTourWalkthrough } from '@/data/walkthroughs/uiTour'
import { algorithmWalkthroughs } from '@/data/walkthroughs/algorithmWalkthroughs'

const allWalkthroughs: Walkthrough[] = [
  uiTourWalkthrough,
  ...algorithmWalkthroughs,
]

export function WalkthroughToggle() {
  const { start, state } = useWalkthrough()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  function handleSelect(wt: Walkthrough) {
    setIsOpen(false)
    start(wt)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={state.active}
        className="cursor-pointer w-9 h-9 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Guided Tours"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 via-transparent to-secondary/10">
            <h3 className="text-sm font-display font-bold text-text-primary">Guided Tours</h3>
            <p className="text-xs text-text-tertiary mt-0.5">Learn how the app works</p>
          </div>
          <div className="py-2 max-h-80 overflow-y-auto">
            {allWalkthroughs.map(wt => (
              <button
                key={wt.id}
                onClick={() => handleSelect(wt)}
                className="cursor-pointer w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors"
              >
                <div className="text-sm font-semibold text-text-primary">{wt.name}</div>
                <div className="text-xs text-text-tertiary mt-0.5">{wt.description}</div>
                <div className="text-[10px] text-text-muted mt-1">{wt.steps.length} steps</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
