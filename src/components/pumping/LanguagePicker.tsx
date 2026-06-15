import type { JSX } from 'react'
import type { NonRegularLanguage } from '@/core/pumping/nonRegularLanguages'

// LanguagePicker: a flex-wrap of 44px preset buttons, one per non-regular language,
// followed by the selected language's course-notation definition in font-mono. The
// button pattern is copied from ClosureView's preset-button block: aria-pressed, brand-
// tint when selected, border-brand/30 to match the tint. The definition row mirrors
// the source-selection "Source:" label row in ClosureView (font-mono text-text-low).
//
// The definition rendered here is the course-notation set definition (e.g.
// { aⁿbⁿ : n ≥ 0 }). Σ is mode-invariant in this context.

interface LanguagePickerProps {
  languages: readonly NonRegularLanguage[]
  selectedId: string
  onSelect: (id: string) => void
}

export function LanguagePicker({
  languages,
  selectedId,
  onSelect,
}: LanguagePickerProps): JSX.Element {
  const selected = languages.find(l => l.id === selectedId)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {languages.map(lang => (
          <button
            key={lang.id}
            type="button"
            aria-pressed={lang.id === selectedId}
            onClick={() => onSelect(lang.id)}
            data-testid={`pumping-language-${lang.id}`}
            className={
              'px-3 min-h-[44px] rounded-lg text-sm font-mono transition-colors border ' +
              (lang.id === selectedId
                ? 'bg-brand-tint text-brand-hover border-brand/30'
                : 'bg-surface-raised text-text-mid border-border hover:text-text-hi hover:border-border-strong')
            }
          >
            {lang.label}
          </button>
        ))}
      </div>
      {selected && (
        // The course-notation definition. Rendered font-mono so Σ, superscripts,
        // and set-builder notation read as symbolic content (CLAUDE.md token rule).
        <div className="font-mono text-sm text-text-mid px-1">
          {selected.definition}
        </div>
      )}
    </div>
  )
}
