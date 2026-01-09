export const colors = {
  base: '#1e1e2e',
  surface0: '#313244',
  surface1: '#45475a',
  text: '#cdd6f4',
  blue: '#89b4fa',
  green: '#a6e3a1',
  mauve: '#cba6f7',
  red: '#f38ba8',
  yellow: '#f9e2af',
  overlay0: '#6c7086',
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
        'background-color': colors.surface0,
        'border-width': 2,
        'border-color': colors.overlay0,
        label: 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        color: colors.text,
        'font-size': 14,
        width: 40,
        height: 40,
      },
    },
    {
      selector: 'node[isStart]',
      style: {
        'border-color': colors.blue,
        'border-width': 3,
      },
    },
    {
      selector: 'node[isAccept]',
      style: {
        'border-width': 6,
        'border-color': colors.green,
      },
    },
    {
      selector: 'node.active',
      style: {
        'background-color': colors.yellow,
        'border-color': colors.mauve,
      },
    },
    {
      selector: 'node.current',
      style: {
        'background-color': colors.mauve,
        'border-color': colors.yellow,
        'border-width': 4,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 2,
        'line-color': colors.overlay0,
        'target-arrow-color': colors.overlay0,
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-size': 12,
        color: colors.text,
        'text-background-color': colors.base,
        'text-background-opacity': 1,
        'text-background-padding': 2,
      },
    },
    {
      selector: 'edge[label = "ε"]',
      style: {
        'line-style': 'dashed',
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
        'line-color': colors.mauve,
        'target-arrow-color': colors.mauve,
        width: 3,
      },
    },
  ]
}
