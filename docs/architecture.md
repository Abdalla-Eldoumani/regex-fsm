# Architecture

## System Overview

RegexFSM follows a layered architecture separating concerns into distinct modules:

```
┌─────────────────────────────────────────┐
│          UI Layer (React)               │
│  - Input components                     │
│  - Display components (React.memo)      │
│  - Simulation components                │
│  - Education components                 │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│       Visualization Layer               │
│  - Cytoscape rendering                  │
│  - Graph layout                         │
│  - Layout cache (position persistence)  │
│  - Export functionality                 │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│          Cache Layer                    │
│  - LRU cache with localStorage          │
│  - Algorithm result caching             │
│  - Automatic cache invalidation         │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│          Core Layer                     │
│  - Regex parsing                        │
│  - NFA/DFA construction                 │
│  - Simulation algorithms                │
└─────────────────────────────────────────┘
```

## Data Flow

### Regex to Automaton Pipeline

1. User enters regex string → `RegexInput` component
2. String is tokenized → `tokenize(input)` in `src/core/regex/tokenizer.ts`
3. Tokens are parsed into AST → `parse(input)` in `src/core/regex/parser.ts`
4. AST is converted to NFA → `buildNFA(ast)` in `src/core/algorithms/thompson.ts`
5. NFA is converted to DFA → `nfaToDFA(nfa)` in `src/core/algorithms/subset.ts`
6. Both automata are displayed → `AutomatonView` components

### Simulation Flow

1. User enters test string → `StringInput` component
2. User selects NFA or DFA mode → `App` state
3. Simulation is initialized → `useSimulation` hook
4. User controls playback → `SimulationControls` component
5. Current step is computed → `simulateNFA` or `simulateDFA` in `src/core/algorithms/simulate.ts`
6. Graph is highlighted → `AutomatonGraph` component updates
7. Explanation is shown → `StepExplanation` component

## Module Responsibilities

### Core Module

**Purpose**: Implement formal language theory algorithms without UI concerns.

**Responsibilities**:
- Parse regular expressions into Abstract Syntax Trees
- Convert regex AST to NFA using Thompson's construction
- Convert NFA to DFA using subset construction
- Simulate automaton execution on input strings
- Compute lambda closures and move functions

**Key Files**:
- `src/core/regex/tokenizer.ts` - Lexical analysis
- `src/core/regex/parser.ts` - Syntax analysis
- `src/core/algorithms/thompson.ts` - NFA construction
- `src/core/algorithms/subset.ts` - DFA construction
- `src/core/algorithms/simulate.ts` - Execution simulation
- `src/core/cache/` - LRU cache and algorithm result caching
- `src/core/cachedAlgorithms.ts` - Cached wrappers for parse/buildNFA/nfaToDFA/minimizeDFA

### Components Module

**Purpose**: Provide React UI components for user interaction and display.

**Responsibilities**:
- Accept user input for regex and test strings
- Display automata as graphs, tables, and lists
- Control simulation playback
- Provide educational content
- Handle user events

**Key Files**:
- `src/components/App.tsx` - Main application component
- `src/components/input/RegexInput.tsx` - Regex input with validation
- `src/components/display/AutomatonView.tsx` - Automaton visualization wrapper
- `src/components/simulation/SimulationPanel.tsx` - Simulation orchestration
- `src/components/education/TheoryPanel.tsx` - Educational theory content

### Visualization Module

**Purpose**: Render automata as interactive graphs using Cytoscape.js.

**Responsibilities**:
- Convert automaton data structures to Cytoscape format
- Add start arrow indicator (invisible marker node with visible arrow edge)
- Apply visual styling (Indigo/Emerald color palette)
- Compute graph layouts automatically
- Highlight active states and transitions during simulation
- Export graphs as PNG or SVG

**Key Files**:
- `src/visualization/renderer.tsx` - AutomatonGraph React component
- `src/visualization/cytoscape-config.ts` - Cytoscape setup, conversion, and start arrow
- `src/visualization/styles.ts` - Visual styling definitions (Indigo/Emerald theme)
- `src/visualization/layout.ts` - Layout algorithm selection
- `src/visualization/export.ts` - PNG/SVG export functions

**Recent Enhancements**:
- Start arrow indicator for clear initial state identification
- Enhanced state styling with visual distinction for start/accept/trap states
- Graph layout persistence across tab switches using CSS visibility

## State Management

### App-Level State

The `App` component maintains global application state:

```typescript
- regex: string                         // Current regex input
- alphabet: string                      // Custom alphabet (optional)
- testString: string                    // Current test string
- nfa: NFA | null                       // Generated NFA
- dfa: DFA | null                       // Generated DFA
- error: string                         // Parse/build errors
- simulationMode: 'nfa' | 'dfa' | 'both' // Which automaton(s) to display
- nfaHighlightStates: string[]          // NFA states to highlight
- dfaHighlightStates: string[]          // DFA states to highlight
- nfaHighlightEdges: string[]           // NFA edges to highlight
- dfaHighlightEdges: string[]           // DFA edges to highlight
- nfaSimResult: SimulationResult | null // NFA simulation result
- dfaSimResult: SimulationResult | null // DFA simulation result
```

### Simulation State

The `useSimulation` hook manages simulation state:

```typescript
- result: SimulationResult | null  // Complete simulation result
- currentStep: number              // Current step index
- currentStepData: SimulationStep  // Current step details
- isRunning: boolean               // Auto-play active
- speed: number                    // Auto-play speed (ms)
```

## Component Hierarchy

```
App
├── Header
├── RegexInput
├── StringInput
├── SimulationPanel
│   ├── InputTape
│   ├── SimulationControls
│   ├── StepExplanation
│   └── Current State Display
├── AutomatonView (NFA)
│   ├── Tabs (Graph/Table/States/Info)
│   ├── AutomatonGraph
│   ├── TransitionTable
│   ├── StateList
│   └── Info Summary
└── AutomatonView (DFA)
    ├── Tabs (Graph/Table/States/Info)
    ├── AutomatonGraph
    ├── TransitionTable
    ├── StateList
    └── Info Summary
```

## Error Handling

### Parsing Errors

- Tokenizer throws errors with position information
- Parser throws descriptive errors for invalid syntax
- Errors are caught in `App` component
- Error messages displayed to user with red styling

### Simulation Errors

- Invalid automaton states return null results
- Simulation handles empty automata gracefully
- UI components check for null/undefined before rendering

## Performance Considerations

### Caching Strategy

The application uses a multi-level caching approach:

**Algorithm Cache** (`src/core/cache/`):
- LRU cache with configurable max size (default: 50 entries)
- localStorage persistence with version-based invalidation
- Separate caches for parse, thompson, subset, and minimize results
- Cache key generation from AST/automaton structure

**Layout Cache** (`src/visualization/layoutCache.ts`):
- Persists graph node positions across tab switches and page refreshes
- 24-hour expiry, max 50 cached layouts
- Cache key based on automaton structure

**React Memoization** (`src/components/App.tsx`):
- `useMemo` for derived state (NFA/DFA construction)
- `useCallback` for stable handler references
- `React.memo` on display components (TransitionTable, StateList, InputTape, SimulationControls)

### Automaton Construction

- Thompson's NFA has O(m) states for regex length m
- Subset construction worst case: O(2^n) DFA states for n NFA states
- In practice, DFA state count is much lower than worst case
- Repeated patterns return cached results instantly

### Visualization

- Cytoscape reuses canvas for efficient rendering
- Layout computation cached when automaton unchanged
- Highlight updates avoid full re-render
- Node positions restored from cache on tab switch

### Simulation

- NFA simulation: O(n × m) for string length n, m states
- DFA simulation: O(n) for string length n
- Step-by-step simulation computes all steps upfront for smooth playback

## Design Decisions

### Why Thompson's Construction?

Thompson's algorithm produces structurally simple NFAs with exactly one start and accept state. This makes visualization clearer and debugging easier compared to other construction methods.

### Why Subset Construction?

Subset construction is the standard algorithm for NFA to DFA conversion. While it can produce exponentially many states, it demonstrates an important theoretical concept and works well for typical regex patterns.

### Why Cytoscape.js?

Cytoscape.js provides automatic graph layout algorithms, interactive controls, and efficient canvas rendering. It handles the complexity of positioning nodes and routing edges automatically.

### Why Indigo/Emerald Color Scheme?

The Indigo/Emerald theme provides a professional, accessible color palette with clear semantic meaning:
- Indigo for start states and primary actions (representing "beginning")
- Emerald for accept states (representing "success")
- Red for trap/error states (representing "rejection")
- Amber for active simulation steps (representing "current focus")

This color scheme is WCAG 2.1 Level AA compliant for accessibility.

## UI/UX Features

### Flexible Simulation Modes

The application supports three simulation display modes:
- **NFA Mode**: Only NFA automaton displayed, takes full width
- **DFA Mode**: Only DFA automaton displayed, takes full width
- **Both Mode**: Both automatons displayed side-by-side (responsive grid)

Implementation:
- Mode selector with three buttons in simulation section
- Dynamic grid layout: `grid-cols-1` (single) or `grid-cols-1 xl:grid-cols-2` (both)
- Conditional rendering based on simulationMode state
- Each automaton maintains independent simulation controls when in Both mode

### Fullscreen Simulation Modal

Each automaton has an individual "Simulate" button that opens a fullscreen modal:
- **Split-Screen Layout**: Graph on left, controls on right (lg:grid-cols-2)
- **Live Visualization**: AutomatonGraph updates during simulation
- **Backdrop Blur**: 95% opacity black background with blur effect
- **Independent State**: Modal simulation doesn't affect main simulation
- **Highlight Propagation**: Highlights update parent view via callback

Modal features:
- Test string input
- Full simulation controls (play, pause, step, reset)
- Click backdrop or close button to dismiss
- Responsive layout (stacks vertically on mobile)

### Expandable Views

Table and States tabs have dedicated expand buttons:
- **Fullscreen Modal**: Opens table or state list in fullscreen overlay
- **Improved Scrolling**: Increased max-height from 600px to 800px
- **Better Visibility**: Dedicated fullscreen mode for complex automata with many states
- **Easy Access**: Expand button appears when viewing Table or States tabs

### Pattern Builder

Interactive natural language to regex converter:
- **23 Templates**: Across 9 categories (basic, position, repetition, character, combination, length, counting, negation, ordering)
- **Dynamic Parameters**: Input fields adjust based on selected template
- **Live Preview**: See generated regex before insertion
- **Parser Compatible**: All templates generate patterns compatible with the simplified parser

### Custom Alphabet Support

Users can pre-define the alphabet:
- **Complete DFAs**: Shows all symbol transitions including trap states
- **Auto Expansion**: Automatically includes test string symbols when no custom alphabet defined
- **Trap State Visibility**: Makes rejection paths explicit in DFA visualization

## Testing Strategy

### Unit Tests

Each core algorithm has comprehensive unit tests:
- Test base cases and edge cases
- Verify algorithmic properties
- Ensure correct outputs for known inputs

### Integration Tests

Visualization tests verify:
- Correct conversion from automaton to Cytoscape format
- Proper application of styles
- Highlight functionality

### Manual Testing

UI components tested manually for:
- Responsive behavior across screen sizes
- User interaction flows
- Visual appearance and accessibility
