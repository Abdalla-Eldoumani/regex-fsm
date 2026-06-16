import { useEffect, useId, useRef, useState } from 'react'
import type { JSX } from 'react'
import type cytoscape from 'cytoscape'
import type { Automaton } from '@/core/automata/types'
import { exportAsPNG, exportAsSVG, downloadText } from '@/visualization/export'
import { automatonToTikZ } from '@/visualization/automatonToTikZ'
import { automatonToMarkdown } from '@/visualization/automatonToMarkdown'
import { automatonToCSV } from '@/visualization/automatonToCSV'

// The Export surface (SHARE-03). It folds in the legacy bare PNG/SVG buttons and
// adds LaTeX (TikZ), Markdown, and CSV, so the action row gains formats without
// gaining width pressure. The surface is the SecondaryMenu aria-expanded dropdown
// at md+ (anchored, dismiss on outside mousedown) and a bottom-sheet dialog at the
// 360px floor (docked bottom, max-h, overflow-y-auto) so the five rows never
// overflow a narrow screen.
//
// Image formats download via the existing blob helpers (PNG from the live cy
// handle, SVG from the corrected model-driven serializer). Text formats copy to
// the clipboard with the same icon + text role=status confirmation as Share, and
// offer a download too. As the bottom-sheet dialog it reuses the TourDialog
// escapable-focus model: focus moves in on open, Tab is contained, Escape and an
// always-present 44px Close release it and restore focus to the Export trigger.

// Reuse the TourDialog focusable selector so the contained-Tab cycle matches the
// rest of the app's dialogs.
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

// How long a copy confirmation stays before reverting. The text swap is instant;
// the optional tint fade is a token transition the reduced-motion reset stills.
const COPY_REVERT_MS = 2000

type GetCy = () => cytoscape.Core | null | undefined

const rowClass =
  'cursor-pointer w-full min-h-[44px] px-3 py-2 flex items-start gap-3 rounded-md text-left ' +
  'text-text hover:text-text-hi hover:bg-surface-raised transition-colors'

// One export row: a format label + a one-line descriptor, plus a copy-confirm swap
// for the text formats (icon + text, never color alone). Declared at module scope
// so it is a stable component, not re-created on every ExportMenu render.
function ExportRow({
  testid,
  label,
  descriptor,
  onClick,
  copied = false,
}: {
  testid: string
  label: string
  descriptor: string
  onClick: () => void
  copied?: boolean
}): JSX.Element {
  return (
    <button type="button" onClick={onClick} className={rowClass} data-testid={testid}>
      <span className="mt-0.5 shrink-0 text-text-mid" aria-hidden="true">
        {copied ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-state-accept">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
        )}
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold">{copied ? 'Copied to the clipboard' : label}</span>
        <span className="text-xs text-text-mid">{descriptor}</span>
      </span>
    </button>
  )
}

export function ExportMenu({
  automaton,
  getCy,
}: {
  automaton: Automaton
  getCy: GetCy
}): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleId = useId()

  // Dismiss on outside mousedown, the SecondaryMenu contract. The bottom sheet at
  // 360px is inside the same container, so a tap outside the sheet also closes it.
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [isOpen])

  // Escapable focus while open: move focus into the panel, contain Tab, and on
  // Escape close and restore focus to the trigger (2.4.3 / 2.1.2).
  useEffect(() => {
    if (!isOpen) return
    const panel = panelRef.current
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    function onKeyDown(e: KeyboardEvent) {
      const p = panelRef.current
      if (!p) return
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
        triggerRef.current?.focus()
        return
      }
      if (e.key === 'Tab') {
        const items = Array.from(p.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (el) => !el.hasAttribute('disabled')
        )
        if (items.length === 0) {
          e.preventDefault()
          return
        }
        const first = items[0]
        const last = items[items.length - 1]
        const active = document.activeElement
        if (e.shiftKey && (active === first || active === p)) {
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
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
    }
  }, [])

  function confirmCopy(format: string) {
    setCopiedFormat(format)
    if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopiedFormat(null), COPY_REVERT_MS)
  }

  // Copy a text export to the clipboard, then offer a download too so a missing
  // or rejecting clipboard never loses the export. The confirmation is icon + text.
  async function copyText(format: string, content: string, filename: string, mime: string) {
    const clipboard = navigator.clipboard
    if (clipboard && typeof clipboard.writeText === 'function') {
      try {
        await clipboard.writeText(content)
        confirmCopy(format)
      } catch {
        // Fall through to the download so the export is never lost.
        downloadText(filename, content, mime)
      }
    } else {
      downloadText(filename, content, mime)
    }
  }

  function handleSvg() {
    exportAsSVG(automaton, 'automaton.svg')
    setIsOpen(false)
  }

  function handlePng() {
    const cy = getCy()
    if (cy) exportAsPNG(cy, 'automaton.png')
    setIsOpen(false)
  }

  function handleTikz() {
    void copyText('tikz', automatonToTikZ(automaton), 'automaton.tex', 'text/x-tex;charset=utf-8')
  }

  function handleMarkdown() {
    void copyText('markdown', automatonToMarkdown(automaton), 'automaton.md', 'text/markdown;charset=utf-8')
  }

  function handleCsv() {
    void copyText('csv', automatonToCSV(automaton), 'automaton.csv', 'text/csv;charset=utf-8')
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="cursor-pointer min-h-[44px] px-4 py-2 text-xs font-semibold text-text-mid hover:text-brand-hover border border-border hover:border-border-strong bg-surface-raised hover:bg-surface-overlay rounded-lg transition-all shadow-sm hover:scale-105 active:scale-95 flex items-center gap-2"
        title="Export this automaton"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        data-testid="export-open"
      >
        {/* Download glyph -- aria-hidden; "Export" carries the meaning. */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
          <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
          <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
        </svg>
        Export
      </button>

      {isOpen && (
        // The scrim only renders at the 360px floor (md:contents removes it from
        // the flow at md+, where the panel is an anchored dropdown). A tap on the
        // scrim closes the sheet.
        <div
          className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-md flex flex-col justify-end md:contents md:bg-transparent md:backdrop-blur-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false)
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-testid="export-menu"
            className={
              'w-full bg-surface-overlay border border-border shadow-lg p-2 ' +
              'rounded-t-lg max-h-[85vh] overflow-y-auto ' +
              'md:absolute md:right-0 md:top-full md:mt-2 md:w-72 md:rounded-lg md:max-h-none'
            }
          >
            <div className="flex items-center justify-between px-2 py-1 md:hidden">
              <h2 id={titleId} className="text-sm font-display font-bold text-text-hi">
                Export
              </h2>
              {/* 44px Close, always present so the sheet is escapable by pointer. */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  triggerRef.current?.focus()
                }}
                className="cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-text-low hover:text-text-hi hover:bg-surface-raised transition-all"
                title="Close (Esc)"
                aria-label="Close export menu"
                data-testid="export-close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            {/* At md+ a hidden labelled heading keeps the dialog name for AT. */}
            <h2 id={titleId} className="sr-only hidden md:block">
              Export
            </h2>

            <ExportRow testid="export-svg" label="SVG image" descriptor="Download automaton.svg" onClick={handleSvg} />
            <ExportRow testid="export-png" label="PNG image" descriptor="Download automaton.png" onClick={handlePng} />
            <ExportRow testid="export-tikz" label="LaTeX (TikZ)" descriptor="Copy the tikzpicture" onClick={handleTikz} copied={copiedFormat === 'tikz'} />
            <ExportRow testid="export-markdown" label="Markdown table" descriptor="Copy the GitHub table" onClick={handleMarkdown} copied={copiedFormat === 'markdown'} />
            <ExportRow testid="export-csv" label="CSV table" descriptor="Copy the quoted CSV" onClick={handleCsv} copied={copiedFormat === 'csv'} />
          </div>
        </div>
      )}
    </div>
  )
}
