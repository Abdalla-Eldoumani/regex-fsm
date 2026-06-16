import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { JSX, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotation } from '@/notation/useNotation'
import { useTour } from '@/hooks/useTour'
import { buildNavigationCommands, buildGlobalCommands } from './commandRegistry'
import type { Command } from './commandRegistry'

// The command palette: a role="dialog" aria-modal surface opened by Ctrl/Cmd+K
// (and a header trigger), reusing the tour's escapable-focus pattern. Focus moves
// into the filter input on open; Escape closes and focus restores to the opener;
// Tab is contained but never trapped. The filter is treated as DATA -- a plain
// case-insensitive substring match over each command's label and keywords, never
// a constructed RegExp, never eval, never injected as HTML. The entrance is a
// CSS transition only, so the global prefers-reduced-motion reset (src/index.css)
// stills it with no JS gate. event.key string comparisons throughout.

const PALETTE_DIALOG_ID = 'command-palette-panel'

interface CommandPaletteContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
}

// Context and provider co-locate so the header trigger and the single dialog
// share one open state.
const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
})

// eslint-disable-next-line react-refresh/only-export-components
export function useCommandPalette(): CommandPaletteContextValue {
  return useContext(CommandPaletteContext)
}

// Owns the single open/close state and the one global Ctrl/Cmd+K keydown, so the
// header trigger and the dialog share one source of truth. The listener is
// registered once on mount and removed on unmount, and it preventDefaults ONLY
// on its own chord -- every other keystroke (including normal typing in inputs)
// passes through untouched. The open chord is honored even from inside a field
// because it is a global command.
export function CommandPaletteProvider({ children }: { children: ReactNode }): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isPaletteChord = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')
      if (!isPaletteChord) return
      // Only this chord is intercepted; nothing else is swallowed.
      e.preventDefault()
      setIsOpen(prev => !prev)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close])

  return (
    <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>
  )
}

// The discoverable header trigger. A 44px chrome button in the SecondaryMenu
// shape, a magnifier glyph that is aria-hidden plus the accessible name, and from
// sm+ a font-mono hint pill naming the keybinding so the chord is learnable. It
// reports aria-expanded reflecting the palette state.
export function PaletteOpenButton(): JSX.Element {
  const { isOpen, open } = useCommandPalette()

  return (
    <button
      type="button"
      onClick={open}
      className="cursor-pointer min-w-[44px] min-h-[44px] px-2 sm:px-3 rounded-lg bg-surface-raised border border-border flex items-center gap-2 text-sm font-medium text-text-mid hover:text-brand-hover transition-colors"
      title="Search and commands"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-controls={PALETTE_DIALOG_ID}
      data-testid="palette-open"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5 shrink-0"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
          clipRule="evenodd"
        />
      </svg>
      <span className="sr-only sm:hidden">Search and commands</span>
      <span className="hidden sm:inline-flex items-center gap-1 font-mono text-xs text-text-low">
        <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface">Ctrl</kbd>
        <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface">K</kbd>
      </span>
    </button>
  )
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

// Case-insensitive plain substring match over the label and keywords. The query
// is data: toLowerCase + includes only, never a constructed RegExp and never
// eval, so a query like "a+b*" or "(" can never be interpreted as a pattern.
function matchesQuery(command: Command, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (q === '') return true
  const haystack = `${command.label} ${command.keywords ?? ''}`.toLowerCase()
  return haystack.includes(q)
}

// Group caption: navigation rows read "Go to", action rows read "Action".
function captionFor(command: Command): string {
  return command.id.startsWith('nav-') ? 'Go to' : 'Action'
}

// The open dialog body. It is mounted only while the palette is open, so its
// query and cursor start fresh on every open with no reset effect, and the
// focus-restore lives in an unmount cleanup. Built where useNavigate,
// useNotation, and useTour are available so the run thunks have router +
// notation + tour context; each run is wrapped to also close the palette.
function CommandPaletteDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const navigate = useNavigate()
  const { mode, setMode } = useNotation()
  const { open: openTour } = useTour()

  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const titleId = useId()
  const listId = useId()
  const optionIdPrefix = useId()

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  // The full registry: 8 route navigations plus the two global actions. Each run
  // is wrapped so running a command also closes the palette. mode is read here so
  // the toggle flips against the live value.
  const commands = useMemo<Command[]>(() => {
    const nav = buildNavigationCommands(navigate)
    const global = buildGlobalCommands({
      toggleNotation: () => setMode(mode === 'course' ? 'textbook' : 'course'),
      openTour: () => openTour('course'),
    })
    return [...nav, ...global].map(command => ({
      ...command,
      run: () => {
        command.run()
        onClose()
      },
    }))
  }, [navigate, mode, setMode, openTour, onClose])

  const filtered = useMemo(
    () => commands.filter(command => matchesQuery(command, query)),
    [commands, query]
  )

  // Focus moves INTO the filter input on mount (the useTourDialog focus-in
  // landing), and restores to whatever was focused before open on unmount. The
  // "did focus take" probe mirrors useTourDialog: .focus() on a hidden node is a
  // no-op that drops focus to <body>, so after trying the recorded opener,
  // confirm it landed; if not, fall back to the visible palette-open trigger so
  // focus is never stranded.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    inputRef.current?.focus()
    return () => {
      if (!opener) return
      opener.focus()
      if (document.activeElement === opener) return
      const trigger = document.querySelector<HTMLElement>('[data-testid="palette-open"]')
      if (trigger && trigger !== opener) trigger.focus()
    }
  }, [])

  // Clamp the cursor whenever the filtered list shrinks past it (a derived value
  // read during render, never a setState in an effect).
  const safeIndex = activeIndex < filtered.length ? activeIndex : 0
  const activeOptionId =
    filtered.length > 0 ? `${optionIdPrefix}-${filtered[safeIndex]?.id ?? ''}` : undefined

  function handleScrimClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  // Escape always closes (escapable, not a hard trap). Arrow keys move the active
  // option, wrapping at the ends. Enter runs the active command. Tab/Shift+Tab
  // are contained within the panel's focusables, but Escape and the input always
  // release the ring.
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (filtered.length === 0) return
      setActiveIndex((safeIndex + 1) % filtered.length)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (filtered.length === 0) return
      setActiveIndex((safeIndex - 1 + filtered.length) % filtered.length)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      filtered[safeIndex]?.run()
      return
    }
    if (e.key === 'Tab') {
      const panel = panelRef.current
      if (!panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        el => !el.hasAttribute('disabled')
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

  return (
    // Scrim: the shared dark backdrop. The sheet docks bottom at the 360px floor
    // and centers toward the top third from md. A tap on the scrim closes it.
    <div
      className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-md flex flex-col justify-end md:justify-start md:items-center md:pt-24"
      onClick={handleScrimClick}
    >
      <div
        ref={panelRef}
        id={PALETTE_DIALOG_ID}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="palette-dialog"
        onKeyDown={handleKeyDown}
        className={
          'relative w-full md:max-w-lg bg-surface-overlay border border-border ' +
          'rounded-t-lg md:rounded-lg shadow-lg max-h-[85vh] overflow-y-auto ' +
          'flex flex-col translate-y-0 transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)]'
        }
      >
        <h2 id={titleId} className="sr-only">
          Command palette
        </h2>

        {/* Filter input: the combobox controlling the listbox. Focus lands here
            on open. aria-activedescendant names the active option so a screen
            reader announces the highlighted row as the user arrows through. */}
        <div className="p-3 border-b border-border">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={activeOptionId}
            aria-label="Filter actions and destinations"
            aria-autocomplete="list"
            placeholder="Type to filter actions and destinations"
            data-testid="palette-input"
            className="w-full min-h-[44px] px-3 font-mono text-sm bg-surface border border-border rounded-lg text-text-hi placeholder:text-text-low focus-visible:outline-none focus-visible:border-brand-hover"
          />
        </div>

        {/* Results: a listbox of option rows. The active row carries the brand
            tint PLUS a non-color leading border bar and aria-selected, so the
            cursor is never signalled by color alone. */}
        <ul
          id={listId}
          role="listbox"
          aria-label="Commands"
          data-testid="palette-list"
          className="flex flex-col py-1"
        >
          {filtered.map((command, index) => {
            const isActive = index === safeIndex
            const optionId = `${optionIdPrefix}-${command.id}`
            return (
              <li
                key={command.id}
                id={optionId}
                role="option"
                aria-selected={isActive}
                data-testid={`palette-option-${command.id}`}
                onClick={() => command.run()}
                onMouseMove={() => setActiveIndex(index)}
                className={
                  'flex items-center justify-between gap-3 min-h-[44px] px-3 cursor-pointer ' +
                  'border-l-2 ' +
                  (isActive
                    ? 'bg-brand-tint border-brand-hover text-text-hi'
                    : 'border-transparent text-text hover:text-brand-hover')
                }
              >
                <span className="font-mono text-sm">{command.label}</span>
                <span className="shrink-0 text-xs text-text-mid">{captionFor(command)}</span>
              </li>
            )
          })}

          {filtered.length === 0 && (
            // Calm empty state: a status row with icon plus text, not an error
            // idiom (no error color, no alert role).
            <li
              role="status"
              data-testid="palette-empty"
              className="flex items-center gap-2 min-h-[44px] px-3 text-sm text-text-mid"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 shrink-0"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
              No matching command.
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

// The mounted-once palette. Renders nothing until opened; mounting the dialog
// only while open keeps the query and cursor fresh per open and lets focus
// restore run as an unmount cleanup.
export function CommandPalette(): JSX.Element | null {
  const { isOpen, close } = useCommandPalette()
  if (!isOpen) return null
  return <CommandPaletteDialog onClose={close} />
}
