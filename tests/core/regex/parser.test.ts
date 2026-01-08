import { describe, it, expect } from 'vitest'
import { parse } from '@/core/regex/parser'
import { RegexNode } from '@/core/regex/ast'

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

  describe('kleene star', () => {
    it('parses star after symbol', () => {
      const ast = parse('a*')
      expect(ast).toEqual({
        type: 'star',
        child: { type: 'symbol', value: 'a' },
      })
    })

    it('parses multiple stars', () => {
      const ast = parse('a**')
      expect(ast).toEqual({
        type: 'star',
        child: {
          type: 'star',
          child: { type: 'symbol', value: 'a' },
        },
      })
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

    it('parses multiple plus operators', () => {
      const ast = parse('a++')
      expect(ast).toEqual({
        type: 'plus',
        child: {
          type: 'plus',
          child: { type: 'symbol', value: 'a' },
        },
      })
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

    it('parses multiple question marks', () => {
      const ast = parse('a??')
      expect(ast).toEqual({
        type: 'optional',
        child: {
          type: 'optional',
          child: { type: 'symbol', value: 'a' },
        },
      })
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
      const ast = parse('(a+b)*c')
      expect(ast.type).toBe('concat')
      const concat = ast as Extract<RegexNode, { type: 'concat' }>
      expect(concat.left.type).toBe('star')
      const star = concat.left as Extract<RegexNode, { type: 'star' }>
      expect(star.child.type).toBe('concat')
      const innerConcat = star.child as Extract<RegexNode, { type: 'concat' }>
      expect(innerConcat.left.type).toBe('plus')
      expect(innerConcat.right.type).toBe('symbol')
      const plus = innerConcat.left as Extract<RegexNode, { type: 'plus' }>
      expect(plus.child.type).toBe('symbol')
    })

    it('parses a*b+c?', () => {
      const ast = parse('a*b+c?')
      expect(ast.type).toBe('concat')
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
      const ast = parse('a*b+c?')
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
})
