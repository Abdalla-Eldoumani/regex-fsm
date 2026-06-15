import { EditorAction, WorkingAutomaton, nextStateId, nextEdgeId } from './editorTypes'

// The empty editor: no states, no start. The first addState makes a non-empty
// editor always carry exactly one start (automata-correctness invariant 2).
export const initialEditorState: WorkingAutomaton = {
  states: [],
  transitions: [],
  startState: null,
  acceptStates: [],
  positions: {},
  selection: { nodeIds: [], edgeIds: [] },
}

// Pure reducer over the WorkingAutomaton. Every branch returns a new object built
// with spreads; the input is never mutated (src/core immutability rule). The
// invariants hold after every action: at most one startState, every transition
// references an existing state, acceptStates is a subset of state ids, and ids are
// unique because they come from nextStateId / nextEdgeId.
export function editorReducer(state: WorkingAutomaton, action: EditorAction): WorkingAutomaton {
  switch (action.type) {
    case 'addState': {
      const id = nextStateId(state.states)
      return {
        ...state,
        states: [...state.states, { id }],
        positions: { ...state.positions, [id]: { x: action.x, y: action.y } },
        // first state added becomes the start automatically
        startState: state.startState ?? id,
      }
    }

    case 'removeState': {
      const { id } = action
      const states = state.states.filter(s => s.id !== id)
      // remaining start: keep it unless it was the removed state, then fall back
      // to any surviving state id, or null if none remain
      const startState =
        state.startState === id ? (states[0]?.id ?? null) : state.startState
      const positions = { ...state.positions }
      delete positions[id]
      return {
        ...state,
        states,
        // drop every transition incident on the removed state
        transitions: state.transitions.filter(t => t.from !== id && t.to !== id),
        startState,
        acceptStates: state.acceptStates.filter(a => a !== id),
        positions,
        selection: {
          nodeIds: state.selection.nodeIds.filter(n => n !== id),
          edgeIds: state.selection.edgeIds,
        },
      }
    }

    case 'renameState': {
      // set the label; the id never changes (user text is a label, never an id)
      return {
        ...state,
        states: state.states.map(s =>
          s.id === action.id ? { ...s, label: action.label } : s
        ),
      }
    }

    case 'setStart': {
      // exactly one start; only move it to a state that actually exists
      if (!state.states.some(s => s.id === action.id)) return state
      return { ...state, startState: action.id }
    }

    case 'toggleAccept': {
      const has = state.acceptStates.includes(action.id)
      return {
        ...state,
        acceptStates: has
          ? state.acceptStates.filter(a => a !== action.id)
          : [...state.acceptStates, action.id],
      }
    }

    case 'addTransition': {
      const id = nextEdgeId(state.transitions)
      // self-loops (from === to), parallel edges (same from/to/symbol), and λ
      // (symbol null) are all allowed: the transition list is an array, not a map
      return {
        ...state,
        transitions: [
          ...state.transitions,
          { id, from: action.from, to: action.to, symbol: action.symbol },
        ],
      }
    }

    case 'relabelTransition': {
      return {
        ...state,
        transitions: state.transitions.map(t =>
          t.id === action.edgeId ? { ...t, symbol: action.symbol } : t
        ),
      }
    }

    case 'removeTransition': {
      return {
        ...state,
        transitions: state.transitions.filter(t => t.id !== action.edgeId),
        selection: {
          nodeIds: state.selection.nodeIds,
          edgeIds: state.selection.edgeIds.filter(e => e !== action.edgeId),
        },
      }
    }

    case 'select': {
      // structural state is untouched; only the UI selection changes
      return {
        ...state,
        selection: { nodeIds: [...action.nodeIds], edgeIds: [...action.edgeIds] },
      }
    }

    case 'clearSelection': {
      return { ...state, selection: { nodeIds: [], edgeIds: [] } }
    }
  }
}
