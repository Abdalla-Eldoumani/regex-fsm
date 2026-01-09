import { ElementDefinition } from 'cytoscape'
import { Automaton } from '@/core/automata/types'

export interface CytoscapeNode extends ElementDefinition {
  data: {
    id: string
    label: string
    isStart?: boolean
    isAccept?: boolean
    isActive?: boolean
    isCurrent?: boolean
  }
}

export interface CytoscapeEdge extends ElementDefinition {
  data: {
    id: string
    source: string
    target: string
    label: string
    isActive?: boolean
  }
  classes?: string
}

export interface CytoscapeElements {
  nodes: CytoscapeNode[]
  edges: CytoscapeEdge[]
}

export function automatonToCytoscape(automaton: Automaton): CytoscapeElements {
  const nodes: CytoscapeNode[] = automaton.states.map(s => ({
    data: {
      id: s.id,
      label: s.label || s.id,
      isStart: s.id === automaton.startState,
      isAccept: automaton.acceptStates.includes(s.id),
    },
  }))

  const edges: CytoscapeEdge[] = automaton.transitions.map((t, i) => {
    const isLoop = t.from === t.to
    return {
      data: {
        id: `e${i}`,
        source: t.from,
        target: t.to,
        label: t.symbol ?? 'ε',
      },
      classes: isLoop ? 'loop' : '',
    }
  })

  return { nodes, edges }
}

export function updateHighlights(
  elements: CytoscapeElements,
  highlightStates: string[],
  highlightEdges: string[]
): CytoscapeElements {
  const highlightStateSet = new Set(highlightStates)
  const highlightEdgeSet = new Set(highlightEdges)

  const nodes = elements.nodes.map(n => ({
    ...n,
    data: {
      ...n.data,
      isActive: highlightStateSet.has(n.data.id),
    },
  }))

  const edges = elements.edges.map(e => ({
    ...e,
    data: {
      ...e.data,
      isActive: highlightEdgeSet.has(e.data.id),
    },
  }))

  return { nodes, edges }
}
