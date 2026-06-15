// Only union and empty-string differ between course and textbook notation.
// All other symbols used in this course are mode-invariant: empty language '∅',
// alphabet 'Σ', accepting set 'A', Kleene star '*', positive closure '+', optional '?'.
// Those are deliberately excluded from this flip map so they cannot be toggled accidentally.

export type NotationMode = 'course' | 'textbook'

export const GLYPHS = {
  course: { union: '+', empty: 'λ' },
  textbook: { union: '|', empty: 'ε' },
} as const
