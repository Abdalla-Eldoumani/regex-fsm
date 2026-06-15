import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react'
import cytoscape, { Core, LayoutOptions } from 'cytoscape'
// edgehandles ships no types; the ambient module declaration in vite-env.d.ts
// satisfies the compiler. Registration patches cy.edgehandles() onto the Core
// prototype at module load, so we import for side-effects and cast when calling.
import edgehandles from 'cytoscape-edgehandles'
import { Automaton } from '@/core/automata/types'
import { automatonToCytoscape } from './cytoscape-config'
import { getStylesheet } from './styles'
import { selectLayout } from './layout'
import { layoutCache } from './layoutCache'

// Register the extension once at module load. Multiple calls to cytoscape.use()
// with the same extension are silently ignored by Cytoscape, so this is safe
// even if the module is imported by more than one consumer.
cytoscape.use(edgehandles)

export interface AutomatonGraphProps {
  automaton: Automaton
  highlightStates?: string[]
  highlightEdges?: string[]
  // Cross-pane linked highlight (brand-hover halo via node.linked / edge.linked).
  // Separate from highlightStates/.active (amber simulation role). Fed by the
  // pure correspondence resolver in multiview/correspondence.ts.
  highlightLinked?: string[]
  onNodeClick?: (nodeId: string) => void
  onEdgeClick?: (edgeId: string) => void
  // Additive edit props — all optional so existing call sites are unchanged.
  editable?: boolean
  onAddStateAt?: (x: number, y: number) => void
  // Called with (sourceId, targetId) after the user completes an edge draw.
  // The temp edge is removed before this fires; React re-adds the real edge
  // from authoritative reducer state (Pitfall 3).
  onDrawEdge?: (fromId: string, toId: string) => void
  // Called when the Cytoscape selection changes. Provides node and edge ids.
  // Fires for BOTH editable and non-editable panes (editable owns the edit
  // gestures; read-only panes still emit selection for cross-pane highlighting).
  onSelect?: (nodeIds: string[], edgeIds: string[]) => void
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
      highlightLinked = [],
      onNodeClick,
      onEdgeClick,
      editable = false,
      onAddStateAt,
      onDrawEdge,
      onSelect,
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

    // Instance lifecycle effect — only depends on automaton, savePositions, and editable.
    // Edgehandles is initialised here (inside the lifecycle) so it is tied to the
    // Cytoscape instance and torn down with it on destroy.
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

      if (editable) {
        // snap: generous finger target. disableBrowserGestures: prevents
        // two-finger scroll from conflicting with the drag-draw gesture (EDITOR-04).
        // Touch workflow: tap a node to reveal the handle, then drag to target.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(cyRef.current as any).edgehandles({
          snap: true,
          snapThreshold: 50,
          disableBrowserGestures: true,
        })
      }

      return () => {
        cyRef.current?.destroy()
        cyRef.current = null
      }
    }, [automaton, savePositions, editable])

    // Read-only event listener effect — separate so callback changes don't recreate
    // the Cytoscape instance. Also wires the select/unselect -> onSelect handler
    // for NON-editable panes, so MultiView read-only panes emit selection for
    // cross-pane highlighting. The editable path has its own handler below that
    // additionally handles bgTap and ehcomplete. Guard: only bind once — if
    // editable is true the editable effect owns select/unselect.
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

      // onSelect for non-editable panes: microtask-coalesced to handle burst
      // events from box-selection (matches the editable handler's WR-02 pattern).
      // Only bind here when NOT editable; the editable effect owns select/unselect
      // when editable is true to avoid a double-bind.
      // cancelled guards the queued microtask: if the effect cleanup runs before
      // the microtask fires (selection + automaton change in the same render batch),
      // the stale callback no-ops rather than dispatching into a dead/replaced pane.
      let selectPending = false
      let cancelled = false
      const readOnlySelectHandler = () => {
        if (selectPending) return
        selectPending = true
        Promise.resolve().then(() => {
          selectPending = false
          if (cancelled) return
          const nodeIds = cy
            .nodes(':selected')
            .filter(n => n.id() !== '__start_marker__')
            .map(n => n.id())
          const edgeIds = cy.edges(':selected').map(e => e.id())
          onSelect?.(nodeIds, edgeIds)
        })
      }

      if (!editable) {
        cy.on('select unselect', readOnlySelectHandler)
      }

      return () => {
        cancelled = true
        cy.off('tap', 'node', nodeHandler)
        cy.off('tap', 'edge', edgeHandler)
        if (!editable) {
          cy.off('select unselect', readOnlySelectHandler)
        }
      }
    }, [automaton, onNodeClick, onEdgeClick, onSelect, editable])

    // Edit-mode event listener effect — only active when editable. Kept separate
    // from the read-only effect so the non-editable render path is untouched.
    useEffect(() => {
      const cy = cyRef.current
      if (!cy || !editable) return

      // Tap on the canvas background adds a state at the cursor position.
      // Guard against the __start_marker__ injected node: that node has no
      // visible size and its tap would normally hit the background anyway, but
      // the check on evt.target === cy ensures only bare-canvas taps reach here.
      const bgTapHandler = (evt: cytoscape.EventObject) => {
        if (evt.target === cy) {
          onAddStateAt?.(evt.position.x, evt.position.y)
        }
      }

      // ehcomplete fires when the user finishes drawing an edge with edgehandles.
      // Read only the source and target ids; remove the temporary edge before
      // calling back so React re-adds the real edge from authoritative reducer
      // state (Pitfall 3 — the extension's edge shape must never become the model).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const completeHandler = (_evt: cytoscape.EventObject, source: any, target: any, addedEdge: any) => {
        addedEdge.remove()
        onDrawEdge?.(source.id(), target.id())
      }

      // Selection change: collect selected node and edge ids, excluding the
      // internal __start_marker__ node so it is never surfaced as a user state.
      // Cytoscape fires select/unselect once per element, so box-selecting n nodes
      // triggers n dispatches. A microtask (Promise.resolve) coalesces the burst
      // into one dispatch after the synchronous event loop drains (WR-02).
      // editCancelled guards the queued microtask against effect cleanup running
      // before the microtask fires (same race as the read-only path, WR-01).
      let selectPending = false
      let editCancelled = false
      const selectHandler = () => {
        if (selectPending) return
        selectPending = true
        Promise.resolve().then(() => {
          selectPending = false
          if (editCancelled) return
          const nodeIds = cy
            .nodes(':selected')
            .filter(n => n.id() !== '__start_marker__')
            .map(n => n.id())
          const edgeIds = cy.edges(':selected').map(e => e.id())
          onSelect?.(nodeIds, edgeIds)
        })
      }

      cy.on('tap', bgTapHandler)
      cy.on('ehcomplete', completeHandler)
      cy.on('select unselect', selectHandler)

      return () => {
        editCancelled = true
        cy.off('tap', bgTapHandler)
        cy.off('ehcomplete', completeHandler)
        cy.off('select unselect', selectHandler)
      }
    }, [automaton, editable, onAddStateAt, onDrawEdge, onSelect])

    // Apply the current highlight sets. All class swaps are static (no JS-driven
    // Cytoscape tween) so this is correct under prefers-reduced-motion by
    // construction (DESIGN-04). Two separate concerns batched together:
    //   .active  — amber simulation role (highlightStates / highlightEdges)
    //   .linked  — brand-hover cross-pane halo (highlightLinked)
    // Kept as a stable callback so the matchMedia change listener can re-run it.
    const applyHighlights = useCallback(() => {
      const cy = cyRef.current
      if (!cy) return

      cy.startBatch()
      cy.nodes().removeClass('active')
      cy.edges().removeClass('active')
      cy.nodes().removeClass('linked')
      cy.edges().removeClass('linked')

      highlightStates.forEach(stateId => {
        cy.$id(stateId).addClass('active')
      })

      highlightEdges.forEach(edgeId => {
        cy.$id(edgeId).addClass('active')
      })

      highlightLinked.forEach(stateId => {
        cy.$id(stateId).addClass('linked')
      })
      cy.endBatch()
    }, [highlightStates, highlightEdges, highlightLinked])

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
