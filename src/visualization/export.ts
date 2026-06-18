import cytoscape from 'cytoscape'
import { Automaton } from '@/core/automata/types'
import { automatonToSVG, type SvgColors, type Pt } from './automatonToSVG'
import { layoutCache } from './layoutCache'

// Read a theme token from :root, the same bridge styles.ts uses, so an exported
// file matches the live design tokens instead of a stale hardcoded palette.
// Fallbacks mirror the design-system spec hex. This stays the live-token bridge
// for every export path: the pure serializers take colors as an argument, and this
// reader is where those colors are resolved at click time (after index.css loads).
function token(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

// Resolve the eight export colors from the live tokens once. These are the exact
// tokens styles.ts reads, so an exported SVG matches the on-screen graph: the
// state-semantic fills carry through and the non-color cues (double ring, dashed
// trap, start arrow) draw in the right colors.
function readSvgColors(): SvgColors {
  return {
    bg: token('--color-bg', '#0E1117'),
    nodeFill: token('--color-surface-raised', '#1D222D'),
    stroke: token('--color-border-strong', '#626D86'),
    edge: token('--color-text-mid', '#9AA3B5'),
    text: token('--color-text-hi', '#E8EBF2'),
    start: token('--color-state-start', '#56B4E9'),
    accept: token('--color-state-accept', '#2BB17A'),
    trap: token('--color-state-trap', '#CB7BB0'),
  }
}

// Trigger a client-side download of a Blob. Shared by every export path so the
// blob-url lifecycle (create, click, revoke) lives in one place.
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// Download a text payload as a file. Plan 04's export menu calls this for the
// model-driven text formats (TikZ, Markdown, CSV) produced by the pure
// serializers, so each serializer stays a pure string function and the download
// side effect is here.
export function downloadText(
  filename: string,
  content: string,
  mimeType: string = 'text/plain;charset=utf-8'
): void {
  downloadBlob(new Blob([content], { type: mimeType }), filename)
}

export function exportAsPNG(cy: cytoscape.Core, filename: string = 'automaton.png') {
  const png = cy.png({
    output: 'blob',
    bg: token('--color-bg', '#0E1117'),
    full: true,
    scale: 2,
  })

  if (png instanceof Blob) {
    downloadBlob(png, filename)
  }
}

// Corrected SVG export. The old body serialized cy.json straight-line geometry
// inside a fixed 800x600 box, dropping labels and symbols; it is replaced by the
// pure model-driven automatonToSVG, which fixes all seven documented defects.
//
// Signature change for Plan 04: exportAsSVG now takes the Automaton (the
// authoritative model the SVG is built from) instead of the Cytoscape handle,
// because the serializer draws from the model, not the view. Cached layout
// positions are reused when present so the export matches the on-screen layout;
// when absent the serializer computes its own deterministic placement. Plan 04
// wires the AutomatonView call site to pass the automaton.
export function exportAsSVG(automaton: Automaton, filename: string = 'automaton.svg') {
  const cached = layoutCache.getPositions(automaton)
  const positions: Record<string, Pt> = cached ?? {}
  const svg = automatonToSVG(automaton, positions, readSvgColors())
  downloadText(filename, svg, 'image/svg+xml')
}
