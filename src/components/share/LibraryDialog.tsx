import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { ShareState } from '@/share/shareCodec'
import type { SavedEntry, SaveResult } from '@/share/savedLibrary'

// The saved-automata library dialog (SHARE-04). It reuses the TourDialog /
// SimulationModal scrim + escapable-focus model: a role=dialog aria-modal sheet
// (bottom sheet at 360px, centered card at md+), focus moved in on open, Tab
// contained, Escape and the always-present 44px Close release it and restore focus
// to the launcher.
//
// The library API (list / save / load / delete) arrives as props so the parent
// owns the wiring and this stays a presentational dialog. Two states are surfaced
// per 12-UI-SPEC: a QuotaExceededError save returns the typed failure, which shows
// the quota notice with the prior list intact and the failed entry not added; a
// corrupt read fails soft to an empty list upstream, so the dialog shows the calm
// empty state, never an error. Save success shows an icon + text confirmation.

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

interface LibraryDialogProps {
  isOpen: boolean
  onClose: () => void
  // Snapshot the current scratchpad as a ShareState for Save.
  buildPayload: () => ShareState
  // Apply a saved entry by id (the parent re-validates through the SHARE-02 codec).
  onLoad: (id: string) => void
  listSaved: () => SavedEntry[]
  saveCurrent: (name: string, state: ShareState) => SaveResult
  deleteSaved: (id: string) => void
}

function formatSavedAt(ms: number): string {
  try {
    return new Date(ms).toLocaleString()
  } catch {
    return ''
  }
}

export function LibraryDialog({
  isOpen,
  onClose,
  buildPayload,
  onLoad,
  listSaved,
  saveCurrent,
  deleteSaved,
}: LibraryDialogProps): JSX.Element | null {
  // The list is read from storage via a lazy initializer (fail-soft empty on a
  // corrupt read, handled in the store) so no open-effect setState is needed; the
  // parent remounts this dialog on each open, so the initializer runs fresh and
  // reflects the current store. refresh() re-reads after a mutation, an event-
  // handler call, not an effect.
  const [entries, setEntries] = useState<SavedEntry[]>(() => listSaved())
  const [name, setName] = useState('')
  const [quotaError, setQuotaError] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  // The restore target is the element focused at mount (the launcher), captured
  // once via a lazy ref initializer rather than a setState-in-effect.
  const [triggerEl] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null
  )
  const titleId = useId()

  // Re-read the list from storage after a mutation so the dialog reflects the
  // persisted state. Called only from event handlers, never an effect.
  const refresh = useCallback(() => {
    setEntries(listSaved())
  }, [listSaved])

  // Move focus into the dialog on mount, and restore it to the launcher on
  // unmount (the parent unmounts the dialog on close, so the cleanup is the close
  // path). Focus-only (no setState), so it does not trigger a render cascade.
  // Mirrors the TourDialog open/close focus contract (2.4.3).
  useEffect(() => {
    const panel = panelRef.current
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    return () => {
      triggerEl?.focus()
    }
  }, [triggerEl])

  // Escapable focus while open: Escape closes, Tab is contained. Escape and Close
  // both release the containment so it is never a hard trap (2.1.2).
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
      if (e.key === 'Tab') {
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (el) => !el.hasAttribute('disabled')
        )
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
  }, [isOpen, onClose])

  if (!isOpen) return null

  function handleSave() {
    const result = saveCurrent(name.trim() || 'Untitled automaton', buildPayload())
    if (result.ok) {
      // Success: clear any prior notice, confirm, clear the name, and refresh so
      // the new entry appears at the top (the store prepends most-recent first).
      setQuotaError(false)
      setSaveError(false)
      setJustSaved(true)
      setName('')
      refresh()
    } else if (result.reason === 'quota') {
      // A full store: surface the quota notice. The prior list is untouched (the
      // store only rewrites on a successful write), so it stays visible.
      setQuotaError(true)
      setSaveError(false)
      setJustSaved(false)
    } else {
      setSaveError(true)
      setQuotaError(false)
      setJustSaved(false)
    }
  }

  function handleDelete(id: string) {
    deleteSaved(id)
    refresh()
  }

  function handleScrimClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-md flex flex-col justify-end md:justify-center md:items-center"
      onClick={handleScrimClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="library-dialog"
        className="relative w-full md:max-w-lg bg-surface-overlay border border-border rounded-t-lg md:rounded-lg shadow-lg max-h-[85vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-text-low hover:text-text-hi hover:bg-surface-raised transition-all"
          title="Close (Esc)"
          aria-label="Close saved automata"
          data-testid="library-close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        <div className="p-6 pr-16 flex flex-col gap-5">
          <h2 id={titleId} className="text-xl font-display font-bold text-text-hi">
            Saved automata
          </h2>

          {/* Save current: name + Save. */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ends in ab"
                aria-label="Name for the saved automaton"
                data-testid="library-name"
                className="flex-1 min-h-[44px] rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-hi placeholder:text-text-low"
              />
              <button
                type="button"
                onClick={handleSave}
                className="cursor-pointer min-h-[44px] px-5 py-2 text-sm font-semibold text-on-brand bg-brand hover:bg-brand-hover rounded-lg transition-colors shadow-sm"
                data-testid="library-save"
              >
                Save
              </button>
            </div>

            {justSaved && (
              <div role="status" data-testid="library-saved" className="flex items-center gap-2 text-xs text-state-accept">
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                <span>Saved</span>
              </div>
            )}

            {quotaError && (
              <div role="status" data-testid="library-quota" className="flex items-start gap-2 rounded-lg border border-error/30 bg-error/10 p-3 text-xs text-error">
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span>Storage is full. Delete a saved automaton to free space, then try again.</span>
              </div>
            )}

            {saveError && (
              <div role="status" className="flex items-start gap-2 rounded-lg border border-error/30 bg-error/10 p-3 text-xs text-error">
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span>Could not save the automaton. Try again.</span>
              </div>
            )}
          </div>

          {/* List, most-recent first. Empty state is calm, not an error. */}
          {entries.length === 0 ? (
            <div data-testid="library-empty" className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface px-4 py-8 text-center">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-text-low">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
              <p className="text-sm font-medium text-text-mid">No saved automata yet.</p>
              <p className="text-xs text-text-low">Name the current automaton above and choose Save to keep it here.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2" data-testid="library-list">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-sm text-text-hi">{entry.name}</span>
                    <span className="text-xs text-text-mid">{formatSavedAt(entry.savedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onLoad(entry.id)}
                      className="cursor-pointer min-h-[44px] px-4 py-2 text-xs font-semibold text-brand-hover border border-brand/40 bg-brand-tint hover:bg-brand-tint/70 rounded-lg transition-colors"
                      data-testid="library-load"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="cursor-pointer min-h-[44px] px-4 py-2 text-xs font-semibold text-error border border-error/30 bg-error/10 hover:bg-error/20 rounded-lg transition-colors flex items-center gap-1.5"
                      data-testid="library-delete"
                    >
                      <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M8.75 1a1 1 0 00-.96.73L7.42 3H4a1 1 0 000 2h12a1 1 0 100-2h-3.42l-.37-1.27A1 1 0 0011.25 1h-2.5zM6 7a1 1 0 011 1v7a1 1 0 11-2 0V8a1 1 0 011-1zm4 0a1 1 0 011 1v7a1 1 0 11-2 0V8a1 1 0 011-1zm4 0a1 1 0 011 1v7a1 1 0 11-2 0V8a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
