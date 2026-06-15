import type { JSX } from 'react'

// A presentational picker: a wrapped row of 44px buttons, one per exercise, with
// the selected one marked aria-pressed and tinted with the brand wash. It mirrors
// the ClosureView preset row. No grading or selection logic lives here; the caller
// owns the selected id and the onSelect handler.
export function ExercisePicker({
  exercises,
  selectedId,
  onSelect,
}: {
  exercises: ReadonlyArray<{ id: string; label: string }>
  selectedId: string
  onSelect: (id: string) => void
}): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {exercises.map(ex => {
        const active = ex.id === selectedId
        return (
          <button
            key={ex.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(ex.id)}
            data-testid={`challenge-pick-${ex.id}`}
            className={
              'min-h-[44px] px-4 rounded-lg text-sm font-medium transition-colors border ' +
              (active
                ? 'bg-brand-tint text-brand-hover border-brand/30'
                : 'bg-surface-raised text-text-mid border-border hover:text-text-hi hover:border-border-strong')
            }
          >
            {ex.label}
          </button>
        )
      })}
    </div>
  )
}
