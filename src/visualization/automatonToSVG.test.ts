import { describe, it, expect } from 'vitest'
import { automatonToSVG, type SvgColors, type Pt } from './automatonToSVG'
import type { Automaton } from '@/core/automata/types'

// This suite proves the model-driven SVG serializer fixes all seven documented
// defects of the old hand-rolled exportAsSVG, and that it reflects the actual
// (Q, Sigma, delta, q0, A) it is given. The serializer is pure (no DOM, no
// window): colors arrive via the colors argument and positions via the positions
// argument, so the whole file is unit-testable without a browser. Per the
// automata-correctness skill, the output must BE the automaton (invariant 8); a
// crafted id or symbol must not break out of the XML document (threat T-12-06).

const COLORS: SvgColors = {
  bg: '#0E1117',
  nodeFill: '#1D222D',
  stroke: '#626D86',
  edge: '#9AA3B5',
  text: '#E8EBF2',
  start: '#56B4E9',
  accept: '#2BB17A',
  trap: '#CB7BB0',
}

// A deterministic spread so the bounds-derived viewBox is non-trivial to assert.
function pts(map: Record<string, [number, number]>): Record<string, Pt> {
  const out: Record<string, Pt> = {}
  for (const [id, [x, y]] of Object.entries(map)) out[id] = { x, y }
  return out
}

describe('automatonToSVG', () => {
  it('emits a well-formed svg element', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }],
      transitions: [],
      startState: 'q0',
      acceptStates: [],
      alphabet: new Set<string>(),
    }
    const svg = automatonToSVG(a, pts({ q0: [100, 100] }), COLORS)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true)
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
  })

  // Defect 1: the viewBox must be computed from the actual positions plus padding,
  // never the old fixed 800x600 that clipped any node outside the box.
  it('computes the viewBox from the given positions, not a fixed 800x600', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a']),
    }
    // Place nodes far outside the old 800x600 box so a hardcoded viewBox would clip them.
    const svg = automatonToSVG(a, pts({ q0: [1000, 1200], q1: [1400, 1200] }), COLORS)
    const m = /viewBox="([^"]+)"/.exec(svg)
    expect(m).not.toBeNull()
    const [minX, minY, w, h] = m![1].split(/\s+/).map(Number)
    // The box must contain both node centers with their radius and padding.
    expect(minX).toBeLessThan(1000)
    expect(minY).toBeLessThan(1200)
    expect(minX + w).toBeGreaterThan(1400)
    expect(minY + h).toBeGreaterThan(1200)
    // Explicitly NOT the old fixed geometry.
    expect(svg).not.toContain('viewBox="0 0 800 600"')
    expect(svg).not.toContain('width="800" height="600"')
  })

  // Defect 2a: a self-loop (from === to) must be a visible arc, drawn as a path,
  // not the old zero-length line that rendered nothing.
  it('renders a self-loop as a path, not a zero-length line', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }],
      transitions: [{ from: 'q0', to: 'q0', symbol: 'a' }],
      startState: 'q0',
      acceptStates: [],
      alphabet: new Set(['a']),
    }
    const svg = automatonToSVG(a, pts({ q0: [100, 100] }), COLORS)
    expect(svg).toContain('<path')
    // The self-loop must not collapse to a degenerate straight line between equal points.
    expect(svg).not.toContain('x1="100" y1="100" x2="100" y2="100"')
  })

  // Defect 2b: two transitions between the same pair must curve clear of each other,
  // producing two distinct edge paths with both symbol labels rendered.
  it('separates parallel edges and renders both symbols', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [
        { from: 'q0', to: 'q1', symbol: 'a' },
        { from: 'q0', to: 'q1', symbol: 'b' },
      ],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a', 'b']),
    }
    const svg = automatonToSVG(a, pts({ q0: [100, 100], q1: [300, 100] }), COLORS)
    // Two curved edge paths between the same pair (quadratic bezier control points).
    const edgePaths = svg.match(/<path[^>]*class="edge"/g) ?? []
    expect(edgePaths.length).toBe(2)
    // The two control points must differ so the curves do not overlap.
    const qs = [...svg.matchAll(/d="M[^"]*Q\s*([\d.eE+-]+)[ ,]+([\d.eE+-]+)/g)].map(
      g => `${g[1]},${g[2]}`
    )
    expect(new Set(qs).size).toBeGreaterThan(1)
    // Both symbols present as edge labels.
    expect(svg).toContain('>a<')
    expect(svg).toContain('>b<')
  })

  // Defect 3a: the state LABEL is rendered (label ?? id), centered, never just the id.
  it('renders the state label when present', () => {
    const a: Automaton = {
      states: [{ id: 'q0', label: 'start' }],
      transitions: [],
      startState: 'q0',
      acceptStates: [],
      alphabet: new Set<string>(),
    }
    const svg = automatonToSVG(a, pts({ q0: [100, 100] }), COLORS)
    expect(svg).toContain('>start<')
  })

  // Defect 3b: every edge symbol is rendered, and a null symbol (the empty string
  // move) renders as the course glyph lambda.
  it('renders the lambda glyph for a null transition symbol', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: null }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set<string>(),
    }
    const svg = automatonToSVG(a, pts({ q0: [100, 100], q1: [300, 100] }), COLORS)
    expect(svg).toContain('>λ<') // the lambda character
  })

  // Defect 4a: the start state has an incoming arrow marker (mirrors edge.start-arrow).
  it('draws an incoming start arrow into the start state', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a']),
    }
    const svg = automatonToSVG(a, pts({ q0: [100, 100], q1: [300, 100] }), COLORS)
    // The serializer marks the incoming start arrow with a dedicated class.
    expect(svg).toContain('class="start-arrow"')
    // It is drawn in the start color.
    expect(svg).toContain(COLORS.start)
  })

  // Defect 4b: accept states get the conventional double ring (two concentric circles).
  it('draws two concentric circles for an accept state', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a']),
    }
    const svg = automatonToSVG(a, pts({ q0: [100, 100], q1: [300, 100] }), COLORS)
    // The accept node is rendered with a node circle plus an inner ring circle.
    const acceptCircles = svg.match(/class="accept-ring"/g) ?? []
    expect(acceptCircles.length).toBe(1)
    expect(svg).toContain(COLORS.accept)
  })

  // Defect 4c: the trap state (id is the empty-set glyph, or isTrap) is dashed and dimmed.
  it('draws the trap state with a dashed stroke', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: '∅' }],
      transitions: [
        { from: 'q0', to: '∅', symbol: 'a' },
        { from: '∅', to: '∅', symbol: 'a' },
      ],
      startState: 'q0',
      acceptStates: [],
      alphabet: new Set(['a']),
    }
    const svg = automatonToSVG(a, pts({ q0: [100, 100], '∅': [300, 100] }), COLORS)
    expect(svg).toContain('stroke-dasharray')
    expect(svg).toContain(COLORS.trap)
  })

  // Defect 5: every interpolated id, label, and symbol is XML-escaped so a crafted
  // value cannot break out of the document (threat T-12-06).
  it('XML-escapes a crafted state label and never emits the raw markup', () => {
    const a: Automaton = {
      states: [{ id: 'q0', label: '<b>&"' }],
      transitions: [],
      startState: 'q0',
      acceptStates: [],
      alphabet: new Set<string>(),
    }
    const svg = automatonToSVG(a, pts({ q0: [100, 100] }), COLORS)
    expect(svg).toContain('&lt;b&gt;&amp;&quot;')
    // The raw injected open tag must NOT appear anywhere in the output.
    expect(svg).not.toContain('<b>')
  })

  it('escapes a crafted edge symbol too', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: '<x>' }],
      startState: 'q0',
      acceptStates: [],
      alphabet: new Set(['<x>']),
    }
    const svg = automatonToSVG(a, pts({ q0: [100, 100], q1: [300, 100] }), COLORS)
    expect(svg).toContain('&lt;x&gt;')
    expect(svg).not.toContain('<x>')
  })

  // When no positions are supplied, the serializer computes a deterministic layered
  // placement so the export still reflects the automaton (research A4).
  it('computes a deterministic layout when positions are empty', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
      transitions: [
        { from: 'q0', to: 'q1', symbol: 'a' },
        { from: 'q1', to: 'q2', symbol: 'b' },
      ],
      startState: 'q0',
      acceptStates: ['q2'],
      alphabet: new Set(['a', 'b']),
    }
    const first = automatonToSVG(a, {}, COLORS)
    const second = automatonToSVG(a, {}, COLORS)
    // Deterministic: the same automaton yields the same SVG with no positions.
    expect(first).toBe(second)
    // All three state labels are present.
    expect(first).toContain('>q0<')
    expect(first).toContain('>q1<')
    expect(first).toContain('>q2<')
  })

  it('fills the background with the supplied background color', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }],
      transitions: [],
      startState: 'q0',
      acceptStates: [],
      alphabet: new Set<string>(),
    }
    const svg = automatonToSVG(a, pts({ q0: [100, 100] }), COLORS)
    expect(svg).toContain(COLORS.bg)
  })
})
