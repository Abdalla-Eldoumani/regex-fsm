# Components Module Documentation

React components for the RegexFSM user interface.

## Module Structure

```
src/components/
├── App.tsx              # Root application component
├── common/              # Reusable UI components
│   ├── Button.tsx      # Button component
│   └── Tabs.tsx        # Tab navigation
├── input/              # Input components
│   ├── RegexInput.tsx  # Regex pattern input
│   └── StringInput.tsx # Test string input
├── display/            # Automaton display
│   ├── AutomatonView.tsx      # Main automaton viewer
│   ├── TransitionTable.tsx    # Transition function table
│   └── StateList.tsx          # State list view
├── simulation/         # Simulation controls
│   ├── SimulationPanel.tsx    # Simulation orchestration
│   ├── SimulationControls.tsx # Playback controls
│   └── InputTape.tsx          # Visual input tape
└── education/          # Educational content
    ├── TheoryPanel.tsx        # Theory explanations
    └── StepExplanation.tsx    # Step-by-step explanations
```

## App Component

**File**: `src/components/App.tsx`

### Responsibilities

- Maintains global application state
- Orchestrates the regex → NFA → DFA pipeline
- Manages simulation mode (NFA vs DFA)
- Coordinates highlight state between components

### State Management

```typescript
const [regex, setRegex] = useState('')
const [testString, setTestString] = useState('')
const [nfa, setNfa] = useState<NFA | null>(null)
const [dfa, setDfa] = useState<DFA | null>(null)
const [error, setError] = useState<string>('')
const [simulationMode, setSimulationMode] = useState<'nfa' | 'dfa'>('nfa')
const [nfaHighlightStates, setNfaHighlightStates] = useState<string[]>([])
const [dfaHighlightStates, setDfaHighlightStates] = useState<string[]>([])
const [nfaHighlightEdges, setNfaHighlightEdges] = useState<string[]>([])
const [dfaHighlightEdges, setDfaHighlightEdges] = useState<string[]>([])
```

### Pipeline Effect

```typescript
useEffect(() => {
  if (!regex) {
    setNfa(null)
    setDfa(null)
    setError('')
    return
  }

  try {
    const ast = parse(regex)
    const generatedNfa = buildNFA(ast)
    const generatedDfa = nfaToDFA(generatedNfa)

    setNfa(generatedNfa)
    setDfa(generatedDfa)
    setError('')
  } catch (err) {
    setNfa(null)
    setDfa(null)
    setError(err instanceof Error ? err.message : 'Unknown error occurred')
  }
}, [regex])
```

### Layout Structure

```
App
├── Header (Title and description)
├── Input Row (RegexInput | StringInput)
├── Simulation Panel
│   └── SimulationPanel (NFA or DFA)
└── Automaton Views
    ├── AutomatonView (NFA)
    └── AutomatonView (DFA)
```

## Common Components

### Button

**File**: `src/components/common/Button.tsx`

Simple button component with variant styles.

```typescript
interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
}
```

**Variants**:
- `primary`: Blue background (Catppuccin blue)
- `secondary`: Gray background with border
- `danger`: Red background

### Tabs

**File**: `src/components/common/Tabs.tsx`

Tab navigation component.

```typescript
interface TabsProps {
  tabs: { id: string; label: string }[]
  activeTab: string
  onChange: (tabId: string) => void
}
```

**Styling**: Active tab has blue bottom border, inactive tabs are gray.

## Input Components

### RegexInput

**File**: `src/components/input/RegexInput.tsx`

Regex pattern input with validation and error display.

```typescript
interface RegexInputProps {
  value: string
  onChange: (value: string) => void
  error?: string
}
```

**Features**:
- Real-time input capture
- Error message display in red
- Monospace font for pattern
- Placeholder example: `(a+b)*abb`

**Example**:
```typescript
<RegexInput
  value={regex}
  onChange={setRegex}
  error={error}
/>
```

### StringInput

**File**: `src/components/input/StringInput.tsx`

Test string input for simulation.

```typescript
interface StringInputProps {
  value: string
  onChange: (value: string) => void
}
```

**Features**:
- Monospace font for input
- Placeholder: `Enter test string`
- No validation (any string accepted)

## Display Components

### AutomatonView

**File**: `src/components/display/AutomatonView.tsx`

Main component for viewing an automaton with multiple tabs.

```typescript
interface AutomatonViewProps {
  automaton: Automaton | null
  title: string
  error?: string
  highlightStates?: string[]
  highlightEdges?: string[]
}
```

**Tabs**:
1. **Graph**: Visual graph representation
2. **Table**: Transition table
3. **States**: State list with details
4. **Info**: Summary statistics

**Export Buttons**: PNG and SVG export available on Graph tab.

**Example**:
```typescript
<AutomatonView
  automaton={nfa}
  title="NFA (Nondeterministic Finite Automaton)"
  error={error}
  highlightStates={nfaHighlightStates}
  highlightEdges={nfaHighlightEdges}
/>
```

### TransitionTable

**File**: `src/components/display/TransitionTable.tsx`

Displays transition function as a table.

```typescript
interface TransitionTableProps {
  automaton: Automaton
  highlightState?: string
}
```

**Table Structure**:
- Rows: States
- Columns: Input symbols (including ε if present)
- Cells: Target states (set notation for multiple targets)

**Indicators**:
- `→` Start state
- `✓` Accept state
- `∅` No transition (empty set)

**Highlighting**: Current simulation state highlighted in blue.

### StateList

**File**: `src/components/display/StateList.tsx`

Lists all states with their properties and transitions.

```typescript
interface StateListProps {
  automaton: Automaton
  highlightStates?: string[]
}
```

**For Each State**:
- State ID with START/ACCEPT badges
- Outgoing transitions (symbol → target)
- Incoming transitions (source → symbol)

**Summary Section**:
- Total state count
- Start state
- Accept states
- Total transition count

## Simulation Components

### SimulationPanel

**File**: `src/components/simulation/SimulationPanel.tsx`

Orchestrates simulation display and controls.

```typescript
interface SimulationPanelProps {
  automaton: Automaton | null
  input: string
  mode: 'nfa' | 'dfa'
  onHighlightChange: (states: string[], edges: string[]) => void
}
```

**Components Used**:
- InputTape: Visual tape with current position
- SimulationControls: Playback buttons
- StepExplanation: Natural language step description
- Current state display

**Highlight Callback**: Notifies parent when simulation step changes to update graph highlighting.

### SimulationControls

**File**: `src/components/simulation/SimulationControls.tsx`

Playback control buttons for simulation.

```typescript
interface SimulationControlsProps {
  isRunning: boolean
  canStep: boolean
  canReset: boolean
  currentStep: number
  totalSteps: number
  onPlay: () => void
  onPause: () => void
  onStepForward: () => void
  onStepBack: () => void
  onReset: () => void
  onComplete: () => void
}
```

**Buttons**:
- Reset (⏮): Jump to start
- Step Back (◀): Previous step
- Play/Pause (▶/⏸): Auto-advance
- Step Forward (▶): Next step
- Complete (⏭): Jump to end

**Progress Display**: "Step X / Y"

### InputTape

**File**: `src/components/simulation/InputTape.tsx`

Visual representation of input string as tape cells.

```typescript
interface InputTapeProps {
  input: string
  currentPosition: number
  accepted: boolean | null
}
```

**Visual States**:
- Consumed symbols: Dimmed (gray)
- Current symbol: Highlighted (yellow)
- Remaining symbols: Normal (white)

**Result Display**:
- Green "✓ Accepted" if accepted
- Red "✗ Rejected" if rejected
- Hidden during simulation

## Education Components

### TheoryPanel

**File**: `src/components/education/TheoryPanel.tsx`

Displays theory explanations for formal language concepts.

```typescript
interface TheoryPanelProps {
  topic: 'nfa' | 'dfa' | 'regex' | 'thompson' | 'subset' | 'simulation'
}
```

**Content Structure**:
Each topic has collapsible sections:
- **Definition**: Formal mathematical definition
- **Properties**: Key characteristics
- **Example**: Concrete instance

**Topics**:
- `nfa`: NFA definition and properties
- `dfa`: DFA definition and properties
- `regex`: Regular expression syntax
- `thompson`: Thompson's construction algorithm
- `subset`: Subset construction algorithm
- `simulation`: Automaton simulation process

**Interaction**: Click section to expand/collapse.

### StepExplanation

**File**: `src/components/education/StepExplanation.tsx`

Provides natural language explanations for simulation steps.

```typescript
interface StepExplanationProps {
  step: SimulationStep | null
  mode: 'nfa' | 'dfa'
  isComplete: boolean
  accepted: boolean
}
```

**Explanation Types**:

**Initialization**:
- NFA: "Starting in state q0. Computing ε-closure: {q0, q1}."
- DFA: "Starting in state q0."

**Reading Symbol**:
- NFA: "Read symbol 'a' at position 0. Current states: {q0, q1}."
- DFA: "Read symbol 'a' at position 0. Transitioned to state q1."

**Completion**:
- Accepted: "String accepted. Final states: q3."
- Rejected: "String rejected. No valid path to an accept state exists."

**Additional Info**:
- Warns when no valid transitions available
- Notes nondeterminism when multiple states active

## Custom Hooks

### useSimulation

**File**: `src/hooks/useSimulation.ts`

Manages simulation state and controls.

```typescript
interface UseSimulationProps {
  automaton: Automaton | null
  input: string
  mode: 'nfa' | 'dfa'
}

interface UseSimulationReturn {
  result: SimulationResult | null
  currentStep: number
  currentStepData: SimulationStep | null
  isRunning: boolean
  canStep: boolean
  canReset: boolean
  stepForward: () => void
  stepBack: () => void
  reset: () => void
  play: () => void
  pause: () => void
  complete: () => void
}
```

**Features**:
- Computes full simulation result upfront
- Tracks current step index
- Auto-play with configurable speed (default 800ms)
- Step forward/backward navigation
- Reset to start, complete to end

**Auto-play Logic**:
```typescript
useEffect(() => {
  if (!isRunning || !canStep) return

  const timer = setTimeout(() => {
    stepForward()
  }, speed)

  return () => clearTimeout(timer)
}, [isRunning, currentStep, speed])
```

## Styling

All components use Tailwind CSS with Catppuccin Mocha color palette:

```javascript
// Catppuccin Mocha Colors
base: '#1e1e2e'       // Background
surface0: '#313244'   // Card backgrounds
text: '#cdd6f4'       // Primary text
blue: '#89b4fa'       // Start states, primary actions
green: '#a6e3a1'      // Accept states, success
red: '#f38ba8'        // Errors, rejection
yellow: '#f9e2af'     // Current position, symbols
```

### Responsive Breakpoints

- Mobile: `<640px` - Stacked layout
- Tablet: `640px-1024px` - Partial stacking
- Desktop: `>1024px` - Side-by-side layout

**Breakpoint Classes**:
- `sm:` - 640px and up
- `md:` - 768px and up
- `lg:` - 1024px and up
- `xl:` - 1280px and up

**Example**:
```typescript
className="grid grid-cols-1 lg:grid-cols-2 gap-6"
// 1 column on mobile, 2 columns on desktop
```

## Component Patterns

### Props Interface

Define props inline for simple components:
```typescript
function Button({ label, onClick }: {
  label: string
  onClick: () => void
}) { ... }
```

Use separate interface for complex props:
```typescript
interface AutomatonViewProps {
  automaton: Automaton | null
  title: string
  error?: string
}

function AutomatonView(props: AutomatonViewProps) { ... }
```

### Event Handlers

Name handlers descriptively with `handle` prefix:
```typescript
const handleExportPNG = () => { ... }
const handleStepForward = () => { ... }
```

### Conditional Rendering

Use early returns for error/empty states:
```typescript
if (error) {
  return <ErrorDisplay message={error} />
}

if (!automaton) {
  return <EmptyState />
}

return <NormalView />
```

### State Lifting

Lift state to nearest common ancestor:
- Regex value: `App` component
- Active tab: `AutomatonView` component
- Expanded sections: `TheoryPanel` component
