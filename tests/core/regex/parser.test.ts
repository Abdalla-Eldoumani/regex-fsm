import { describe, it, expect } from 'vitest'
import { parse } from '@/core/regex/parser'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { RegexNode } from '@/core/regex/ast'
import { TooLargeError, BOUNDS } from '@/core/automata/types'

describe('parser', () => {
  describe('single symbols', () => {
    it('parses single letter', () => {
      const ast = parse('a')
      expect(ast).toEqual({ type: 'symbol', value: 'a' })
    })

    it('parses single digit', () => {
      const ast = parse('0')
      expect(ast).toEqual({ type: 'symbol', value: '0' })
    })

    it('parses uppercase letter', () => {
      const ast = parse('Z')
      expect(ast).toEqual({ type: 'symbol', value: 'Z' })
    })
  })

  describe('epsilon', () => {
    it('parses epsilon (ε)', () => {
      const ast = parse('ε')
      expect(ast).toEqual({ type: 'empty' })
    })

    it('parses lambda (λ)', () => {
      const ast = parse('λ')
      expect(ast).toEqual({ type: 'empty' })
    })
  })

  describe('concatenation', () => {
    it('parses two symbols', () => {
      const ast = parse('ab')
      expect(ast).toEqual({
        type: 'concat',
        left: { type: 'symbol', value: 'a' },
        right: { type: 'symbol', value: 'b' },
      })
    })

    it('parses three symbols', () => {
      const ast = parse('abc')
      expect(ast).toEqual({
        type: 'concat',
        left: {
          type: 'concat',
          left: { type: 'symbol', value: 'a' },
          right: { type: 'symbol', value: 'b' },
        },
        right: { type: 'symbol', value: 'c' },
      })
    })

    it('parses many symbols', () => {
      const ast = parse('abcde')
      expect(ast.type).toBe('concat')
    })
  })

  describe('union', () => {
    it('parses union with pipe', () => {
      const ast = parse('a|b')
      expect(ast).toEqual({
        type: 'union',
        left: { type: 'symbol', value: 'a' },
        right: { type: 'symbol', value: 'b' },
      })
    })

    it('throws on union at start', () => {
      expect(() => parse('+b')).toThrow()
    })

    it('parses multiple unions', () => {
      const ast = parse('a|b|c')
      expect(ast).toEqual({
        type: 'union',
        left: {
          type: 'union',
          left: { type: 'symbol', value: 'a' },
          right: { type: 'symbol', value: 'b' },
        },
        right: { type: 'symbol', value: 'c' },
      })
    })
  })

  describe('course union with +', () => {
    // Course PDF Definition 3.9: union is written `+` between operands.
    // A `+` with an operand after it is union; a `+` with nothing parseable
    // after it is positive closure. These ASTs are derived by hand from the
    // grammar (union loosest < concat < closure), not pasted from parser output.
    it('parses a+b as union of a and b', () => {
      const ast = parse('a+b')
      expect(ast).toEqual({
        type: 'union',
        left: { type: 'symbol', value: 'a' },
        right: { type: 'symbol', value: 'b' },
      })
    })

    it('parses a + b (with spaces) as union of a and b', () => {
      const ast = parse('a + b')
      expect(ast).toEqual({
        type: 'union',
        left: { type: 'symbol', value: 'a' },
        right: { type: 'symbol', value: 'b' },
      })
    })

    it('parses (a+b) as union of a and b', () => {
      const ast = parse('(a+b)')
      expect(ast).toEqual({
        type: 'union',
        left: { type: 'symbol', value: 'a' },
        right: { type: 'symbol', value: 'b' },
      })
    })

    it('parses + and | as the identical union AST', () => {
      expect(parse('a+b')).toEqual(parse('a|b'))
    })

    it('parses multiple +-unions left-associatively', () => {
      const ast = parse('a+b+c')
      expect(ast).toEqual({
        type: 'union',
        left: {
          type: 'union',
          left: { type: 'symbol', value: 'a' },
          right: { type: 'symbol', value: 'b' },
        },
        right: { type: 'symbol', value: 'c' },
      })
    })

    it('parses a*b+c?d|e with union loosest', () => {
      // Hand derivation against the grammar:
      //   top-level | splits into [a*b+c?d] and [e]
      //   within a*b+c?d the + has operand c after it, so it is union:
      //     a* b  +  c? d  =  union( concat(star a, b), concat(optional c, d) )
      //   full = union( union(concat(star a, b), concat(optional c, d)), e )
      const ast = parse('a*b+c?d|e')
      expect(ast).toEqual({
        type: 'union',
        left: {
          type: 'union',
          left: {
            type: 'concat',
            left: { type: 'star', child: { type: 'symbol', value: 'a' } },
            right: { type: 'symbol', value: 'b' },
          },
          right: {
            type: 'concat',
            left: { type: 'optional', child: { type: 'symbol', value: 'c' } },
            right: { type: 'symbol', value: 'd' },
          },
        },
        right: { type: 'symbol', value: 'e' },
      })
    })

    it('builds the same NFA for (a+b)*abb and (a|b)*abb', () => {
      // The course's canonical example. After the fix both spellings produce the
      // identical union AST, so Thompson construction yields structurally identical
      // NFAs (state ids are generated deterministically from the AST).
      const plusNFA = buildNFA(parse('(a+b)*abb'))
      const pipeNFA = buildNFA(parse('(a|b)*abb'))
      expect(plusNFA).toEqual(pipeNFA)
    })

    it('builds the same DFA for (a+b)*abb and (a|b)*abb', () => {
      const plusDFA = nfaToDFA(buildNFA(parse('(a+b)*abb')))
      const pipeDFA = nfaToDFA(buildNFA(parse('(a|b)*abb')))
      expect(plusDFA).toEqual(pipeDFA)
    })
  })

  describe('kleene star', () => {
    it('parses star after symbol', () => {
      const ast = parse('a*')
      expect(ast).toEqual({
        type: 'star',
        child: { type: 'symbol', value: 'a' },
      })
    })

    it('rejects multiple stars', () => {
      expect(() => parse('a**')).toThrow(/quantifier cannot follow quantifier/i)
    })

    it('parses star after concatenation', () => {
      const ast = parse('ab*')
      expect(ast).toEqual({
        type: 'concat',
        left: { type: 'symbol', value: 'a' },
        right: {
          type: 'star',
          child: { type: 'symbol', value: 'b' },
        },
      })
    })
  })

  describe('positive closure', () => {
    it('parses plus after symbol', () => {
      const ast = parse('a+')
      expect(ast).toEqual({
        type: 'plus',
        child: { type: 'symbol', value: 'a' },
      })
    })

    it('rejects multiple plus operators', () => {
      expect(() => parse('a++')).toThrow(/quantifier cannot follow quantifier/i)
    })

    it('parses plus after concatenation', () => {
      const ast = parse('ab+')
      expect(ast).toEqual({
        type: 'concat',
        left: { type: 'symbol', value: 'a' },
        right: {
          type: 'plus',
          child: { type: 'symbol', value: 'b' },
        },
      })
    })
  })

  describe('optional', () => {
    it('parses question mark after symbol', () => {
      const ast = parse('a?')
      expect(ast).toEqual({
        type: 'optional',
        child: { type: 'symbol', value: 'a' },
      })
    })

    it('rejects multiple question marks', () => {
      expect(() => parse('a??')).toThrow(/quantifier cannot follow quantifier/i)
    })

    it('parses optional after concatenation', () => {
      const ast = parse('ab?')
      expect(ast).toEqual({
        type: 'concat',
        left: { type: 'symbol', value: 'a' },
        right: {
          type: 'optional',
          child: { type: 'symbol', value: 'b' },
        },
      })
    })
  })

  describe('grouping', () => {
    it('parses grouped symbol', () => {
      const ast = parse('(a)')
      expect(ast).toEqual({ type: 'symbol', value: 'a' })
    })

    it('parses grouped union', () => {
      const ast = parse('(a|b)')
      expect(ast).toEqual({
        type: 'union',
        left: { type: 'symbol', value: 'a' },
        right: { type: 'symbol', value: 'b' },
      })
    })

    it('parses star after grouped union', () => {
      const ast = parse('(a|b)*')
      expect(ast).toEqual({
        type: 'star',
        child: {
          type: 'union',
          left: { type: 'symbol', value: 'a' },
          right: { type: 'symbol', value: 'b' },
        },
      })
    })

    it('parses nested parentheses', () => {
      const ast = parse('((a))')
      expect(ast).toEqual({ type: 'symbol', value: 'a' })
    })

    it('parses multiple grouped expressions', () => {
      const ast = parse('(a)(b)')
      expect(ast).toEqual({
        type: 'concat',
        left: { type: 'symbol', value: 'a' },
        right: { type: 'symbol', value: 'b' },
      })
    })
  })

  describe('operator precedence', () => {
    it('star binds tighter than concatenation', () => {
      const ast = parse('ab*')
      expect(ast).toEqual({
        type: 'concat',
        left: { type: 'symbol', value: 'a' },
        right: {
          type: 'star',
          child: { type: 'symbol', value: 'b' },
        },
      })
    })

    it('concatenation binds tighter than union', () => {
      const ast = parse('ab|cd')
      expect(ast).toEqual({
        type: 'union',
        left: {
          type: 'concat',
          left: { type: 'symbol', value: 'a' },
          right: { type: 'symbol', value: 'b' },
        },
        right: {
          type: 'concat',
          left: { type: 'symbol', value: 'c' },
          right: { type: 'symbol', value: 'd' },
        },
      })
    })

    it('parentheses override precedence', () => {
      const ast = parse('(a|b)c')
      expect(ast).toEqual({
        type: 'concat',
        left: {
          type: 'union',
          left: { type: 'symbol', value: 'a' },
          right: { type: 'symbol', value: 'b' },
        },
        right: { type: 'symbol', value: 'c' },
      })
    })

    it('handles all operators with correct precedence', () => {
      const ast = parse('a|b*c')
      expect(ast).toEqual({
        type: 'union',
        left: { type: 'symbol', value: 'a' },
        right: {
          type: 'concat',
          left: {
            type: 'star',
            child: { type: 'symbol', value: 'b' },
          },
          right: { type: 'symbol', value: 'c' },
        },
      })
    })
  })

  describe('complex expressions', () => {
    it('parses (a|b)*abb', () => {
      const ast = parse('(a|b)*abb')
      expect(ast.type).toBe('concat')
      let curr = ast as Extract<RegexNode, { type: 'concat' }>
      expect(curr.left.type).toBe('concat')
      curr = curr.left as Extract<RegexNode, { type: 'concat' }>
      expect(curr.left.type).toBe('concat')
      curr = curr.left as Extract<RegexNode, { type: 'concat' }>
      expect(curr.left.type).toBe('star')
      const star = curr.left as Extract<RegexNode, { type: 'star' }>
      expect(star.child.type).toBe('union')
    })

    it('parses (a+b)*c', () => {
      // Course reading: (a+b) is union, so this is concat(star(union(a,b)), c).
      const ast = parse('(a+b)*c')
      expect(ast).toEqual({
        type: 'concat',
        left: {
          type: 'star',
          child: {
            type: 'union',
            left: { type: 'symbol', value: 'a' },
            right: { type: 'symbol', value: 'b' },
          },
        },
        right: { type: 'symbol', value: 'c' },
      })
    })

    it('parses a*b+c? with the + as union', () => {
      // Course reading: the + has operand c after it, so it is union (loosest):
      //   a* b  +  c?  =  union( concat(star a, b), optional c )
      const ast = parse('a*b+c?')
      expect(ast).toEqual({
        type: 'union',
        left: {
          type: 'concat',
          left: { type: 'star', child: { type: 'symbol', value: 'a' } },
          right: { type: 'symbol', value: 'b' },
        },
        right: { type: 'optional', child: { type: 'symbol', value: 'c' } },
      })
    })

    it('parses nested groups (a(b|c)*d)', () => {
      const ast = parse('a(b|c)*d')
      expect(ast.type).toBe('concat')
    })

    it('parses complex union (a|b)(c|d)', () => {
      const ast = parse('(a|b)(c|d)')
      expect(ast).toEqual({
        type: 'concat',
        left: {
          type: 'union',
          left: { type: 'symbol', value: 'a' },
          right: { type: 'symbol', value: 'b' },
        },
        right: {
          type: 'union',
          left: { type: 'symbol', value: 'c' },
          right: { type: 'symbol', value: 'd' },
        },
      })
    })

    it('parses deeply nested expression', () => {
      const ast = parse('((a|b)*c)+')
      expect(ast.type).toBe('plus')
      const plus = ast as Extract<RegexNode, { type: 'plus' }>
      expect(plus.child.type).toBe('concat')
    })

    it('parses all operators together', () => {
      const ast = parse('a*b+c?|d')
      expect(ast.type).toBe('union')
    })
  })

  describe('escaped characters', () => {
    it('parses escaped star', () => {
      const ast = parse('\\*')
      expect(ast).toEqual({ type: 'symbol', value: '*' })
    })

    it('parses escaped plus', () => {
      const ast = parse('\\+')
      expect(ast).toEqual({ type: 'symbol', value: '+' })
    })

    it('parses escaped pipe', () => {
      const ast = parse('\\|')
      expect(ast).toEqual({ type: 'symbol', value: '|' })
    })

    it('parses escaped parentheses', () => {
      const ast = parse('\\(\\)')
      expect(ast).toEqual({
        type: 'concat',
        left: { type: 'symbol', value: '(' },
        right: { type: 'symbol', value: ')' },
      })
    })

    it('parses escaped characters in complex expression', () => {
      const ast = parse('a\\*b')
      expect(ast).toEqual({
        type: 'concat',
        left: {
          type: 'concat',
          left: { type: 'symbol', value: 'a' },
          right: { type: 'symbol', value: '*' },
        },
        right: { type: 'symbol', value: 'b' },
      })
    })
  })

  describe('invalid consecutive quantifiers', () => {
    it('rejects star after star', () => {
      expect(() => parse('a**')).toThrow(/quantifier cannot follow quantifier/i)
    })

    it('rejects plus after star', () => {
      expect(() => parse('a*+')).toThrow(/quantifier cannot follow quantifier/i)
    })

    it('rejects optional after star', () => {
      expect(() => parse('a*?')).toThrow(/quantifier cannot follow quantifier/i)
    })

    it('rejects star after plus', () => {
      expect(() => parse('a+*')).toThrow(/quantifier cannot follow quantifier/i)
    })

    it('rejects plus after plus', () => {
      expect(() => parse('a++')).toThrow(/quantifier cannot follow quantifier/i)
    })

    it('rejects optional after plus', () => {
      expect(() => parse('a+?')).toThrow(/quantifier cannot follow quantifier/i)
    })

    it('rejects star after optional', () => {
      expect(() => parse('a?*')).toThrow(/quantifier cannot follow quantifier/i)
    })

    it('rejects plus after optional', () => {
      expect(() => parse('a?+')).toThrow(/quantifier cannot follow quantifier/i)
    })

    it('rejects optional after optional', () => {
      expect(() => parse('a??')).toThrow(/quantifier cannot follow quantifier/i)
    })

    it('rejects multiple consecutive quantifiers', () => {
      expect(() => parse('a?***')).toThrow(/quantifier cannot follow quantifier/i)
    })

    it('rejects many consecutive quantifiers', () => {
      expect(() => parse('a*+?*')).toThrow(/quantifier cannot follow quantifier/i)
    })

    it('rejects quantifiers in complex expression', () => {
      expect(() => parse('ab**c')).toThrow(/quantifier cannot follow quantifier/i)
    })

    it('rejects quantifiers after grouped expression', () => {
      expect(() => parse('(ab)**')).toThrow(/quantifier cannot follow quantifier/i)
    })
  })

  describe('error cases', () => {
    it('throws on empty input', () => {
      expect(() => parse('')).toThrow(/empty regex/i)
    })

    it('throws on only whitespace', () => {
      expect(() => parse('   ')).toThrow(/empty regex/i)
    })

    it('throws on unclosed left parenthesis', () => {
      expect(() => parse('(a')).toThrow(/expected RPAREN/i)
    })

    it('throws on unclosed nested parenthesis', () => {
      expect(() => parse('((a)')).toThrow(/expected RPAREN/i)
    })

    it('throws on unopened right parenthesis', () => {
      expect(() => parse('a)')).toThrow(/expected EOF/i)
    })

    it('throws on only left parenthesis', () => {
      expect(() => parse('(')).toThrow()
    })

    it('throws on only right parenthesis', () => {
      expect(() => parse(')')).toThrow()
    })

    it('throws on mismatched parentheses', () => {
      expect(() => parse('(a))')).toThrow()
    })

    it('throws on star at beginning', () => {
      expect(() => parse('*a')).toThrow()
    })

    it('throws on only star', () => {
      expect(() => parse('*')).toThrow()
    })

    it('throws on only union', () => {
      expect(() => parse('|')).toThrow()
    })

    it('includes position in error message', () => {
      try {
        parse('(a')
      } catch (e) {
        expect((e as Error).message).toMatch(/position/)
      }
    })
  })

  describe('edge cases', () => {
    it('handles single parentheses pair', () => {
      const ast = parse('(a)')
      expect(ast).toEqual({ type: 'symbol', value: 'a' })
    })

    it('handles many nested parentheses', () => {
      const ast = parse('((((a))))')
      expect(ast).toEqual({ type: 'symbol', value: 'a' })
    })

    it('handles long concatenation', () => {
      const input = 'a'.repeat(100)
      const ast = parse(input)
      expect(ast.type).toBe('concat')
    })

    it('handles long union', () => {
      const ast = parse('a|b|c|d|e|f|g|h')
      expect(ast.type).toBe('union')
    })

    it('handles alternating operators', () => {
      // c+ is genuine positive closure here (nothing follows it), so the whole
      // expression is a concatenation of quantified atoms.
      const ast = parse('a*b?c+')
      expect(ast.type).toBe('concat')
    })

    it('handles epsilon with operators', () => {
      const ast = parse('ε*')
      expect(ast).toEqual({
        type: 'star',
        child: { type: 'empty' },
      })
    })

    it('handles epsilon in union', () => {
      const ast = parse('a|ε')
      expect(ast).toEqual({
        type: 'union',
        left: { type: 'symbol', value: 'a' },
        right: { type: 'empty' },
      })
    })

    it('handles mixed epsilon symbols', () => {
      const ast = parse('ε|λ')
      expect(ast).toEqual({
        type: 'union',
        left: { type: 'empty' },
        right: { type: 'empty' },
      })
    })

    it('handles operators after groups', () => {
      const ast = parse('(ab)*')
      expect(ast.type).toBe('star')
    })

    it('handles empty groups in union', () => {
      const ast = parse('(a|ε)')
      expect(ast).toEqual({
        type: 'union',
        left: { type: 'symbol', value: 'a' },
        right: { type: 'empty' },
      })
    })
  })

  describe('real-world patterns', () => {
    it('parses identifier pattern', () => {
      const ast = parse('(a|b|c)(a|b|c|0|1|2)*')
      expect(ast.type).toBe('concat')
    })

    it('parses binary number pattern', () => {
      const ast = parse('(0|1)(0|1)*')
      expect(ast.type).toBe('concat')
    })

    it('parses optional prefix pattern', () => {
      const ast = parse('(a|ε)b')
      expect(ast.type).toBe('concat')
    })

    it('parses alternating pattern', () => {
      const ast = parse('(ab)*')
      expect(ast.type).toBe('star')
    })

    it('parses complex language pattern', () => {
      const ast = parse('(a|b)*abb')
      expect(ast.type).toBe('concat')
    })
  })

  // SAFETY-01: parser recursion depth bound.
  // Deeply nested input must throw TooLargeError('parser-depth', ...) instead
  // of a RangeError / stack overflow. The bound (BOUNDS.MAX_PARSE_DEPTH = 300)
  // is generous: all existing tests use shallow nesting (deepest is ((((a))))
  // which is 4 levels) so they are unaffected. 100 nested parens (well under
  // the bound) must still parse successfully.
  describe('SAFETY-01: recursion depth bound', () => {
    it('throws TooLargeError with reason parser-depth on pathologically nested input', () => {
      // 500 open parens + 'a' + 500 close parens: nesting depth = 500.
      // This exceeds BOUNDS.MAX_PARSE_DEPTH = 300, so it must throw cleanly.
      const pathological = '('.repeat(500) + 'a' + ')'.repeat(500)

      expect(() => parse(pathological)).toThrow(TooLargeError)
      expect(() => parse(pathological)).toThrow(/too large/i)
      try {
        parse(pathological)
      } catch (err) {
        expect(err).toBeInstanceOf(TooLargeError)
        expect((err as TooLargeError).reason).toBe('parser-depth')
        expect((err as TooLargeError).limit).toBe(BOUNDS.MAX_PARSE_DEPTH)
        // Must NOT be a RangeError / stack overflow
        expect(err).not.toBeInstanceOf(RangeError)
      }
    })

    it('does NOT throw for moderately nested input well below the bound', () => {
      // 100 nested parens: depth = 100, well under BOUNDS.MAX_PARSE_DEPTH = 300.
      const moderatelyNested = '('.repeat(100) + 'a' + ')'.repeat(100)
      expect(() => parse(moderatelyNested)).not.toThrow()
      const result = parse(moderatelyNested)
      expect(result).toEqual({ type: 'symbol', value: 'a' })
    })

    it('consecutive-quantifier errors keep their original message (not a depth error)', () => {
      // The depth guard must not shadow existing validation errors.
      expect(() => parse('a**')).toThrow(/quantifier cannot follow quantifier/i)
      expect(() => parse('a*+')).toThrow(/quantifier cannot follow quantifier/i)
    })
  })
})
