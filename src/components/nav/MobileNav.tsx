import { useEffect, useId, useRef, useState } from 'react'
import type { JSX } from 'react'
import { NavLink } from 'react-router-dom'

// The eight destinations in main.tsx route order. The path is the fixed
// allow-list string, never interpolated from anything a user types, so a row can
// only ever navigate to a known in-app route. The arrow in the NFA-to-Regex
// label is the course glyph the desktop nav row uses (U+2192).
const ROUTES: { to: string; label: string }[] = [
  { to: '/', label: 'Home' },
  { to: '/editor', label: 'Editor' },
  { to: '/multi', label: 'Multi-View' },
  { to: '/n2r', label: 'NFA→Regex' },
  { to: '/closure', label: 'Closure' },
  { to: '/pumping', label: 'Pumping' },
  { to: '/challenges', label: 'Challenges' },
  { to: '/simulate', label: 'Simulate' },
]

// The sub-md navigation affordance. Below 768px the desktop link row is hidden
// (Layout's hidden md:flex), so the eight routes are otherwise unreachable; this
// disclosure puts every one back one tap away.
//
// It is its OWN disclosure, deliberately not nested inside SecondaryMenu. The
// SecondaryMenu closes on any outside mousedown, which would unmount this trigger
// the moment a control elsewhere is clicked and break focus-restore-to-trigger
// (2.4.3) -- the standalone-trigger lesson from the guided tour launcher. So this
// component owns its open state, its own menu ref, its own Escape handler, and
// its own focus-in / focus-restore.
//
// The containment is escapable, never a hard trap: there is no Tab wrap, Escape
// always closes, an outside mousedown closes, and the trigger stays mounted
// (the Layout slot is flex md:hidden) so focus restores to it reliably. The
// entrance is a CSS-only transition so the global prefers-reduced-motion reset
// in src/index.css stills it without a JS gate (A11Y-05).
//
// event.key string comparisons are used, not the deprecated numeric key code.
export function MobileNav(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  // A stable per-instance id wires the trigger's aria-controls to the panel id.
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on an outside mousedown while open, mirroring the SecondaryMenu idiom
  // but with this component's OWN ref. The listener is added only while open and
  // removed on close or unmount, so it never leaks and never fires while closed.
  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e: MouseEvent) {
      const menu = menuRef.current
      const trigger = triggerRef.current
      const target = e.target as Node
      // A click on the trigger is handled by its own onClick (which toggles), so
      // ignore it here to avoid a double close-then-open on the same press.
      if (menu?.contains(target) || trigger?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Move focus INTO the first menu item on open. The items render in the same
  // pass that flips isOpen, so this effect runs after they are in the DOM.
  useEffect(() => {
    if (!isOpen) return
    const menu = menuRef.current
    if (!menu) return
    menu.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }, [isOpen])

  // Restore focus to the trigger on close (2.4.3). .focus() on a hidden node is a
  // no-op that drops focus to <body>, and the trigger's slot is width-gated
  // (flex md:hidden), so after trying the trigger confirm focus landed; if the
  // viewport crossed into md+ mid-interaction and the trigger is hidden, leave
  // focus where the navigation put it rather than stranding it on <body>. This
  // "did focus take" probe mirrors useTourDialog (layout is not computed in the
  // unit environment, so a geometry check would misreport every node as hidden).
  const wasOpen = useRef(false)
  useEffect(() => {
    if (isOpen) {
      wasOpen.current = true
      return
    }
    if (!wasOpen.current) return
    wasOpen.current = false
    triggerRef.current?.focus()
  }, [isOpen])

  // Escape closes from anywhere inside the menu (2.1.2). A keydown on the panel
  // is enough: focus is inside the menu whenever it is open (focus-in on open),
  // and Escape from the trigger is handled by the same panel-scoped listener
  // because the trigger sits just outside the panel and the panel handler runs
  // only while open. Keep it on the wrapper so both the trigger and the items
  // are covered without a document-level listener.
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  return (
    // The wrapper is relative so the panel docks directly under the trigger with
    // no absolute pixel math; it is right-anchored and width-capped to the
    // viewport so it adds no horizontal overflow at the 360px floor.
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(open => !open)}
        className="cursor-pointer min-w-[44px] min-h-[44px] rounded-lg bg-surface-raised border border-border flex items-center justify-center text-text-mid hover:text-brand-hover transition-colors"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        data-testid="mobilenav-toggle"
      >
        {/* hamburger glyph -- the aria-label carries the meaning for AT */}
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
          <path d="M3 5h14M3 10h14M3 15h14" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Site navigation"
          data-testid="mobilenav-menu"
          className="absolute right-0 top-full mt-2 min-w-[12rem] max-w-[calc(100vw-2rem)] bg-surface-overlay border border-border rounded-lg shadow-lg z-50 p-2 flex flex-col gap-1 translate-y-0 transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)]"
        >
          {ROUTES.map(route => (
            <NavLink
              key={route.to}
              to={route.to}
              // Home is index-exact so it is not active on every nested route.
              end={route.to === '/'}
              role="menuitem"
              // NavLink applies this only to the active row (react-router v7
              // gates aria-current to isActive), so the active state is named in
              // the a11y tree, not carried by the brand tint alone (A11Y-04).
              aria-current="page"
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                'min-h-[44px] flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ' +
                (isActive
                  ? 'bg-brand-tint text-brand-hover border border-brand/30'
                  : 'text-text-mid hover:text-text-hi hover:bg-surface-raised border border-transparent')
              }
            >
              {route.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}
