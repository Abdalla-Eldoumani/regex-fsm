import type { Automaton } from '@/core/automata/types'

// Pure GitHub pipe-table serializer for the transition function. The rows,
// columns, and cells EQUAL the delta the on-screen TransitionTable renders, so a
// student copying the table to a document sees exactly what the app shows: a
// sorted alphabet, the lambda column only for an NFA (a transition whose symbol
// is null, the empty-string move), set notation for multiple targets, and the
// empty-set glyph for no transition. String in, string out, no DOM.

// The course glyphs. Lambda is the empty string; the empty-set glyph is both the
// no-transition cell and the trap-state id.
const LAMBDA = 'λ'
const EMPTY = '∅'

// Escape a cell for a Markdown pipe table. Backslash is neutralized first so a
// literal "\|" cannot survive as an escaped backslash plus a live pipe that opens
// a new column; then the pipe and the newline (which would break the row) are
// neutralized too (threat T-12-08).
function mdCell(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

// The sorted target set for one (state, symbol) cell, in TransitionTable's exact
// shape: empty -> the empty-set glyph, one -> the target, many -> the brace set.
function cellTargets(automaton: Automaton, from: string, symbol: string | null): string {
  const targets = automaton.transitions
    .filter(t => t.from === from && t.symbol === symbol)
    .map(t => t.to)
    .sort()
  if (targets.length === 0) return EMPTY
  if (targets.length === 1) return targets[0]
  return `{${targets.join(',')}}`
}

export function automatonToMarkdown(automaton: Automaton): string {
  // Mirror TransitionTable: sorted alphabet, lambda column only when some
  // transition consumes the empty string.
  const alphabet = Array.from(automaton.alphabet).sort()
  const hasLambda = automaton.transitions.some(t => t.symbol === null)
  const columns = hasLambda ? [...alphabet, LAMBDA] : alphabet

  const acceptSet = new Set(automaton.acceptStates)

  const header = `| State | ${columns.map(mdCell).join(' | ')} |`
  const separator = `| --- | ${columns.map(() => '---').join(' | ')} |`

  const rows = automaton.states.map(state => {
    // Row state markers mirror the table: the start arrow then the accept check.
    const marker =
      (state.id === automaton.startState ? '→ ' : '') +
      (acceptSet.has(state.id) ? '✓ ' : '')
    const cells = columns.map(col =>
      mdCell(cellTargets(automaton, state.id, col === LAMBDA ? null : col))
    )
    return `| ${mdCell(marker + state.id)} | ${cells.join(' | ')} |`
  })

  return [header, separator, ...rows].join('\n')
}
