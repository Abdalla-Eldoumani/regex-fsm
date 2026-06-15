import { useReducer, useMemo, useCallback, useState } from 'react'
import { Automaton } from '@/core/automata/types'
import { editorReducer, initialEditorState } from '@/editor/editorReducer'
import { toAutomaton } from '@/editor/toAutomaton'
import { WorkingAutomaton } from '@/editor/editorTypes'

// Returned shape — plan 05's EditorPanel and EditorView consume this API.
export interface AutomatonEditorDispatchers {
  // Gesture adapters wired to AutomatonGraph edit callbacks
  addStateAt: (x: number, y: number) => void
  drawEdge: (fromId: string, toId: string) => void
  setSelection: (nodeIds: string[], edgeIds: string[]) => void

  // Panel actions (04-05 relabels, renames, sets start, toggles accept, deletes)
  renameState: (id: string, label: string) => void
  setStart: (id: string) => void
  toggleAccept: (id: string) => void
  addTransition: (from: string, to: string, symbol: string | null) => void
  relabelTransition: (edgeId: string, symbol: string | null) => void
  removeTransition: (edgeId: string) => void
  removeState: (id: string) => void
  clearSelection: () => void
}

export interface UseAutomatonEditorResult {
  // The live reducer state, kept for consumers that need editor-only data
  // (positions, selection). Prefer `automaton` for algorithm consumption.
  working: WorkingAutomaton
  // The core Automaton derived from the reducer state. Re-derived on every
  // structural edit; memoised so referentially stable between renders that
  // only change selection or highlight state.
  automaton: Automaton
  // Stable dispatcher callbacks — safe to pass as AutomatonGraph props without
  // triggering unnecessary re-mounts.
  dispatchers: AutomatonEditorDispatchers
  // Increments on every structural edit (add/remove state or transition).
  // Consumers holding stale simulation highlights should reset them when this
  // changes (Pitfall 6: editing during simulation leaves a stale active state).
  // Using a nonce (rather than exposing a reset callback) keeps the hook
  // side-effect-free and lets consumers decide their own reset strategy.
  lastEditNonce: number
}

export function useAutomatonEditor(): UseAutomatonEditorResult {
  const [working, dispatch] = useReducer(editorReducer, initialEditorState)

  // Track structural edits (add/remove state or transition) via a nonce so
  // consumers can clear stale simulation highlights (Pitfall 6). A separate
  // state counter is used rather than a ref so consumers re-render when the
  // nonce changes (a ref.current read during render is prohibited by the
  // react-hooks/refs lint rule).
  const [lastEditNonce, setEditNonce] = useState(0)

  const automaton = useMemo(() => toAutomaton(working), [working])

  // --- gesture adapters ---

  // drawEdge dispatches addTransition with symbol null (a λ-move by default).
  // Plan 04-05's EditorPanel relabels the edge once the user types a symbol.
  // This is the pinned decision from the plan-checker: the prompt-for-symbol
  // step belongs to the panel, not the gesture layer.
  const drawEdge = useCallback(
    (fromId: string, toId: string) => {
      setEditNonce(n => n + 1)
      dispatch({ type: 'addTransition', from: fromId, to: toId, symbol: null })
    },
    []
  )

  const addStateAt = useCallback(
    (x: number, y: number) => {
      setEditNonce(n => n + 1)
      dispatch({ type: 'addState', x, y })
    },
    []
  )

  const setSelection = useCallback(
    (nodeIds: string[], edgeIds: string[]) => {
      dispatch({ type: 'select', nodeIds, edgeIds })
    },
    []
  )

  // --- panel dispatchers ---

  const renameState = useCallback(
    (id: string, label: string) => {
      dispatch({ type: 'renameState', id, label })
    },
    []
  )

  const setStart = useCallback(
    (id: string) => {
      dispatch({ type: 'setStart', id })
    },
    []
  )

  const toggleAccept = useCallback(
    (id: string) => {
      dispatch({ type: 'toggleAccept', id })
    },
    []
  )

  const addTransition = useCallback(
    (from: string, to: string, symbol: string | null) => {
      setEditNonce(n => n + 1)
      dispatch({ type: 'addTransition', from, to, symbol })
    },
    []
  )

  const relabelTransition = useCallback(
    (edgeId: string, symbol: string | null) => {
      dispatch({ type: 'relabelTransition', edgeId, symbol })
    },
    []
  )

  const removeTransition = useCallback(
    (edgeId: string) => {
      setEditNonce(n => n + 1)
      dispatch({ type: 'removeTransition', edgeId })
    },
    []
  )

  const removeState = useCallback(
    (id: string) => {
      setEditNonce(n => n + 1)
      dispatch({ type: 'removeState', id })
    },
    []
  )

  const clearSelection = useCallback(
    () => {
      dispatch({ type: 'clearSelection' })
    },
    []
  )

  const dispatchers: AutomatonEditorDispatchers = {
    addStateAt,
    drawEdge,
    setSelection,
    renameState,
    setStart,
    toggleAccept,
    addTransition,
    relabelTransition,
    removeTransition,
    removeState,
    clearSelection,
  }

  return { working, automaton, dispatchers, lastEditNonce }
}
