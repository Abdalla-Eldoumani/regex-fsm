export const colors = {
  canvas: '#EBE7DD',
  parchment: '#F5F1E8',
  ink: '#1A1A1A',
  inkLight: '#4A4A4A',
  border: '#D4CFC0',
  borderDark: '#B8B3A8',
  teal: '#4A7C7E',
  tealDark: '#3A6365',
  terracotta: '#C1666B',
  terracottaDark: '#A8565A',
  ochre: '#D4A574',
  ochreDark: '#B88D5E',
  sage: '#8B9D83',
}

type StyleRule = {
  selector: string
  style: Record<string, string | number>
}

export function getStylesheet(): StyleRule[] {
  return [
    {
      selector: 'node',
      style: {
        'background-color': colors.parchment,
        'border-width': 3,
        'border-color': colors.border,
        label: 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        color: colors.ink,
        'font-family': 'JetBrains Mono, monospace',
        'font-size': 15,
        'font-weight': 500,
        width: 50,
        height: 50,
      },
    },
    {
      selector: 'node[isStart]',
      style: {
        'border-color': colors.teal,
        'border-width': 4,
        'background-color': '#4A7C7E15',
      },
    },
    {
      selector: 'node[isAccept]',
      style: {
        'border-width': 6,
        'border-color': colors.terracotta,
        'background-color': '#C1666B10',
      },
    },
    {
      selector: 'node.active',
      style: {
        'background-color': colors.ochre,
        'border-color': colors.ochreDark,
        'border-width': 5,
      },
    },
    {
      selector: 'node.current',
      style: {
        'background-color': colors.sage,
        'border-color': colors.tealDark,
        'border-width': 5,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 3,
        'line-color': colors.borderDark,
        'target-arrow-color': colors.borderDark,
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-size': 13,
        'font-family': 'JetBrains Mono, monospace',
        'font-weight': 500,
        color: colors.inkLight,
        'text-background-color': colors.canvas,
        'text-background-opacity': 0.95,
        'text-background-padding': 4,
        'text-background-shape': 'roundrectangle',
      },
    },
    {
      selector: 'edge[label = "ε"]',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [8, 4],
      },
    },
    {
      selector: 'edge.loop',
      style: {
        'curve-style': 'loop',
        'loop-direction': '0deg',
        'loop-sweep': '45deg',
      },
    },
    {
      selector: 'edge.active',
      style: {
        'line-color': colors.teal,
        'target-arrow-color': colors.teal,
        width: 4,
      },
    },
  ]
}
