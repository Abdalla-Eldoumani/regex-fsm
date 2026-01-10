# Architecture

## System Overview

RegexFSM follows a layered architecture separating concerns into distinct modules:

```
┌─────────────────────────────────────────┐
│          UI Layer (React)               │
│  - Input components                     │
│  - Display components                   │
│  - Simulation components                │
│  - Education components                 │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│       Visualization Layer               │
│  - Cytoscape rendering                  │
│  - Graph layout                         │
│  - Export functionality                 │
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
- Compute epsilon closures and move functions

**Key Files**:
- `src/core/regex/tokenizer.ts` - Lexical analysis
- `src/core/regex/parser.ts` - Syntax analysis
- `src/core/algorithms/thompson.ts` - NFA construction
- `src/core/algorithms/subset.ts` - DFA construction
- `src/core/algorithms/simulate.ts` - Execution simulation

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
- Apply visual styling (Catppuccin Mocha palette)
- Compute graph layouts automatically
- Highlight active states and transitions
- Export graphs as PNG or SVG

**Key Files**:
- `src/visualization/renderer.tsx` - AutomatonGraph React component
- `src/visualization/cytoscape-config.ts` - Cytoscape setup and conversion
- `src/visualization/styles.ts` - Visual styling definitions
- `src/visualization/layout.ts` - Layout algorithm selection
- `src/visualization/export.ts` - PNG/SVG export functions

## State Management

### App-Level State

The `App` component maintains global application state:

```typescript
- regex: string                    // Current regex input
- testString: string               // Current test string
- nfa: NFA | null                  // Generated NFA
- dfa: DFA | null                  // Generated DFA
- error: string                    // Parse/build errors
- simulationMode: 'nfa' | 'dfa'    // Which automaton to simulate
- nfaHighlightStates: string[]     // NFA states to highlight
- dfaHighlightStates: string[]     // DFA states to highlight
- nfaHighlightEdges: string[]      // NFA edges to highlight
- dfaHighlightEdges: string[]      // DFA edges to highlight
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

### Automaton Construction

- Thompson's NFA has O(m) states for regex length m
- Subset construction worst case: O(2^n) DFA states for n NFA states
- In practice, DFA state count is much lower than worst case

### Visualization

- Cytoscape reuses canvas for efficient rendering
- Layout computation cached when automaton unchanged
- Highlight updates avoid full re-render

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

### Why Catppuccin Mocha?

Catppuccin provides a cohesive, accessible color palette designed for developer tools. The Mocha variant (dark theme) reduces eye strain and makes syntax highlighting effective.

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
