/**
 * Toggle-invariance proof (NOTATION-03).
 *
 * The AST has no notation field, so the active mode is invisible to parse(),
 * buildNFA(), and nfaToDFA(). This test makes that architectural fact
 * machine-checkable: for each regex, it parses the course-formatted string and
 * the textbook-formatted string and asserts both round-trips produce ASTs that
 * are deep-equal to the original, proving the NFA and DFA derived from them
 * would also be identical.
 *
 * Approach (a) from the plan: parse(formatRegex(ast, mode)) deep-equals ast.
 * This is deterministic and requires no React harness.
 */
import { describe, it, expect } from 'vitest'
import { parse } from '@/core/regex/parser'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { formatRegex } from '@/notation/format'

// Regexes chosen to exercise union (+), empty string (λ/ε), concatenation,
// and Kleene star -- the full glyph-flip surface.
const TEST_REGEXES = [
  '(a + b)*abb',   // union + concat + star (the canonical course example)
  'a + b',          // bare union
  'a+',             // positive closure (the + here is a quantifier, not union)
  'ab + c',         // concat then union
  'a + λ',          // union with the empty string
]

describe('toggle-invariance proof (NOTATION-03)', () => {
  describe('AST round-trip: course formatting', () => {
    for (const input of TEST_REGEXES) {
      it(`parse(format(parse("${input}"), 'course')) deep-equals original AST`, () => {
        const original = parse(input)
        const courseStr = formatRegex(original, 'course')
        const roundTrip = parse(courseStr)
        expect(roundTrip).toEqual(original)
      })
    }
  })

  describe('AST round-trip: textbook formatting', () => {
    for (const input of TEST_REGEXES) {
      it(`parse(format(parse("${input}"), 'textbook')) deep-equals original AST`, () => {
        const original = parse(input)
        const textbookStr = formatRegex(original, 'textbook')
        const roundTrip = parse(textbookStr)
        expect(roundTrip).toEqual(original)
      })
    }
  })

  describe('NFA structural equality: course vs textbook AST', () => {
    for (const input of TEST_REGEXES) {
      it(`NFA from course-formatted "${input}" deep-equals NFA from textbook-formatted`, () => {
        const original = parse(input)
        const courseNFA = buildNFA(parse(formatRegex(original, 'course')))
        const textbookNFA = buildNFA(parse(formatRegex(original, 'textbook')))
        // NFAs have the same structure because they are built from identical ASTs.
        // State IDs are generated deterministically from a fresh counter on each
        // call, so they are equal only when the parse trees are equal in shape.
        expect(courseNFA).toEqual(textbookNFA)
      })
    }
  })

  describe('DFA structural equality: course vs textbook AST', () => {
    for (const input of TEST_REGEXES) {
      it(`DFA from course-formatted "${input}" deep-equals DFA from textbook-formatted`, () => {
        const original = parse(input)
        const courseNFA = buildNFA(parse(formatRegex(original, 'course')))
        const textbookNFA = buildNFA(parse(formatRegex(original, 'textbook')))
        const courseDFA = nfaToDFA(courseNFA)
        const textbookDFA = nfaToDFA(textbookNFA)
        expect(courseDFA).toEqual(textbookDFA)
      })
    }
  })
})
