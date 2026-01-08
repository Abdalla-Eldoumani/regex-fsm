import { describe, it, expect } from 'vitest'
import { tokenize } from '@/core/regex/tokenizer'
import { Token } from '@/core/regex/ast'

describe('tokenizer', () => {
  describe('single symbols', () => {
    it('tokenizes lowercase letter', () => {
      const tokens = tokenize('a')
      expect(tokens).toHaveLength(2)
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: 'a', pos: 0 })
      expect(tokens[1]).toEqual({ type: 'EOF', pos: 1 })
    })

    it('tokenizes uppercase letter', () => {
      const tokens = tokenize('A')
      expect(tokens).toHaveLength(2)
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: 'A', pos: 0 })
      expect(tokens[1].type).toBe('EOF')
    })

    it('tokenizes digit', () => {
      const tokens = tokenize('0')
      expect(tokens).toHaveLength(2)
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: '0', pos: 0 })
      expect(tokens[1].type).toBe('EOF')
    })

    it('tokenizes multiple symbols', () => {
      const tokens = tokenize('abc')
      expect(tokens).toHaveLength(4)
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: 'a', pos: 0 })
      expect(tokens[1]).toEqual({ type: 'SYMBOL', value: 'b', pos: 1 })
      expect(tokens[2]).toEqual({ type: 'SYMBOL', value: 'c', pos: 2 })
      expect(tokens[3].type).toBe('EOF')
    })
  })

  describe('operators', () => {
    it('tokenizes star operator', () => {
      const tokens = tokenize('*')
      expect(tokens).toHaveLength(2)
      expect(tokens[0]).toEqual({ type: 'STAR', pos: 0 })
    })

    it('tokenizes optional operator', () => {
      const tokens = tokenize('?')
      expect(tokens).toHaveLength(2)
      expect(tokens[0]).toEqual({ type: 'OPTIONAL', pos: 0 })
    })

    it('tokenizes pipe union operator', () => {
      const tokens = tokenize('|')
      expect(tokens).toHaveLength(2)
      expect(tokens[0]).toEqual({ type: 'UNION', pos: 0 })
    })

    it('tokenizes left parenthesis', () => {
      const tokens = tokenize('(')
      expect(tokens).toHaveLength(2)
      expect(tokens[0]).toEqual({ type: 'LPAREN', pos: 0 })
    })

    it('tokenizes right parenthesis', () => {
      const tokens = tokenize(')')
      expect(tokens).toHaveLength(2)
      expect(tokens[0]).toEqual({ type: 'RPAREN', pos: 0 })
    })

    it('tokenizes operators in sequence', () => {
      const tokens = tokenize('a*')
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: 'a', pos: 0 })
      expect(tokens[1]).toEqual({ type: 'STAR', pos: 1 })
    })
  })

  describe('plus operator context', () => {
    it('tokenizes plus as union at start', () => {
      const tokens = tokenize('+')
      expect(tokens[0]).toEqual({ type: 'UNION', pos: 0 })
    })

    it('tokenizes plus as positive closure after symbol', () => {
      const tokens = tokenize('a+')
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: 'a', pos: 0 })
      expect(tokens[1]).toEqual({ type: 'PLUS', pos: 1 })
    })

    it('tokenizes plus as positive closure after star', () => {
      const tokens = tokenize('a*+')
      expect(tokens[2]).toEqual({ type: 'PLUS', pos: 2 })
    })

    it('tokenizes plus as positive closure after plus', () => {
      const tokens = tokenize('a++')
      expect(tokens[1]).toEqual({ type: 'PLUS', pos: 1 })
      expect(tokens[2]).toEqual({ type: 'PLUS', pos: 2 })
    })

    it('tokenizes plus as positive closure after optional', () => {
      const tokens = tokenize('a?+')
      expect(tokens[2]).toEqual({ type: 'PLUS', pos: 2 })
    })

    it('tokenizes plus as positive closure after rparen', () => {
      const tokens = tokenize('(a)+')
      expect(tokens[3]).toEqual({ type: 'PLUS', pos: 3 })
    })

    it('tokenizes plus as positive closure after epsilon', () => {
      const tokens = tokenize('ε+')
      expect(tokens[1]).toEqual({ type: 'PLUS', pos: 1 })
    })

    it('tokenizes plus as union after lparen', () => {
      const tokens = tokenize('(+')
      expect(tokens[1]).toEqual({ type: 'UNION', pos: 1 })
    })

    it('tokenizes plus as union in middle context', () => {
      const tokens = tokenize('a+b')
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: 'a', pos: 0 })
      expect(tokens[1]).toEqual({ type: 'PLUS', pos: 1 })
      expect(tokens[2]).toEqual({ type: 'SYMBOL', value: 'b', pos: 2 })
    })
  })

  describe('epsilon symbols', () => {
    it('tokenizes epsilon (ε)', () => {
      const tokens = tokenize('ε')
      expect(tokens[0]).toEqual({ type: 'EPSILON', pos: 0 })
    })

    it('tokenizes lambda (λ)', () => {
      const tokens = tokenize('λ')
      expect(tokens[0]).toEqual({ type: 'EPSILON', pos: 0 })
    })

    it('handles multiple epsilon symbols', () => {
      const tokens = tokenize('εε')
      expect(tokens[0]).toEqual({ type: 'EPSILON', pos: 0 })
      expect(tokens[1]).toEqual({ type: 'EPSILON', pos: 1 })
    })
  })

  describe('escape sequences', () => {
    it('escapes star', () => {
      const tokens = tokenize('\\*')
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: '*', pos: 0 })
    })

    it('escapes plus', () => {
      const tokens = tokenize('\\+')
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: '+', pos: 0 })
    })

    it('escapes pipe', () => {
      const tokens = tokenize('\\|')
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: '|', pos: 0 })
    })

    it('escapes question mark', () => {
      const tokens = tokenize('\\?')
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: '?', pos: 0 })
    })

    it('escapes left parenthesis', () => {
      const tokens = tokenize('\\(')
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: '(', pos: 0 })
    })

    it('escapes right parenthesis', () => {
      const tokens = tokenize('\\)')
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: ')', pos: 0 })
    })

    it('escapes backslash', () => {
      const tokens = tokenize('\\\\')
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: '\\', pos: 0 })
    })

    it('escapes regular characters', () => {
      const tokens = tokenize('\\a')
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: 'a', pos: 0 })
    })

    it('handles multiple escape sequences', () => {
      const tokens = tokenize('\\*\\+\\|')
      expect(tokens).toHaveLength(4)
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: '*', pos: 0 })
      expect(tokens[1]).toEqual({ type: 'SYMBOL', value: '+', pos: 2 })
      expect(tokens[2]).toEqual({ type: 'SYMBOL', value: '|', pos: 4 })
    })
  })

  describe('whitespace handling', () => {
    it('skips spaces', () => {
      const tokens = tokenize('a b')
      expect(tokens).toHaveLength(3)
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: 'a', pos: 0 })
      expect(tokens[1]).toEqual({ type: 'SYMBOL', value: 'b', pos: 2 })
    })

    it('skips tabs', () => {
      const tokens = tokenize('a\tb')
      expect(tokens).toHaveLength(3)
      expect(tokens[0].type).toBe('SYMBOL')
      expect(tokens[1].type).toBe('SYMBOL')
    })

    it('skips newlines', () => {
      const tokens = tokenize('a\nb')
      expect(tokens).toHaveLength(3)
    })

    it('skips carriage returns', () => {
      const tokens = tokenize('a\rb')
      expect(tokens).toHaveLength(3)
    })

    it('skips multiple whitespace characters', () => {
      const tokens = tokenize('  a  \t\n  b  ')
      expect(tokens).toHaveLength(3)
      expect(tokens[0].type).toBe('SYMBOL')
      expect(tokens[1].type).toBe('SYMBOL')
    })
  })

  describe('complex expressions', () => {
    it('tokenizes simple alternation', () => {
      const tokens = tokenize('a|b')
      expect(tokens).toHaveLength(4)
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: 'a', pos: 0 })
      expect(tokens[1]).toEqual({ type: 'UNION', pos: 1 })
      expect(tokens[2]).toEqual({ type: 'SYMBOL', value: 'b', pos: 2 })
    })

    it('tokenizes concatenation with star', () => {
      const tokens = tokenize('ab*')
      expect(tokens).toHaveLength(4)
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: 'a', pos: 0 })
      expect(tokens[1]).toEqual({ type: 'SYMBOL', value: 'b', pos: 1 })
      expect(tokens[2]).toEqual({ type: 'STAR', pos: 2 })
    })

    it('tokenizes grouped expression', () => {
      const tokens = tokenize('(a|b)*')
      expect(tokens).toHaveLength(7)
      expect(tokens[0]).toEqual({ type: 'LPAREN', pos: 0 })
      expect(tokens[1]).toEqual({ type: 'SYMBOL', value: 'a', pos: 1 })
      expect(tokens[2]).toEqual({ type: 'UNION', pos: 2 })
      expect(tokens[3]).toEqual({ type: 'SYMBOL', value: 'b', pos: 3 })
      expect(tokens[4]).toEqual({ type: 'RPAREN', pos: 4 })
      expect(tokens[5]).toEqual({ type: 'STAR', pos: 5 })
      expect(tokens[6].type).toBe('EOF')
    })

    it('tokenizes complex nested expression', () => {
      const tokens = tokenize('(a+b)*abb')
      expect(tokens[0]).toEqual({ type: 'LPAREN', pos: 0 })
      expect(tokens[1]).toEqual({ type: 'SYMBOL', value: 'a', pos: 1 })
      expect(tokens[2]).toEqual({ type: 'PLUS', pos: 2 })
      expect(tokens[3]).toEqual({ type: 'SYMBOL', value: 'b', pos: 3 })
      expect(tokens[4]).toEqual({ type: 'RPAREN', pos: 4 })
      expect(tokens[5]).toEqual({ type: 'STAR', pos: 5 })
    })

    it('tokenizes all operators together', () => {
      const tokens = tokenize('a*b+c?d|e')
      expect(tokens[0]).toEqual({ type: 'SYMBOL', value: 'a', pos: 0 })
      expect(tokens[1]).toEqual({ type: 'STAR', pos: 1 })
      expect(tokens[2]).toEqual({ type: 'SYMBOL', value: 'b', pos: 2 })
      expect(tokens[3]).toEqual({ type: 'PLUS', pos: 3 })
      expect(tokens[4]).toEqual({ type: 'SYMBOL', value: 'c', pos: 4 })
      expect(tokens[5]).toEqual({ type: 'OPTIONAL', pos: 5 })
      expect(tokens[6]).toEqual({ type: 'SYMBOL', value: 'd', pos: 6 })
      expect(tokens[7]).toEqual({ type: 'UNION', pos: 7 })
      expect(tokens[8]).toEqual({ type: 'SYMBOL', value: 'e', pos: 8 })
    })
  })

  describe('position tracking', () => {
    it('tracks position for each token', () => {
      const tokens = tokenize('abc')
      expect(tokens[0].pos).toBe(0)
      expect(tokens[1].pos).toBe(1)
      expect(tokens[2].pos).toBe(2)
      expect(tokens[3].pos).toBe(3)
    })

    it('tracks position with operators', () => {
      const tokens = tokenize('a*b+')
      expect(tokens[0].pos).toBe(0)
      expect(tokens[1].pos).toBe(1)
      expect(tokens[2].pos).toBe(2)
      expect(tokens[3].pos).toBe(3)
    })

    it('tracks position after escape sequences', () => {
      const tokens = tokenize('a\\*b')
      expect(tokens[0].pos).toBe(0)
      expect(tokens[1].pos).toBe(1)
      expect(tokens[2].pos).toBe(3)
    })
  })

  describe('error cases', () => {
    it('throws on invalid character @', () => {
      expect(() => tokenize('@')).toThrow(/invalid character/i)
    })

    it('throws on invalid character #', () => {
      expect(() => tokenize('#')).toThrow(/invalid character/i)
    })

    it('throws on invalid character $', () => {
      expect(() => tokenize('$')).toThrow(/invalid character/i)
    })

    it('throws on invalid character %', () => {
      expect(() => tokenize('%')).toThrow(/invalid character/i)
    })

    it('includes position in error message', () => {
      expect(() => tokenize('ab@cd')).toThrow(/position 2/)
    })

    it('includes character in error message', () => {
      expect(() => tokenize('ab@cd')).toThrow(/@/)
    })
  })

  describe('edge cases', () => {
    it('handles empty string', () => {
      const tokens = tokenize('')
      expect(tokens).toHaveLength(1)
      expect(tokens[0]).toEqual({ type: 'EOF', pos: 0 })
    })

    it('handles only whitespace', () => {
      const tokens = tokenize('   ')
      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe('EOF')
    })

    it('handles single operator', () => {
      const tokens = tokenize('*')
      expect(tokens).toHaveLength(2)
      expect(tokens[0].type).toBe('STAR')
    })

    it('handles only parentheses', () => {
      const tokens = tokenize('()')
      expect(tokens).toHaveLength(3)
      expect(tokens[0].type).toBe('LPAREN')
      expect(tokens[1].type).toBe('RPAREN')
    })

    it('handles nested parentheses', () => {
      const tokens = tokenize('((a))')
      expect(tokens[0].type).toBe('LPAREN')
      expect(tokens[1].type).toBe('LPAREN')
      expect(tokens[2].type).toBe('SYMBOL')
      expect(tokens[3].type).toBe('RPAREN')
      expect(tokens[4].type).toBe('RPAREN')
    })

    it('handles very long input', () => {
      const input = 'a'.repeat(1000)
      const tokens = tokenize(input)
      expect(tokens).toHaveLength(1001)
      expect(tokens.every((t, i) => i === 1000 ? t.type === 'EOF' : t.type === 'SYMBOL')).toBe(true)
    })
  })
})
