import { KeyboardEvent } from 'react'
import { useNotation } from './useNotation'
import { NotationMode } from './glyphs'

// The two options are defined here so they are easy to extend or reorder.
const OPTIONS: { mode: NotationMode; label: string; glyphs: string }[] = [
  { mode: 'course', label: 'Course', glyphs: '+ λ' },
  { mode: 'textbook', label: 'Textbook', glyphs: '| ε' },
]

/**
 * Segmented control that toggles the active notation between Course (+ λ)
 * and Textbook (| ε). Presentation-only: it sets a React context value and
 * never touches the AST, NFA, or DFA.
 *
 * ARIA pattern: role="radiogroup" with two role="radio" children.
 * The current option has aria-checked="true".
 * Arrow keys move between options (left/right and up/down).
 * Space and Enter also activate the focused option.
 */
export function NotationToggle() {
  const { mode, setMode } = useNotation()

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const idx = OPTIONS.findIndex(o => o.mode === mode)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = OPTIONS[(idx + 1) % OPTIONS.length]
      setMode(next.mode)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = OPTIONS[(idx - 1 + OPTIONS.length) % OPTIONS.length]
      setMode(prev.mode)
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Notation"
      className="flex rounded-lg border border-border bg-surface-raised p-0.5 gap-0.5"
      onKeyDown={handleKeyDown}
    >
      {OPTIONS.map(option => {
        const isSelected = mode === option.mode
        return (
          <button
            key={option.mode}
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => setMode(option.mode)}
            // Space and Enter are already handled by the native button behavior,
            // but radio groups also need arrow keys (handled on the group above).
            className={[
              'flex flex-col items-center justify-center',
              'min-h-[44px] min-w-[56px] px-3 py-1.5',
              'rounded-md transition-colors',
              'cursor-pointer select-none',
              isSelected
                ? 'bg-brand text-on-brand'
                : 'text-text-mid hover:text-text hover:bg-brand-tint',
            ].join(' ')}
          >
            <span className="text-xs font-sans leading-none text-current">
              {option.label}
            </span>
            <span className="font-mono text-sm leading-tight tracking-tight mt-0.5">
              {option.glyphs}
            </span>
          </button>
        )
      })}
    </div>
  )
}
