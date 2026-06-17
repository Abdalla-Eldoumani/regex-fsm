import type { Automaton } from '@/core/automata/types'

// Pure CSV serializer for the transition function. The rows, columns, and cells
// EQUAL the delta the on-screen TransitionTable renders, so the export matches
// what the app shows. Two safety controls apply to every cell, in order: first the
// CSV-injection prefix guard (threat T-12-09), then standard CSV quoting. String
// in, string out, no DOM.

const LAMBDA = 'λ'
const EMPTY = '∅'

// CSV cell encoder. The prefix guard runs FIRST: a cell whose first character is a
// formula trigger (= + - @, or a leading tab/CR which some spreadsheets also treat
// as a formula lead-in) is neutralized with a leading apostrophe, so the
// spreadsheet stores it as text instead of evaluating it. Standard quoting runs
// SECOND: if the value contains a comma, double quote, or newline, wrap it in
// double quotes and double any internal quote. The order matters: guarding adds a
// character that quoting must then see when it decides whether to wrap.
function csvCell(raw: string): string {
  let s = raw
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

// The sorted target set for one (state, symbol) cell, matching TransitionTable:
// empty -> the empty-set glyph, one -> the target, many -> the brace set. The
// braces and the comma in a set cell are exactly why csvCell must quote it.
function cellTargets(automaton: Automaton, from: string, symbol: string | null): string {
  const targets = automaton.transitions
    .filter(t => t.from === from && t.symbol === symbol)
    .map(t => t.to)
    .sort()
  if (targets.length === 0) return EMPTY
  if (targets.length === 1) return targets[0]
  return `{${targets.join(',')}}`
}

export function automatonToCSV(automaton: Automaton): string {
  const alphabet = Array.from(automaton.alphabet).sort()
  const hasLambda = automaton.transitions.some(t => t.symbol === null)
  const columns = hasLambda ? [...alphabet, LAMBDA] : alphabet

  const acceptSet = new Set(automaton.acceptStates)

  const headerRow = ['State', ...columns].map(csvCell).join(',')

  const rows = automaton.states.map(state => {
    const marker =
      (state.id === automaton.startState ? '→ ' : '') +
      (acceptSet.has(state.id) ? '✓ ' : '')
    const cells = columns.map(col =>
      csvCell(cellTargets(automaton, state.id, col === LAMBDA ? null : col))
    )
    return [csvCell(marker + state.id), ...cells].join(',')
  })

  return [headerRow, ...rows].join('\n')
}
