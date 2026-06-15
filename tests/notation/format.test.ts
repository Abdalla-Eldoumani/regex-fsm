import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { formatRegex } from '@/notation/format'
import { GLYPHS, NotationMode } from '@/notation/glyphs'
import { parse } from '@/core/regex/parser'
import { RegexNode } from '@/core/regex/ast'

// Deterministic arbitrary for RegexNode up to depth 4 over alphabet {a, b}.
// The arbitrary produces every node type the parser can produce so the round-trip
// covers the full output space.
//
// The parser rejects quantifier-on-quantifier (a**, a*+, etc.), so closure nodes
// only accept non-closure children. arbNonClosure returns nodes whose top type is
// never star/plus/optional.
const ALPHABET = ['a', 'b']

function arbLeaf(): fc.Arbitrary<RegexNode> {
  return fc.oneof(
    fc.constant<RegexNode>({ type: 'empty' }),
    fc.constantFrom<RegexNode>(...ALPHABET.map(v => ({ type: 'symbol', value: v }))),
  )
}

// Any node whose top-level type is NOT a closure (safe as closure child).
function arbNonClosure(depth: number): fc.Arbitrary<RegexNode> {
  if (depth <= 0) return arbLeaf()

  const smaller = arbRegexNode(depth - 1)
  const nonClosureSmaller = arbNonClosure(depth - 1)

  return fc.oneof(
    { weight: 3, arbitrary: arbLeaf() },
    fc.record<RegexNode>({ type: fc.constant('concat'), left: smaller, right: nonClosureSmaller }),
    fc.record<RegexNode>({ type: fc.constant('union'), left: smaller, right: smaller }),
  ) as fc.Arbitrary<RegexNode>
}

function arbRegexNode(depth = 4): fc.Arbitrary<RegexNode> {
  if (depth <= 0) return arbLeaf()

  const smaller = arbRegexNode(depth - 1)
  const nonClosure = arbNonClosure(depth - 1)

  return fc.oneof(
    { weight: 2, arbitrary: arbLeaf() },
    fc.record<RegexNode>({ type: fc.constant('concat'), left: smaller, right: nonClosure }),
    fc.record<RegexNode>({ type: fc.constant('union'), left: smaller, right: smaller }),
    fc.record<RegexNode>({ type: fc.constant('star'), child: nonClosure }),
    fc.record<RegexNode>({ type: fc.constant('plus'), child: nonClosure }),
    fc.record<RegexNode>({ type: fc.constant('optional'), child: nonClosure }),
  ) as fc.Arbitrary<RegexNode>
}

const MODES: NotationMode[] = ['course', 'textbook']

describe('formatRegex', () => {
  describe('glyph map sanity', () => {
    it('course union glyph is +', () => {
      expect(GLYPHS.course.union).toBe('+')
    })
    it('course empty glyph is λ', () => {
      expect(GLYPHS.course.empty).toBe('λ')
    })
    it('textbook union glyph is |', () => {
      expect(GLYPHS.textbook.union).toBe('|')
    })
    it('textbook empty glyph is ε', () => {
      expect(GLYPHS.textbook.empty).toBe('ε')
    })
    it('only union and empty-string differ between modes', () => {
      expect(GLYPHS.course.union).not.toBe(GLYPHS.textbook.union)
      expect(GLYPHS.course.empty).not.toBe(GLYPHS.textbook.empty)
    })
  })

  describe('unit cases', () => {
    it('formats a symbol in both modes', () => {
      const ast: RegexNode = { type: 'symbol', value: 'a' }
      expect(formatRegex(ast, 'course')).toBe('a')
      expect(formatRegex(ast, 'textbook')).toBe('a')
    })

    it('formats empty node as λ in course mode', () => {
      const ast: RegexNode = { type: 'empty' }
      expect(formatRegex(ast, 'course')).toBe('λ')
    })

    it('formats empty node as ε in textbook mode', () => {
      const ast: RegexNode = { type: 'empty' }
      expect(formatRegex(ast, 'textbook')).toBe('ε')
    })

    it('formats union with spaces in course mode', () => {
      const ast: RegexNode = {
        type: 'union',
        left: { type: 'symbol', value: 'a' },
        right: { type: 'symbol', value: 'b' },
      }
      // course mode uses ' + ' (spaced) so the + is unambiguous to the re-parser
      expect(formatRegex(ast, 'course')).toBe('a + b')
    })

    it('formats union without spaces in textbook mode', () => {
      const ast: RegexNode = {
        type: 'union',
        left: { type: 'symbol', value: 'a' },
        right: { type: 'symbol', value: 'b' },
      }
      expect(formatRegex(ast, 'textbook')).toBe('a|b')
    })

    it('formats star closure with * in both modes', () => {
      const ast: RegexNode = {
        type: 'star',
        child: { type: 'symbol', value: 'a' },
      }
      expect(formatRegex(ast, 'course')).toBe('a*')
      expect(formatRegex(ast, 'textbook')).toBe('a*')
    })

    it('formats positive closure with + from node type, not union glyph', () => {
      // In course mode '+' is also the union glyph, but a 'plus' node is always closure.
      const ast: RegexNode = {
        type: 'plus',
        child: { type: 'symbol', value: 'a' },
      }
      expect(formatRegex(ast, 'course')).toBe('a+')
      expect(formatRegex(ast, 'textbook')).toBe('a+')
    })

    it('formats optional with ?', () => {
      const ast: RegexNode = {
        type: 'optional',
        child: { type: 'symbol', value: 'a' },
      }
      expect(formatRegex(ast, 'course')).toBe('a?')
      expect(formatRegex(ast, 'textbook')).toBe('a?')
    })

    it('parenthesizes union inside star', () => {
      const ast: RegexNode = {
        type: 'star',
        child: {
          type: 'union',
          left: { type: 'symbol', value: 'a' },
          right: { type: 'symbol', value: 'b' },
        },
      }
      // The union child needs parens inside the star so it re-parses correctly.
      expect(formatRegex(ast, 'course')).toBe('(a + b)*')
      expect(formatRegex(ast, 'textbook')).toBe('(a|b)*')
    })

    it('parenthesizes concat inside star', () => {
      const ast: RegexNode = {
        type: 'star',
        child: {
          type: 'concat',
          left: { type: 'symbol', value: 'a' },
          right: { type: 'symbol', value: 'b' },
        },
      }
      expect(formatRegex(ast, 'course')).toBe('(ab)*')
      expect(formatRegex(ast, 'textbook')).toBe('(ab)*')
    })

    it('formats the canonical (a+b)*abb in course mode', () => {
      const ast = parse('(a + b)*abb')
      expect(formatRegex(ast, 'course')).toBe('(a + b)*abb')
    })

    it('formats the canonical (a+b)*abb in textbook mode', () => {
      const ast = parse('(a + b)*abb')
      expect(formatRegex(ast, 'textbook')).toBe('(a|b)*abb')
    })

    it('does not mutate the AST node', () => {
      const ast: RegexNode = {
        type: 'union',
        left: { type: 'symbol', value: 'a' },
        right: { type: 'symbol', value: 'b' },
      }
      const before = JSON.stringify(ast)
      formatRegex(ast, 'course')
      expect(JSON.stringify(ast)).toBe(before)
    })
  })

  describe('round-trip property (the correctness gate)', () => {
    // Seeded for determinism; the seed fixes the random sequence so failures reproduce.
    const RUN_OPTIONS = { seed: 42, numRuns: 200 }

    for (const mode of MODES) {
      it(`parse(formatRegex(ast, '${mode}')) deep-equals ast`, () => {
        fc.assert(
          fc.property(arbRegexNode(4), (ast) => {
            const formatted = formatRegex(ast, mode)
            const reparsed = parse(formatted)
            expect(reparsed).toEqual(ast)
          }),
          RUN_OPTIONS,
        )
      })
    }
  })
})
