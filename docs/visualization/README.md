# Visualization Module Documentation

Graph rendering and export functionality using Cytoscape.js.

## Module Structure

```
src/visualization/
├── renderer.tsx          # AutomatonGraph React component
├── cytoscape-config.ts   # Cytoscape initialization, conversion, start arrow
├── styles.ts             # Visual styling (Indigo/Emerald palette)
├── layout.ts             # Layout algorithm configuration
├── layoutCache.ts        # Graph position persistence (localStorage)
├── export.ts             # PNG/SVG export functions
└── animation.ts          # Animation utilities (placeholder)
```

## Features

- **Start Arrow**: Clear visual indicator for initial state
- **State Legend**: Visual key showing state types (start, accept, trap, active)
- **Enhanced Styling**: Indigo glow (start), emerald border (accept), red dashed (trap)
- **Layout Persistence**: Graph positions preserved across tab switches and page refreshes
- **Layout Cache**: Positions cached in localStorage with 24-hour expiry
- **Export**: PNG and SVG download functionality

## AutomatonGraph Component

**File**: `src/visualization/renderer.tsx`

React component that renders an automaton as an interactive graph.

### Component API

```typescript
interface AutomatonGraphProps {
  automaton: Automaton
  highlightStates?: string[]
  highlightEdges?: string[]
  onNodeClick?: (nodeId: string) => void
  onEdgeClick?: (edgeId: string) => void
}

interface AutomatonGraphHandle {
  getCytoscapeInstance: () => Core | null
}

const AutomatonGraph = forwardRef<AutomatonGraphHandle, AutomatonGraphProps>(...)
```

### Usage

```typescript
const graphRef = useRef<AutomatonGraphHandle>(null)

<AutomatonGraph
  ref={graphRef}
  automaton={nfa}
  highlightStates={['q0', 'q1']}
  highlightEdges={[]}
  onNodeClick={(id) => console.log('Clicked:', id)}
/>

// Later: access Cytoscape instance
const cy = graphRef.current?.getCytoscapeInstance()
if (cy) {
  exportAsPNG(cy, 'graph.png')
}
```

### Implementation Details

#### Initialization

```typescript
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

  // Event handlers
  if (onNodeClick) {
    cyRef.current.on('tap', 'node', e => {
      onNodeClick(e.target.id())
    })
  }

  // Cleanup
  return () => {
    cyRef.current?.destroy()
    cyRef.current = null
  }
}, [automaton, onNodeClick, onEdgeClick])
```

#### Highlight Updates

Highlights update without full re-render:

```typescript
useEffect(() => {
  if (!cyRef.current) return

  // Clear all highlights
  cyRef.current.nodes().removeClass('active')
  cyRef.current.edges().removeClass('active')

  // Apply new highlights
  highlightStates.forEach(stateId => {
    cyRef.current?.$id(stateId).addClass('active')
  })

  highlightEdges.forEach(edgeId => {
    cyRef.current?.$id(edgeId).addClass('active')
  })
}, [highlightStates, highlightEdges])
```

## Cytoscape Configuration

**File**: `src/visualization/cytoscape-config.ts`

### Automaton to Cytoscape Conversion

Converts automaton data structures to Cytoscape element format.

```typescript
interface CytoscapeElements {
  nodes: ElementDefinition[]
  edges: ElementDefinition[]
}

function automatonToCytoscape(automaton: Automaton): CytoscapeElements
```

#### Node Conversion

```typescript
const nodes = automaton.states.map(state => ({
  data: {
    id: state.id,
    label: state.label || state.id,
    isStart: state.id === automaton.startState,
    isAccept: automaton.acceptStates.includes(state.id)
  }
}))
```

**Node Data Fields**:
- `id`: Unique state identifier
- `label`: Display label
- `isStart`: Boolean flag for start state
- `isAccept`: Boolean flag for accept state

#### Edge Conversion

```typescript
const edges = automaton.transitions.map((t, i) => ({
  data: {
    id: `e${i}`,
    source: t.from,
    target: t.to,
    label: t.symbol === null ? 'λ' : t.symbol
  }
}))
```

**Edge Data Fields**:
- `id`: Unique edge identifier
- `source`: Source state ID
- `target`: Target state ID
- `label`: Transition symbol (λ for lambda)

### Highlight Support

Nodes and edges can be marked as `active` for highlight:

```typescript
cy.$id('q0').addClass('active')    // Highlight node q0
cy.$id('e5').addClass('active')    // Highlight edge e5
```

## Styling

**File**: `src/visualization/styles.ts`

Visual styling using Indigo/Emerald professional color palette.

### Color Palette

```typescript
export const colors = {
  base: '#1e1e2e',        // Background
  mantle: '#181825',      // Darker background
  surface0: '#313244',    // Node background
  surface1: '#45475a',    // Hover state
  overlay0: '#6c7086',    // Borders, inactive
  text: '#cdd6f4',        // Labels
  blue: '#89b4fa',        // Start state
  green: '#a6e3a1',       // Accept state
  yellow: '#f9e2af',      // Active state
  mauve: '#cba6f7',       // Active transition
  red: '#f38ba8',         // Error
}
```

### Node Styles

#### Default Node

```typescript
{
  'background-color': colors.surface0,
  'border-width': 2,
  'border-color': colors.overlay0,
  'label': 'data(label)',
  'text-valign': 'center',
  'text-halign': 'center',
  'color': colors.text,
  'font-size': 14,
  'width': 40,
  'height': 40,
}
```

#### Start State

```typescript
selector: 'node[isStart]',
style: {
  'border-color': colors.blue,
  'border-width': 3
}
```

#### Accept State

```typescript
selector: 'node[isAccept]',
style: {
  'border-color': colors.green,
  'border-width': 4
}
```

#### Active State (during simulation)

```typescript
selector: 'node.active',
style: {
  'background-color': colors.yellow,
  'border-color': colors.mauve,
  'border-width': 4
}
```

### Edge Styles

#### Default Edge

```typescript
{
  'width': 2,
  'line-color': colors.overlay0,
  'target-arrow-color': colors.overlay0,
  'target-arrow-shape': 'triangle',
  'curve-style': 'bezier',
  'label': 'data(label)',
  'font-size': 12,
  'color': colors.text,
  'text-background-color': colors.base,
  'text-background-opacity': 1,
  'text-background-padding': 2
}
```

#### Active Edge (during simulation)

```typescript
selector: 'edge.active',
style: {
  'line-color': colors.mauve,
  'target-arrow-color': colors.mauve,
  'width': 3
}
```

### Stylesheet Export

```typescript
export function getStylesheet(): Stylesheet[] {
  return [
    { selector: 'node', style: { ... } },
    { selector: 'node[isStart]', style: { ... } },
    { selector: 'node[isAccept]', style: { ... } },
    { selector: 'node.active', style: { ... } },
    { selector: 'edge', style: { ... } },
    { selector: 'edge.active', style: { ... } }
  ]
}
```

## Layout

**File**: `src/visualization/layout.ts`

Automatic graph layout algorithm configuration.

### Breadthfirst Layout

Used for most automata. Arranges nodes in levels from start state.

```typescript
export const breadthfirstLayout: LayoutOptions = {
  name: 'breadthfirst',
  directed: true,
  spacingFactor: 1.5,
  avoidOverlap: true,
  nodeDimensionsIncludeLabels: true
}
```

**Properties**:
- Hierarchical left-to-right arrangement
- Start state on left
- Accept states tend toward right
- Clear visualization of state progression

### COSE Layout

Force-directed layout for complex automata with many cycles.

```typescript
export const coseLayout: LayoutOptions = {
  name: 'cose',
  idealEdgeLength: 100,
  nodeOverlap: 20,
  refresh: 20,
  fit: true,
  padding: 30,
  randomize: false,
  componentSpacing: 100,
  nodeRepulsion: 400000,
  edgeElasticity: 100,
  nestingFactor: 5,
  gravity: 80,
  numIter: 1000
}
```

**Properties**:
- Physical simulation (nodes repel, edges attract)
- Handles cycles well
- More organic appearance
- Longer computation time

### Layout Selection

```typescript
export function selectLayout(automaton: Automaton): LayoutOptions {
  // Use breadthfirst by default
  return breadthfirstLayout
}
```

Currently always uses breadthfirst. Could be enhanced to:
- Detect cycles and switch to COSE
- Count lambda transitions and adjust layout
- Allow user selection

## Export

**File**: `src/visualization/export.ts`

Functions to export graphs as PNG or SVG images.

### PNG Export

```typescript
export function exportAsPNG(
  cy: cytoscape.Core,
  filename: string = 'automaton.png'
): void
```

**Implementation**:

```typescript
const png = cy.png({
  output: 'blob',
  bg: '#1e1e2e',    // Match background color
  full: true,       // Include entire graph
  scale: 2,         // 2x resolution for clarity
})

if (png instanceof Blob) {
  const url = URL.createObjectURL(png)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
```

**Features**:
- High resolution (2x scale)
- Includes entire graph (not just viewport)
- Dark background matches UI
- Automatic download

### SVG Export

```typescript
export function exportAsSVG(
  cy: cytoscape.Core,
  filename: string = 'automaton.svg'
): void
```

**Implementation**:

Generates SVG manually from Cytoscape graph data:

```typescript
const json = cy.json()
const nodes = json.elements?.nodes || []
const edges = json.elements?.edges || []

// Build SVG string
let svg = `<svg xmlns="http://www.w3.org/2000/svg" ...>
  <rect fill="#1e1e2e"/>  <!-- Background -->
  <g>`

// Add circles for nodes
nodes.forEach((node) => {
  const x = node.position?.x || 0
  const y = node.position?.y || 0
  svg += `<circle cx="${x}" cy="${y}" r="20" .../>`
})

// Add lines for edges
edges.forEach((edge) => {
  // Find source and target positions
  // Draw line with arrowhead
  svg += `<line x1="..." y1="..." x2="..." y2="..." />`
})

svg += `</g></svg>`

// Download as file
const blob = new Blob([svg], { type: 'image/svg+xml' })
// ... download logic
```

**Features**:
- Vector format (scales infinitely)
- Editable in vector graphics programs
- Smaller file size than PNG
- Preserves structure

### JSON Export

```typescript
export function exportAsJSON(
  cy: cytoscape.Core,
  filename: string = 'automaton.json'
): void
```

Exports full Cytoscape graph state as JSON:

```typescript
const json = cy.json()
const jsonStr = JSON.stringify(json, null, 2)

const blob = new Blob([jsonStr], { type: 'application/json' })
// ... download logic
```

**Use Cases**:
- Save graph state
- Import into other tools
- Debugging layout

## Integration with Components

### AutomatonView Integration

```typescript
const graphRef = useRef<AutomatonGraphHandle>(null)

const handleExportPNG = () => {
  const cy = graphRef.current?.getCytoscapeInstance()
  if (cy) {
    exportAsPNG(cy, `${title}.png`)
  }
}

return (
  <div>
    {activeTab === 'graph' && (
      <>
        <Button onClick={handleExportPNG}>PNG</Button>
        <AutomatonGraph ref={graphRef} automaton={automaton} />
      </>
    )}
  </div>
)
```

### Simulation Highlighting

```typescript
// In SimulationPanel
useEffect(() => {
  if (currentStepData) {
    onHighlightChange(currentStepData.nextStates, [])
  }
}, [currentStepData])

// In App
<AutomatonGraph
  automaton={nfa}
  highlightStates={simulationMode === 'nfa' ? nfaHighlightStates : []}
/>
```

## Performance Considerations

### Avoiding Re-renders

- Cytoscape instance created once per automaton
- Highlights updated without destroying/recreating
- Layout computed once, cached by Cytoscape

### Layout Caching

**File**: `src/visualization/layoutCache.ts`

Graph node positions are cached in localStorage:
- Cache key generated from automaton structure (states + transitions)
- Max 50 cached layouts, oldest evicted when full
- 24-hour expiry on cached positions
- Positions restored on page refresh or tab switch
- Manual node drags update the cache automatically

### Large Graphs

For automata with many states:
- Breadthfirst layout: O(n) time
- COSE layout: O(n² × iterations) time
- Rendering: Hardware-accelerated canvas

Current implementation handles up to ~100 states smoothly.

### Memory Management

```typescript
return () => {
  cyRef.current?.destroy()  // Clean up on unmount
  cyRef.current = null
}
```

Cytoscape instance destroyed when component unmounts to prevent memory leaks.

## Accessibility

Current implementation focuses on visual representation. Future enhancements:

- Text description of graph structure
- Keyboard navigation between nodes
- Screen reader announcements for highlights
- High contrast mode option

## Future Enhancements

Potential improvements:

1. **Animated Transitions**: Smooth animation between simulation steps
2. **Manual Layout**: Allow users to drag nodes
3. **Zoom/Pan Controls**: UI buttons for viewport control
4. **Minimap**: Overview of large graphs
5. **Edge Labels**: Better positioning for readability
6. **Self-loops**: Special rendering for transitions from state to itself
7. **Multiple Edges**: Bundle parallel transitions
8. **Layout Options**: User-selectable layout algorithms
