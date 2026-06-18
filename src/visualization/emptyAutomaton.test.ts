import { describe, it, expect } from 'vitest'
import { automatonToMarkdown } from './automatonToMarkdown'
import { automatonToCSV } from './automatonToCSV'
import { automatonToTikZ } from './automatonToTikZ'
import { automatonToDescription } from './describe'
import type { Automaton } from '@/core/automata/types'

// A zero-state automaton is a real edge case for every exporter: the editor can hold
// an empty canvas, and a degenerate model must serialize to well-formed (not
// crashing, not malformed) output rather than throwing. These tests pin that each of
// the four serializers handles the empty automaton and emits its structural anchor.

const EMPTY: Automaton = {
  states: [],
  transitions: [],
  startState: '',
  acceptStates: [],
  alphabet: new Set<string>(),
}

describe('empty automaton export', () => {
  it('automatonToMarkdown emits a header and separator and no state rows', () => {
    const md = automatonToMarkdown(EMPTY)
    const lines = md.split('\n')
    // Header + separator only; no state rows for zero states.
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/^\| State \|/)
    expect(lines[1]).toMatch(/^\| --- \|/)
  })

  it('automatonToCSV emits just the header line', () => {
    const csv = automatonToCSV(EMPTY)
    // One header row naming State, no data rows.
    expect(csv.split('\n')).toHaveLength(1)
    expect(csv).toContain('State')
  })

  it('automatonToTikZ emits a valid, empty tikzpicture environment', () => {
    const tex = automatonToTikZ(EMPTY)
    expect(tex).toContain('\\begin{tikzpicture}')
    expect(tex).toContain('\\end{tikzpicture}')
    // No nodes for an empty automaton.
    expect(tex).not.toContain('\\node')
  })

  it('automatonToDescription announces the quintuple and an empty machine', () => {
    const text = automatonToDescription(EMPTY)
    expect(text).toContain('(Q, Σ, δ, q₀, A)')
    // Empty alphabet and accept set use the empty-set glyph; no states roster.
    expect(text).toContain('Σ = ∅')
    expect(text).toContain('A = ∅')
    expect(text).toContain('No states.')
  })

  it('no serializer throws on the empty automaton', () => {
    expect(() => automatonToMarkdown(EMPTY)).not.toThrow()
    expect(() => automatonToCSV(EMPTY)).not.toThrow()
    expect(() => automatonToTikZ(EMPTY)).not.toThrow()
    expect(() => automatonToDescription(EMPTY)).not.toThrow()
  })
})
