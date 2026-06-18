import { describe, it, expect } from 'vitest'
import { automatonToMarkdown } from './automatonToMarkdown'
import type { Automaton } from '@/core/automata/types'

// This suite proves the Markdown serializer reproduces the EXACT delta the
// TransitionTable renders: a sorted alphabet, the lambda column only for an NFA
// (a transition with a null symbol), set notation for multiple targets, and the
// empty-set glyph for no transition. A pipe inside any id or symbol is escaped so
// a crafted value cannot break out of the GitHub pipe table (threat T-12-08).

describe('automatonToMarkdown', () => {
  it('emits a header row, a separator row, and one row per state', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a']),
    }
    const md = automatonToMarkdown(a)
    const lines = md.split('\n')
    expect(lines[0]).toMatch(/^\| State \|/)
    expect(lines[1]).toMatch(/^\| --- \|/)
    // Header + separator + two state rows.
    expect(lines).toHaveLength(4)
  })

  it('sorts the alphabet columns and omits the lambda column for a lambda-free automaton', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }],
      transitions: [
        { from: 'q0', to: 'q0', symbol: 'b' },
        { from: 'q0', to: 'q0', symbol: 'a' },
      ],
      startState: 'q0',
      acceptStates: [],
      alphabet: new Set(['b', 'a']),
    }
    const md = automatonToMarkdown(a)
    const header = md.split('\n')[0]
    // Columns sorted: a before b. No lambda column when no null transition exists.
    expect(header.indexOf('a')).toBeLessThan(header.indexOf('b'))
    expect(header).not.toContain('λ')
  })

  // The lambda column appears only for an NFA (a null-symbol transition), and a set
  // of targets renders as the brace notation, exactly as TransitionTable does.
  it('includes the lambda column and a set cell for an NFA with a lambda move', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [
        { from: 'q0', to: 'q0', symbol: null },
        { from: 'q0', to: 'q1', symbol: null },
      ],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set<string>(),
    }
    const md = automatonToMarkdown(a)
    expect(md).toContain('λ')
    // Two lambda targets from q0 -> the sorted set cell.
    expect(md).toContain('{q0,q1}')
  })

  it('renders the empty-set glyph when a state has no transition on a symbol', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a']),
    }
    const md = automatonToMarkdown(a)
    // q1 has no outgoing transition on 'a', so its cell is the empty-set glyph.
    expect(md).toContain('∅')
  })

  it('prefixes the start state with the start marker and the accept state with the accept marker', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a']),
    }
    const md = automatonToMarkdown(a)
    expect(md).toContain('→') // start marker on q0
    expect(md).toContain('✓') // accept marker on q1
  })

  // Threat T-12-08: a pipe inside a symbol must be escaped so it does not open a
  // new table column when the Markdown is rendered.
  it('escapes a pipe in a symbol to a backslash-pipe', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a|b' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a|b']),
    }
    const md = automatonToMarkdown(a)
    expect(md).toContain('a\\|b')
  })

  it('escapes a pipe inside a state id used as a row label', () => {
    const a: Automaton = {
      states: [{ id: 'a|b' }],
      transitions: [],
      startState: 'a|b',
      acceptStates: [],
      alphabet: new Set<string>(),
    }
    const md = automatonToMarkdown(a)
    expect(md).toContain('a\\|b')
  })

  // Threat T-12-08, the backslash-escaping crux. mdCell neutralizes the backslash
  // FIRST (\ -> \\) and only then the pipe (| -> \|). So a literal "\|" must become
  // "\\\|": the original backslash is doubled and the original pipe gets its own
  // escape. The old order escaped the pipe first and produced "\\|", which renders
  // as an escaped backslash followed by a LIVE pipe that opens a new column. This
  // test distinguishes the correct "\\\|" from the buggy "\\|".
  it('escapes a backslash before a pipe so the pipe cannot survive as a live column break', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: '\\|' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['\\|']),
    }
    const md = automatonToMarkdown(a)
    // The header carries the column symbol "\|" -> the escaped form "\\\|".
    expect(md).toContain('\\\\\\|')
    // The buggy backslash-then-live-pipe output must NOT appear as the rendered
    // cell: "\\|" with no third escaping backslash before the pipe. Asserted via a
    // regex that forbids exactly two backslashes immediately before a pipe.
    expect(/(^|[^\\])\\\\\|/.test(md)).toBe(false)
  })

  it('escapes a lone backslash in a state id to a double backslash', () => {
    const a: Automaton = {
      states: [{ id: 'q\\0' }],
      transitions: [],
      startState: 'q\\0',
      acceptStates: [],
      alphabet: new Set<string>(),
    }
    const md = automatonToMarkdown(a)
    // The single backslash in the id is doubled; the raw "q\0" must not survive.
    expect(md).toContain('q\\\\0')
    expect(md).not.toContain('q\\0|')
  })

  // A newline inside a cell would break the single-line table row, so mdCell
  // collapses CR/LF to a single space.
  it('replaces a newline inside a symbol with a space so the row stays intact', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a\nb' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a\nb']),
    }
    const md = automatonToMarkdown(a)
    expect(md).toContain('a b')
    // No state row carries a bare newline that would split it across lines: header,
    // separator, and exactly one row per state.
    expect(md.split('\n')).toHaveLength(2 + a.states.length)
  })
})
