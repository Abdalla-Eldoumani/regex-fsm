export const colors = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  textPrimary: '#18181B',
  textSecondary: '#71717A',
  border: '#E4E4E7',
  borderDark: '#A1A1AA',
  
  primary: '#6366F1', // Indigo 500
  primaryLight: '#E0E7FF', // Indigo 100
  primaryDark: '#4338CA', // Indigo 700
  
  success: '#10B981', // Emerald 500
  successLight: '#D1FAE5', // Emerald 100
  
  error: '#EF4444', // Red 500
  
  highlight: '#F59E0B', // Amber 500 for active steps
}

type StyleRule = {
  selector: string
  style: Record<string, string | number | number[]>
}

export function getStylesheet(): StyleRule[] {
  return [
    {
      selector: 'node',
      style: {
        'background-color': colors.surface,
        'border-width': 2.5,
        'border-color': colors.textSecondary, // Darker border for better visibility
        label: 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        color: colors.textPrimary,
        'font-family': 'Inter, system-ui, sans-serif', // Clean sans-serif for better readability
        'font-size': 16,
        'font-weight': 700,
        width: 55,
        height: 55,
        'text-margin-y': 0,
        'overlay-opacity': 0,
        'ghost': 'yes',
        'ghost-offset-x': 2,
        'ghost-offset-y': 2,
        'ghost-opacity': 0.1,
      },
    },
    {
      selector: 'node[id = "__start_marker__"]',
      style: {
        width: 1,
        height: 1,
        'background-opacity': 0,
        'border-width': 0,
        label: '',
      },
    },
    {
      selector: 'node[isStart]',
      style: {
        'border-color': colors.primary,
        'border-width': 5,
        'background-color': '#C7D2FE', // More prominent indigo (Indigo 200)
        color: colors.primaryDark,
        'shadow-blur': 15,
        'shadow-color': colors.primary,
        'shadow-opacity': 0.6,
        'shadow-offset-x': 0,
        'shadow-offset-y': 0,
      },
    },
    {
      selector: 'node[isAccept]',
      style: {
        'border-width': 7,
        'border-style': 'double',
        'border-color': colors.success,
        'background-color': '#A7F3D0', // More prominent emerald (Emerald 200)
        color: '#047857',
        'padding': 8,
        'shadow-blur': 10,
        'shadow-color': colors.success,
        'shadow-opacity': 0.4,
        'shadow-offset-x': 0,
        'shadow-offset-y': 0,
      },
    },
    {
      selector: 'node[id = "∅"]',
      style: {
        'border-style': 'dashed',
        'border-color': colors.error,
        'border-width': 4,
        'background-color': '#FECACA', // More prominent red (Red 200)
        color: '#991B1B',
        'shadow-blur': 10,
        'shadow-color': colors.error,
        'shadow-opacity': 0.4,
        'shadow-offset-x': 0,
        'shadow-offset-y': 0,
      },
    },
    // Also match trap states by isTrap data attribute
    {
      selector: 'node[?isTrap]',
      style: {
        'border-style': 'dashed',
        'border-color': colors.error,
        'border-width': 4,
        'background-color': '#FECACA', // More prominent red (Red 200)
        color: '#991B1B',
        'shadow-blur': 10,
        'shadow-color': colors.error,
        'shadow-opacity': 0.4,
        'shadow-offset-x': 0,
        'shadow-offset-y': 0,
      },
    },
    // Simulation states
    {
      selector: 'node.active', // When the node is being processed
      style: {
        'background-color': '#FCD34D', // Bright amber/yellow (Amber 300)
        'border-color': colors.highlight,
        'border-width': 3,
        color: '#78350F', // Dark amber for contrast
        'shadow-blur': 18,
        'shadow-color': colors.highlight,
        'shadow-opacity': 0.7,
        'shadow-offset-x': 0,
        'shadow-offset-y': 0,
        'transition-property': 'background-color, border-color, shadow-opacity',
        'transition-duration': 300,
        scale: 1.05,
      },
    },
    {
      selector: 'node.current', // Current state in simulation
      style: {
        'background-color': '#FBBF24', // Bright yellow (Amber 400)
        'border-color': '#D97706', // Amber 600
        'border-width': 4,
        color: '#78350F', // Dark amber text for contrast
        'shadow-blur': 20,
        'shadow-color': '#F59E0B',
        'shadow-opacity': 0.8,
        'shadow-offset-x': 0,
        'shadow-offset-y': 0,
        scale: 1.15,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 2.5,
        'line-color': '#A1A1AA', // Zinc 400
        'target-arrow-color': '#A1A1AA',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-size': 13,
        'font-family': 'JetBrains Mono, monospace', // Mono for transition symbols
        'font-weight': 600,
        color: colors.textPrimary,
        'text-background-color': colors.background,
        'text-background-opacity': 1,
        'text-background-padding': 6,
        'text-background-shape': 'roundrectangle',
        'text-border-color': colors.border,
        'text-border-width': 1,
        'text-border-opacity': 1,
        'arrow-scale': 1.3,
      },
    },
    {
      selector: 'edge[label = "λ"]',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [6, 4],
        'line-color': '#D4D4D8',
        'target-arrow-color': '#D4D4D8',
        color: '#A1A1AA',
      },
    },
    {
      selector: 'edge.loop',
      style: {
        'curve-style': 'bezier',
        'loop-direction': '0deg',
        'loop-sweep': '45deg',
      },
    },
    {
      selector: 'edge.active',
      style: {
        'line-color': colors.highlight,
        'target-arrow-color': colors.highlight,
        width: 4,
        color: colors.highlight,
        'z-index': 10,
        'text-border-color': colors.highlight,
      },
    },
    {
      selector: 'edge.start-arrow',
      style: {
        width: 3,
        'line-color': colors.primary,
        'target-arrow-color': colors.primary,
        'target-arrow-shape': 'triangle',
        'arrow-scale': 1.5,
        'curve-style': 'bezier',
        label: '',
        'z-index': 1,
      },
    },
  ]
}
