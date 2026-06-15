import cytoscape from 'cytoscape'

// Read a theme token from :root, the same bridge styles.ts uses, so an exported
// file matches the live design tokens instead of a stale hardcoded palette.
// Fallbacks mirror .agent/DESIGN_SYSTEM.md. Full export-color fidelity (per-role
// fills, the non-color cues) and TikZ output are Phase 12; this only removes the
// stale Catppuccin hex and points export at the live tokens.
function token(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export function exportAsPNG(cy: cytoscape.Core, filename: string = 'automaton.png') {
  const png = cy.png({
    output: 'blob',
    bg: token('--color-bg', '#0E1117'),
    full: true,
    scale: 2,
  })

  if (png instanceof Blob) {
    const url = URL.createObjectURL(png)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }
}

export function exportAsSVG(cy: cytoscape.Core, filename: string = 'automaton.svg') {
  const json = cy.json()
  const nodes = json.elements?.nodes || []
  const edges = json.elements?.edges || []

  const bg = token('--color-bg', '#0E1117')
  const nodeFill = token('--color-surface-raised', '#1D222D')
  const stroke = token('--color-border-strong', '#626D86')
  const edgeColor = token('--color-text-mid', '#9AA3B5')
  const nodeText = token('--color-text-hi', '#E8EBF2')

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="100%" height="100%" fill="${bg}"/>
    <g>`

  nodes.forEach((node) => {
    const x = node.position?.x || 0
    const y = node.position?.y || 0
    const id = node.data?.id || ''
    svg += `<circle cx="${x}" cy="${y}" r="20" fill="${nodeFill}" stroke="${stroke}" stroke-width="2"/>
      <text x="${x}" y="${y + 5}" text-anchor="middle" fill="${nodeText}" font-size="14">${id}</text>`
  })

  edges.forEach((edge) => {
    const edgeData = edge.data as { source?: string; target?: string; label?: string }
    const sourceId = edgeData.source
    const targetId = edgeData.target

    const sourceNode = nodes.find((n) => n.data?.id === sourceId)
    const targetNode = nodes.find((n) => n.data?.id === targetId)

    if (sourceNode?.position && targetNode?.position) {
      const x1 = sourceNode.position.x
      const y1 = sourceNode.position.y
      const x2 = targetNode.position.x
      const y2 = targetNode.position.y
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${edgeColor}" stroke-width="2" marker-end="url(#arrowhead)"/>`
    }
  })

  svg += `</g>
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
        <polygon points="0 0, 10 3, 0 6" fill="${edgeColor}"/>
      </marker>
    </defs>
  </svg>`

  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportAsJSON(cy: cytoscape.Core, filename: string = 'automaton.json') {
  const json = cy.json()
  const jsonStr = JSON.stringify(json, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
