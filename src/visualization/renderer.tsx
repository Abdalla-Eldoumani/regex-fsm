import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import cytoscape, { Core } from 'cytoscape'
import { Automaton } from '@/core/automata/types'
import { automatonToCytoscape } from './cytoscape-config'
import { getStylesheet } from './styles'
import { selectLayout } from './layout'

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

    useImperativeHandle(ref, () => ({
      getCytoscapeInstance: () => cyRef.current,
    }))

  useEffect(() => {
    if (!containerRef.current) return

    const elements = automatonToCytoscape(automaton)
    const allElements = [...elements.nodes, ...elements.edges]

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: allElements,
      style: getStylesheet(),
      layout: selectLayout(automaton),
    })

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
  }, [automaton, onNodeClick, onEdgeClick])

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
