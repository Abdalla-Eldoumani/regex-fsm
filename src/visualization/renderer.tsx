import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react'
import cytoscape, { Core, LayoutOptions } from 'cytoscape'
import { Automaton } from '@/core/automata/types'
import { automatonToCytoscape } from './cytoscape-config'
import { getStylesheet } from './styles'
import { selectLayout } from './layout'
import { layoutCache } from './layoutCache'

export interface AutomatonGraphProps {
  automaton: Automaton
  highlightStates?: string[]
  highlightEdges?: string[]
  onNodeClick?: (nodeId: string) => void
  onEdgeClick?: (edgeId: string) => void
}

export interface AutomatonGraphHandle {
  getCytoscapeInstance: () => Core | null
}

export const AutomatonGraph = forwardRef<AutomatonGraphHandle, AutomatonGraphProps>(
  (
    {
      automaton,
      highlightStates = [],
      highlightEdges = [],
      onNodeClick,
      onEdgeClick,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const cyRef = useRef<Core | null>(null)
    const automatonRef = useRef<Automaton | null>(null)

    // Save positions to cache on drag end
    const savePositions = useCallback(() => {
      if (!cyRef.current || !automatonRef.current) return

      const positions: Record<string, { x: number; y: number }> = {}
      cyRef.current.nodes().forEach(node => {
        const pos = node.position()
        positions[node.id()] = { x: pos.x, y: pos.y }
      })
      layoutCache.setPositions(automatonRef.current, positions)
    }, [])

    useImperativeHandle(ref, () => ({
      getCytoscapeInstance: () => cyRef.current,
    }))

  useEffect(() => {
    if (!containerRef.current) return

    automatonRef.current = automaton
    const elements = automatonToCytoscape(automaton)
    const allElements = [...elements.nodes, ...elements.edges]

    // Check for cached positions
    const cachedPositions = layoutCache.getPositions(automaton)
    let layoutConfig: LayoutOptions

    if (cachedPositions) {
      // Use preset layout with cached positions
      layoutConfig = {
        name: 'preset',
        positions: (node: { id: () => string }) => {
          const pos = cachedPositions[node.id()]
          return pos || { x: 0, y: 0 }
        },
        fit: true,
        padding: 30
      }
    } else {
      layoutConfig = selectLayout(automaton)
    }

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: allElements,
      style: getStylesheet(),
      layout: layoutConfig,
    })

    // Save positions after initial layout completes
    if (!cachedPositions) {
      cyRef.current.one('layoutstop', savePositions)
    }

    // Save positions when nodes are dragged
    cyRef.current.on('dragfree', 'node', savePositions)

    if (onNodeClick) {
      cyRef.current.on('tap', 'node', e => {
        onNodeClick(e.target.id())
      })
    }

    if (onEdgeClick) {
      cyRef.current.on('tap', 'edge', e => {
        onEdgeClick(e.target.id())
      })
    }

    return () => {
      cyRef.current?.destroy()
      cyRef.current = null
    }
  }, [automaton, onNodeClick, onEdgeClick, savePositions])

  useEffect(() => {
    if (!cyRef.current) return

    cyRef.current.nodes().removeClass('active')
    cyRef.current.edges().removeClass('active')

    highlightStates.forEach(stateId => {
      cyRef.current?.$id(stateId).addClass('active')
    })

    highlightEdges.forEach(edgeId => {
      cyRef.current?.$id(edgeId).addClass('active')
    })
  }, [highlightStates, highlightEdges])

    return <div ref={containerRef} className="w-full h-full" />
  }
)
