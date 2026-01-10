import cytoscape from 'cytoscape'

export function exportAsPNG(cy: cytoscape.Core, filename: string = 'automaton.png') {
  const png = cy.png({
    output: 'blob',
    bg: '#1e1e2e',
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

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="100%" height="100%" fill="#1e1e2e"/>
    <g>`

  nodes.forEach((node) => {
    const x = node.position?.x || 0
    const y = node.position?.y || 0
    const id = node.data?.id || ''
    svg += `<circle cx="${x}" cy="${y}" r="20" fill="#313244" stroke="#6c7086" stroke-width="2"/>
      <text x="${x}" y="${y + 5}" text-anchor="middle" fill="#cdd6f4" font-size="14">${id}</text>`
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
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#6c7086" stroke-width="2" marker-end="url(#arrowhead)"/>`
    }
  })

  svg += `</g>
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
        <polygon points="0 0, 10 3, 0 6" fill="#6c7086"/>
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
