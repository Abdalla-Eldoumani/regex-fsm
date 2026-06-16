import { describe, it, expect } from 'vitest'
import { automatonToCSV } from './automatonToCSV'
import type { Automaton } from '@/core/automata/types'

// This suite proves the CSV serializer reproduces the same transition-table delta
// as the on-screen table and that it is safe to open in a spreadsheet: a cell that
// begins with a formula trigger is neutralized with a leading apostrophe before
// quoting (the CSV-injection guard, threat T-12-09), and any cell containing a
// comma, quote, newline, or the set braces is wrapped with standard quote-doubling.

describe('automatonToCSV', () => {
  it('emits a header naming State and each alphabet symbol', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }],
      transitions: [
        { from: 'q0', to: 'q0', symbol: 'a' },
        { from: 'q0', to: 'q0', symbol: 'b' },
      ],
      startState: 'q0',
      acceptStates: [],
      alphabet: new Set(['b', 'a']),
    }
    const csv = automatonToCSV(a)
    const header = csv.split('\n')[0]
    expect(header).toContain('State')
    // Sorted columns: a before b.
    expect(header.indexOf('a')).toBeLessThan(header.indexOf('b'))
  })

  it('includes a lambda column header only for an NFA with a lambda move', () => {
    const nfa: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: null }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set<string>(),
    }
    const csv = automatonToCSV(nfa)
    expect(csv.split('\n')[0]).toContain('λ')

    const dfa: Automaton = {
      states: [{ id: 'q0' }],
      transitions: [{ from: 'q0', to: 'q0', symbol: 'a' }],
      startState: 'q0',
      acceptStates: [],
      alphabet: new Set(['a']),
    }
    expect(automatonToCSV(dfa).split('\n')[0]).not.toContain('λ')
  })

  // Threat T-12-09: a cell beginning with '=' would execute as a formula in a
  // spreadsheet, so it is neutralized with a leading apostrophe. After the guard the
  // cell still contains '+' so it stays a quoted string per standard CSV rules. The
  // dangerous id is a NON-start, NON-accept state so the trigger sits at the true
  // start of the cell (a marker prefix would otherwise neutralize it incidentally,
  // which would not prove the guard fires on a bare hostile id).
  it('neutralizes a formula-trigger cell with a leading apostrophe', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: '=1+1' }],
      transitions: [],
      startState: 'q0',
      acceptStates: [],
      alphabet: new Set<string>(),
    }
    const csv = automatonToCSV(a)
    // The guarded value is "'=1+1"; quoting wraps it. Accept either the bare guarded
    // form or the quoted form, but the leading apostrophe must be present.
    expect(csv.includes("'=1+1") || csv.includes('"\'=1+1"')).toBe(true)
    // The cell must never appear as a raw =1+1 at a field boundary (start of line or
    // immediately after a comma) where a spreadsheet would evaluate it.
    expect(/(^|,)=1\+1/m.test(csv)).toBe(false)
  })

  it('guards the other formula triggers plus, minus, and at-sign', () => {
    const mk = (id: string): Automaton => ({
      // A benign start state keeps the dangerous id unmarked so its trigger
      // character is genuinely the first character of the State cell.
      states: [{ id: 'q0' }, { id }],
      transitions: [],
      startState: 'q0',
      acceptStates: [],
      alphabet: new Set<string>(),
    })
    expect(automatonToCSV(mk('+x'))).toContain("'+x")
    expect(automatonToCSV(mk('-x'))).toContain("'-x")
    expect(automatonToCSV(mk('@x'))).toContain("'@x")
  })

  // Standard CSV quoting: a set cell contains a comma and braces, so it must be wrapped
  // in double quotes so the comma does not split the field.
  it('quotes a set cell containing a comma and braces', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
      transitions: [
        { from: 'q0', to: 'q1', symbol: 'a' },
        { from: 'q0', to: 'q2', symbol: 'a' },
      ],
      startState: 'q0',
      acceptStates: [],
      alphabet: new Set(['a']),
    }
    const csv = automatonToCSV(a)
    // The set cell {q1,q2} contains a comma -> it is quoted.
    expect(csv).toContain('"{q1,q2}"')
  })

  it('doubles an internal double-quote in a cell', () => {
    const a: Automaton = {
      // Unmarked state so the cell is exactly q"0, not a marker-prefixed variant.
      states: [{ id: 'q0' }, { id: 'q"0' }],
      transitions: [],
      startState: 'q0',
      acceptStates: [],
      alphabet: new Set<string>(),
    }
    const csv = automatonToCSV(a)
    // A quote inside the value is doubled and the whole field is wrapped in quotes.
    expect(csv).toContain('"q""0"')
  })

  it('renders the empty-set glyph for a state with no transition on a symbol', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a']),
    }
    const csv = automatonToCSV(a)
    expect(csv).toContain('∅')
  })

  it('marks the start and accept states in the State cell', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a']),
    }
    const csv = automatonToCSV(a)
    expect(csv).toContain('→')
    expect(csv).toContain('✓')
  })
})
