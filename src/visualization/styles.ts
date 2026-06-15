// The Cytoscape canvas cannot resolve `var(--color-...)`: CSS custom properties
// never reach the canvas renderer. To keep the graph and the DOM reading one set
// of tokens (the DESIGN-01 no-drift clause), read each token from :root via
// getComputedStyle at stylesheet-build time and inject the resolved string.
// Per-token fallbacks use the matching spec hex so a too-early read (before
// index.css has loaded) never yields a black or transparent node.

type StyleRule = {
  selector: string
  style: Record<string, string | number | number[]>
}

const MONO = 'JetBrains Mono Variable, ui-monospace, monospace'

export function getStylesheet(): StyleRule[] {
  // Read each token from :root via getComputedStyle, resolved once per build
  // after index.css is loaded (called from the renderer's mount effect). The
  // empty-string `||` fallbacks mirror .agent/DESIGN_SYSTEM.md exactly so a
  // too-early read never yields a black or transparent node.
  const root = document.documentElement
  const style = getComputedStyle(root)
  const c = {
    surfaceRaised: style.getPropertyValue('--color-surface-raised').trim() || '#1D222D',
    surface: style.getPropertyValue('--color-surface').trim() || '#171B24',
    borderStrong: style.getPropertyValue('--color-border-strong').trim() || '#626D86',
    textHi: style.getPropertyValue('--color-text-hi').trim() || '#E8EBF2',
    text: style.getPropertyValue('--color-text').trim() || '#C7CDDA',
    textMid: style.getPropertyValue('--color-text-mid').trim() || '#9AA3B5',
    start: style.getPropertyValue('--color-state-start').trim() || '#56B4E9',
    accept: style.getPropertyValue('--color-state-accept').trim() || '#2BB17A',
    active: style.getPropertyValue('--color-state-active').trim() || '#E8A33D',
    trap: style.getPropertyValue('--color-state-trap').trim() || '#CB7BB0',
    onState: style.getPropertyValue('--color-on-state').trim() || '#0E1117',
    brandHover: style.getPropertyValue('--color-brand-hover').trim() || '#948BF7',
  }

  return [
    // Default node: neutral raised surface, mono label in high-emphasis ink,
    // 2px border-strong (the control boundary when border is the only indicator).
    {
      selector: 'node',
      style: {
        'background-color': c.surfaceRaised,
        'border-width': 2,
        'border-color': c.borderStrong,
        label: 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        color: c.textHi,
        'font-family': MONO,
        'font-size': 16,
        'font-weight': 500,
        width: 44,
        height: 44,
        'text-margin-y': 0,
        'overlay-opacity': 0,
      },
    },
    // Invisible marker that anchors the start arrow from open space.
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
    // Start state: state-start fill with ink label. The mandatory non-color cue
    // is the incoming start arrow, styled on the edge.start-arrow selector below.
    {
      selector: 'node[isStart]',
      style: {
        'background-color': c.start,
        'border-color': c.start,
        'border-width': 2,
        color: c.onState,
      },
    },
    // Accept state: state-accept fill with the conventional double ring cue.
    {
      selector: 'node[isAccept]',
      style: {
        'background-color': c.accept,
        'border-color': c.accept,
        'border-width': 6,
        'border-style': 'double',
        color: c.onState,
      },
    },
    // Trap state (∅): state-trap with the dashed + dimmed cue. Matched both by
    // the empty-set id and the isTrap data attribute.
    {
      selector: 'node[id = "∅"]',
      style: {
        'background-color': c.trap,
        'border-color': c.trap,
        'border-width': 2,
        'border-style': 'dashed',
        'line-dash-pattern': [4, 3],
        'background-opacity': 0.7,
        color: c.onState,
      },
    },
    {
      selector: 'node[?isTrap]',
      style: {
        'background-color': c.trap,
        'border-color': c.trap,
        'border-width': 2,
        'border-style': 'dashed',
        'line-dash-pattern': [4, 3],
        'background-opacity': 0.7,
        color: c.onState,
      },
    },
    // Active during simulation: state-active with the thicker-stroke cue. The
    // breathing glow is driven by the DOM/CSS .is-active treatment, not a
    // canvas tween, so reduced motion is honored by construction. No style-level
    // transition is declared here; renderer.tsx gates any JS-driven motion.
    {
      selector: 'node.active',
      style: {
        'background-color': c.active,
        'border-color': c.active,
        'border-width': 3,
        color: c.onState,
      },
    },
    {
      selector: 'node.current',
      style: {
        'background-color': c.active,
        'border-color': c.active,
        'border-width': 3,
        color: c.onState,
      },
    },
    // Edge: thin text-mid line, mono label in --color-text on a small surface chip.
    {
      selector: 'edge',
      style: {
        width: 1.5,
        'line-color': c.textMid,
        'target-arrow-color': c.textMid,
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-size': 13,
        'font-family': MONO,
        'font-weight': 400,
        color: c.text,
        'text-background-color': c.surface,
        'text-background-opacity': 1,
        'text-background-padding': 4,
        'text-background-shape': 'roundrectangle',
        'text-border-color': c.borderStrong,
        'text-border-width': 1,
        'text-border-opacity': 1,
        'arrow-scale': 1.3,
      },
    },
    // Lambda transition: dashed, token-colored.
    {
      selector: 'edge[label = "λ"]',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [6, 4],
        'line-color': c.textMid,
        'target-arrow-color': c.textMid,
        color: c.text,
      },
    },
    // Self-loop geometry is unchanged.
    {
      selector: 'edge.loop',
      style: {
        'curve-style': 'bezier',
        'loop-direction': '0deg',
        'loop-sweep': '45deg',
      },
    },
    // Active edge during traversal: thicker state-active line.
    {
      selector: 'edge.active',
      style: {
        'line-color': c.active,
        'target-arrow-color': c.active,
        width: 2.5,
        color: c.active,
        'z-index': 10,
        'text-border-color': c.active,
      },
    },
    // Start indicator: an incoming arrow into the start node, state-start.
    {
      selector: 'edge.start-arrow',
      style: {
        width: 2,
        'line-color': c.start,
        'target-arrow-color': c.start,
        'target-arrow-shape': 'triangle',
        'arrow-scale': 1.5,
        'curve-style': 'bezier',
        label: '',
        'z-index': 1,
      },
    },
    // Selection halo: brand-hover, reserved for editor selection (a later phase),
    // never used to imply a state role. Defined now but not yet exercised.
    {
      selector: 'node:selected',
      style: {
        'overlay-color': c.brandHover,
        'overlay-opacity': 0.25,
        'overlay-padding': 6,
      },
    },
  ]
}
