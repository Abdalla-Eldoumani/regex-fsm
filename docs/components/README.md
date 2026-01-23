# Components Module Documentation

React components for the RegexFSM user interface.

## Module Structure

```
src/components/
├── App.tsx                     # Main application content
├── Layout.tsx                  # Shared layout with header and routing
├── ErrorBoundary.tsx           # Error boundary for React errors
├── NotFound.tsx                # Generic 404 page
├── NotFoundGithub.tsx          # GitHub-specific 404 page
├── common/                     # Reusable UI components
│   ├── Button.tsx              # Button component
│   └── Tabs.tsx                # Tab navigation
├── input/                      # Input components
│   ├── RegexInput.tsx          # Regex pattern input
│   └── StringInput.tsx         # Test string input
├── display/                    # Automaton display
│   ├── AutomatonView.tsx       # Main automaton viewer
│   ├── TransitionTable.tsx     # Transition function table
│   └── StateList.tsx           # State list view
├── simulation/                 # Simulation controls
│   ├── SimulationPanel.tsx     # Simulation orchestration
│   ├── SimulationControls.tsx  # Playback controls
│   └── InputTape.tsx           # Visual input tape
└── education/                  # Educational content
    ├── TheoryPanel.tsx         # Theory explanations
    └── StepExplanation.tsx     # Step-by-step explanations
```

## Layout Component

**File**: `src/components/Layout.tsx`

Shared layout component that wraps all routes with a consistent header and background.

### Features

- Sticky header with logo and navigation
- Animated gradient background with grid pattern
- React Router integration using `<Outlet />`
- Responsive design with glassmorphism effects

### Structure

```typescript
function Layout(): JSX.Element {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Grid pattern and gradient blobs */}
      </div>

      {/* Sticky header */}
      <header className="sticky top-0 z-50">
        <Link to="/">R Logo</Link>
        <h1>RegexFSM</h1>
        <Link to="/github">GitHub</Link>
      </header>

      {/* Route content */}
      <Outlet />
    </div>
  )
}
```

### Navigation

- **Home**: Clicking R logo navigates to `/`
- **GitHub**: Navigates to `/github` (shows NotFoundGithub page)

## ErrorBoundary Component

**File**: `src/components/ErrorBoundary.tsx`

Class component that catches React errors in child components and displays a fallback UI.

### Implementation

```typescript
class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }
}
```

### Fallback UI

- Error icon and message
- Error details in code block
- "Reload Page" button
- "Go Home" button

### Usage

Wraps the entire app in `src/main.tsx`:

```typescript
<ErrorBoundary>
  <BrowserRouter>
    {/* App content */}
  </BrowserRouter>
</ErrorBoundary>
```

## NotFound Component

**File**: `src/components/NotFound.tsx`

Generic 404 page for undefined routes.

### Features

- "404" heading with large font
- "Lost in the automaton?" subheading
- Error-themed design (red gradients)
- Link back to home page

## NotFoundGithub Component

**File**: `src/components/NotFoundGithub.tsx`

GitHub-specific 404 page indicating the repository is in private development.

### Features

- "Repository Not Public Yet" message
- Explanation that the repository is currently private
- LinkedIn links for:
  - Abdalla ElDoumani
  - Ibrahim Ahmed
- Star animation background
- Purple gradient theme

## App Component

**File**: `src/components/App.tsx`

Main content component for the home route (`/`).

### Responsibilities

- Maintains global application state
- Orchestrates the regex → NFA → DFA pipeline
- Manages simulation mode (NFA vs DFA)
- Coordinates highlight state between components

### State Management

```typescript
const [regex, setRegex] = useState('')
const [alphabet, setAlphabet] = useState('')
const [testString, setTestString] = useState('')
const [nfa, setNfa] = useState<NFA | null>(null)
const [dfa, setDfa] = useState<DFA | null>(null)
const [error, setError] = useState<string>('')
const [simulationMode, setSimulationMode] = useState<'nfa' | 'dfa' | 'both'>('nfa')
const [nfaHighlightStates, setNfaHighlightStates] = useState<string[]>([])
const [dfaHighlightStates, setDfaHighlightStates] = useState<string[]>([])
const [nfaHighlightEdges, setNfaHighlightEdges] = useState<string[]>([])
const [dfaHighlightEdges, setDfaHighlightEdges] = useState<string[]>([])
const [nfaSimResult, setNfaSimResult] = useState<SimulationResult | null>(null)
const [dfaSimResult, setDfaSimResult] = useState<SimulationResult | null>(null)
```

### Pipeline with useMemo

```typescript
const { nfa, dfa, error } = useMemo(() => {
  if (directDfa) return { nfa: null, dfa: directDfa, error: '' }
  if (!regex || !autoBuild) return { nfa: null, dfa: null, error: '' }

  try {
    const ast = parse(regex)  // Cached
    const generatedNfa = buildNFA(ast)  // Cached

    // Build effective alphabet
    const regexAlphabet = generatedNfa.alphabet
    const customAlphabetSet = alphabet ? new Set(alphabet.split('')) : null
    const testStringChars = new Set(testString.split(''))
    const effectiveAlphabet = customAlphabetSet || new Set([...regexAlphabet, ...testStringChars])

    let generatedDfa = nfaToDFA(generatedNfa, effectiveAlphabet)  // Cached

    if (shouldMinimize) {
      const result = minimizeDFA(generatedDfa, useLetterNames)  // Cached
      generatedDfa = result.dfa
    }

    return { nfa: generatedNfa, dfa: generatedDfa, error: '' }
  } catch (err) {
    return { nfa: null, dfa: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}, [regex, alphabet, testString, shouldMinimize, useLetterNames, autoBuild, directDfa])
```

### Content Structure

App component renders the main content (no header):

```
App
├── Main Section
│   ├── Input Row (RegexInput | StringInput)
│   ├── Simulation Panel
│   │   └── SimulationPanel (NFA or DFA)
│   └── Automaton Views
│       ├── AutomatonView (NFA)
│       └── AutomatonView (DFA)
└── Footer
```

The header is rendered by the Layout component, not App.

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

Regex pattern input with validation, error display, and custom alphabet field.

```typescript
interface RegexInputProps {
  value: string
  onChange: (value: string) => void
  alphabet: string
  onAlphabetChange: (value: string) => void
  error?: string
}
```

**Features**:
- Real-time input capture
- Error message display in red
- Monospace font for pattern
- Placeholder example: `(a+b)*abb`
- **Custom Alphabet Field**: Optional alphabet input for complete DFA generation with trap states
- Auto-detection when alphabet is empty (includes symbols from regex and test string)

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
- Columns: Input symbols (including λ if present)
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
- NFA: "Starting in state q0. Computing λ-closure: {q0, q1}."
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

## New UI/UX Features

### Flexible Simulation Modes

The application supports three simulation display modes controlled by a mode selector in the simulation section:

**Modes**:
- **NFA Mode**: Only NFA automaton displayed, takes full width
- **DFA Mode**: Only DFA automaton displayed, takes full width
- **Both Mode**: Both automatons displayed side-by-side with responsive grid (xl:grid-cols-2)

**Implementation**:
```typescript
const [simulationMode, setSimulationMode] = useState<'nfa' | 'dfa' | 'both'>('nfa')

// In render
<section className={`grid gap-8 ${
  simulationMode === 'both' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'
}`}>
  {(simulationMode === 'nfa' || simulationMode === 'both') && (
    <AutomatonView automaton={nfa} mode="nfa" />
  )}
  {(simulationMode === 'dfa' || simulationMode === 'both') && (
    <AutomatonView automaton={dfa} mode="dfa" />
  )}
</section>
```

### Fullscreen Simulation Modal

Each AutomatonView has a "Simulate" button that opens a fullscreen modal overlay:

**File**: `src/components/simulation/SimulationModal.tsx`

**Features**:
- **Split-Screen Layout**: Graph on left, controls on right (lg:grid-cols-2)
- **Live Visualization**: AutomatonGraph component displays and updates during simulation
- **Backdrop Blur**: 95% opacity background with blur effect
- **Independent State**: Modal simulation doesn't affect main simulation
- **Highlight Propagation**: Updates parent automaton view via onHighlightChange callback

**Component API**:
```typescript
interface SimulationModalProps {
  automaton: Automaton
  mode: 'nfa' | 'dfa'
  isOpen: boolean
  onClose: () => void
  onHighlightChange: (states: string[], edges: string[]) => void
}
```

### Expandable Views

Table and States tabs in AutomatonView have dedicated expand buttons:

**Features**:
- **Fullscreen Modal**: Opens table or state list in fullscreen overlay
- **Improved Scrolling**: Max-height increased from 600px to 800px
- **Better Visibility**: Dedicated fullscreen mode for complex automata with many states
- **Easy Access**: Expand button appears when viewing Table or States tabs

**Implementation**: Uses same modal pattern as simulation modal with conditional content rendering.

### Pattern Builder

Interactive natural language to regex converter with 23 templates across 9 categories:

**File**: `src/components/input/PatternBuilder.tsx`

**Features**:
- **Collapsible Design**: Doesn't clutter UI when not in use
- **Categorized Dropdown**: Templates organized into 9 categories
- **Dynamic Parameters**: Input fields adjust based on selected template
- **Live Preview**: See generated regex before insertion
- **One-Click Insertion**: Inserts pattern into RegexInput
- **Parser Compatible**: All templates generate patterns compatible with simplified parser

**Categories**: basic, position, repetition, character, combination, length, counting, negation, ordering

## Styling

All components use Tailwind CSS with Indigo/Emerald color theme (updated from Catppuccin Mocha):

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

### Memoization

Display components wrapped with `React.memo` to prevent unnecessary re-renders:
- `TransitionTable`
- `StateList`
- `InputTape`
- `SimulationControls`
- `RegexInput`
- `StringInput`

Derived state computed with `useMemo`:
- NFA/DFA construction in `App.tsx`
- Simulation results in `SimulationPanel.tsx`

Stable handlers created with `useCallback`:
- Highlight change handlers
- Event callbacks passed to child components
