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

    // Instance lifecycle effect — only depends on automaton and savePositions
    useEffect(() => {
      if (!containerRef.current) return

      automatonRef.current = automaton
      const elements = automatonToCytoscape(automaton)
      const allElements = [...elements.nodes, ...elements.edges]

      const cachedPositions = layoutCache.getPositions(automaton)
      let layoutConfig: LayoutOptions

      if (cachedPositions) {
        layoutConfig = {
          name: 'preset',
          positions: cachedPositions,
          fit: true,
          padding: 30
        } as LayoutOptions
      } else {
        layoutConfig = selectLayout(automaton)
      }

      cyRef.current = cytoscape({
        container: containerRef.current,
        elements: allElements,
        style: getStylesheet(),
        layout: layoutConfig,
      })

      if (!cachedPositions) {
        cyRef.current.one('layoutstop', savePositions)
      }

      cyRef.current.on('dragfree', 'node', savePositions)

      return () => {
        cyRef.current?.destroy()
        cyRef.current = null
      }
    }, [automaton, savePositions])

    // Event listener effect — separate so callback changes don't recreate Cytoscape
    useEffect(() => {
      const cy = cyRef.current
      if (!cy) return

      const nodeHandler = (e: cytoscape.EventObject) => {
        onNodeClick?.(e.target.id())
      }
      const edgeHandler = (e: cytoscape.EventObject) => {
        onEdgeClick?.(e.target.id())
      }

      cy.on('tap', 'node', nodeHandler)
      cy.on('tap', 'edge', edgeHandler)

      return () => {
        cy.off('tap', 'node', nodeHandler)
        cy.off('tap', 'edge', edgeHandler)
      }
    }, [automaton, onNodeClick, onEdgeClick])

    // Apply the current highlight set. The class swap is a static path
    // highlight with no JS-driven Cytoscape tween, so it is correct under
    // prefers-reduced-motion by construction (DESIGN-04: edge traversal becomes
    // a static highlight, the active pulse stops). Kept as a stable callback so
    // the matchMedia change listener below can re-run it.
    const applyHighlights = useCallback(() => {
      const cy = cyRef.current
      if (!cy) return

      cy.startBatch()
      cy.nodes().removeClass('active')
      cy.edges().removeClass('active')

      highlightStates.forEach(stateId => {
        cy.$id(stateId).addClass('active')
      })

      highlightEdges.forEach(edgeId => {
        cy.$id(edgeId).addClass('active')
      })
      cy.endBatch()
    }, [highlightStates, highlightEdges])

    // Highlight effect — use batch mode for performance.
    useEffect(() => {
      applyHighlights()
    }, [applyHighlights])

    // Reduced-motion effect (DESIGN-04). The highlight above never starts an
    // animated transition, so the only work here is re-applying the current
    // highlight state when the user toggles the OS reduce-motion setting live,
    // so the graph reflects the change without recreating the instance.
    useEffect(() => {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)')
      const handleChange = () => {
        applyHighlights()
      }
      prefersReduced.addEventListener('change', handleChange)
      return () => {
        prefersReduced.removeEventListener('change', handleChange)
      }
    }, [applyHighlights])

    return <div ref={containerRef} className="w-full h-full" />
  }
)
