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
      selector: 'node[isStart]',
      style: {
        'border-color': colors.primary,
        'border-width': 3,
        'background-color': '#EEF2FF', // Very light indigo
        color: colors.primaryDark,
      },
    },
    {
      selector: 'node[isAccept]',
      style: {
        'border-width': 6,
        'border-style': 'double',
        'border-color': colors.success,
        'background-color': '#ECFDF5', // Very light emerald
        color: '#047857',
      },
    },
    // Simulation states
    {
      selector: 'node.active', // When the node is being processed
      style: {
        'background-color': colors.highlight,
        'border-color': colors.highlight,
        'border-width': 0,
        color: '#FFFFFF',
        'transition-property': 'background-color, border-color',
        'transition-duration': 300,
      },
    },
    {
      selector: 'node.current', // Current state in simulation
      style: {
        'background-color': colors.primary,
        'border-color': colors.primaryDark,
        'border-width': 0,
        color: '#FFFFFF',
        'shadow-blur': 15,
        'shadow-color': colors.primary,
        'shadow-opacity': 0.4,
        scale: 1.1,
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
      selector: 'edge[label = "ε"]',
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
  ]
}
