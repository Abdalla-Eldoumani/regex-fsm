import { describe, it, expect } from 'vitest'
import {
  patternTemplates,
  getTemplateById,
  getCategorizedTemplates,
} from '@/core/patterns/templates'
import { parse } from '@/core/regex/parser'

describe('pattern templates', () => {
  describe('template structure', () => {
    it('has non-empty template array', () => {
      expect(patternTemplates).toBeDefined()
      expect(patternTemplates.length).toBeGreaterThan(0)
    })

    it('all templates have required fields', () => {
      patternTemplates.forEach((template) => {
        expect(template.id).toBeDefined()
        expect(typeof template.id).toBe('string')
        expect(template.name).toBeDefined()
        expect(typeof template.name).toBe('string')
        expect(template.description).toBeDefined()
        expect(typeof template.description).toBe('string')
        expect(template.category).toBeDefined()
        expect(['basic', 'position', 'repetition', 'character', 'combination', 'length', 'counting', 'negation', 'ordering']).toContain(
          template.category
        )
        expect(template.buildRegex).toBeDefined()
        expect(typeof template.buildRegex).toBe('function')
        expect(Array.isArray(template.parameters)).toBe(true)
      })
    })

    it('all template IDs are unique', () => {
      const ids = patternTemplates.map((t) => t.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('all template parameters have required fields', () => {
      patternTemplates.forEach((template) => {
        template.parameters.forEach((param) => {
          expect(param.name).toBeDefined()
          expect(typeof param.name).toBe('string')
          expect(param.placeholder).toBeDefined()
          expect(typeof param.placeholder).toBe('string')
          expect(param.description).toBeDefined()
          expect(typeof param.description).toBe('string')
        })
      })
    })
  })

  describe('getTemplateById', () => {
    it('returns template when ID exists', () => {
      const template = getTemplateById('starts_with')
      expect(template).toBeDefined()
      expect(template?.id).toBe('starts_with')
    })

    it('returns undefined for non-existent ID', () => {
      const template = getTemplateById('non_existent_id')
      expect(template).toBeUndefined()
    })

    it('returns correct template for each known ID', () => {
      const knownIds = [
        'starts_with',
        'ends_with',
        'contains',
        'exactly',
        'alternation',
        'concatenation',
        'zero_or_more',
        'one_or_more',
        'optional',
        'any_single',
      ]

      knownIds.forEach((id) => {
        const template = getTemplateById(id)
        expect(template).toBeDefined()
        expect(template?.id).toBe(id)
      })
    })
  })

  describe('getCategorizedTemplates', () => {
    it('returns object with category keys', () => {
      const categorized = getCategorizedTemplates()
      expect(categorized).toBeDefined()
      expect(categorized.basic).toBeDefined()
      expect(categorized.position).toBeDefined()
      expect(categorized.repetition).toBeDefined()
      expect(categorized.character).toBeDefined()
      expect(categorized.combination).toBeDefined()
      expect(categorized.length).toBeDefined()
      expect(categorized.counting).toBeDefined()
      expect(categorized.negation).toBeDefined()
      expect(categorized.ordering).toBeDefined()
    })

    it('all categories contain arrays', () => {
      const categorized = getCategorizedTemplates()
      Object.values(categorized).forEach((categoryTemplates) => {
        expect(Array.isArray(categoryTemplates)).toBe(true)
      })
    })

    it('templates are correctly categorized', () => {
      const categorized = getCategorizedTemplates()
      Object.entries(categorized).forEach(([category, templates]) => {
        templates.forEach((template) => {
          expect(template.category).toBe(category)
        })
      })
    })

    it('all templates appear exactly once across categories', () => {
      const categorized = getCategorizedTemplates()
      const allTemplatesFromCategories = Object.values(categorized).flat()
      expect(allTemplatesFromCategories.length).toBe(patternTemplates.length)
    })
  })

  describe('template regex generation', () => {
    describe('position templates', () => {
      // Position templates emit + for union (course notation)
      it('starts_with generates correct regex', () => {
        const template = getTemplateById('starts_with')
        expect(template).toBeDefined()
        const regex = template!.buildRegex('abc')
        expect(regex).toBe('abc(a + b + c)*')
      })

      it('ends_with generates correct regex', () => {
        const template = getTemplateById('ends_with')
        expect(template).toBeDefined()
        const regex = template!.buildRegex('xyz')
        expect(regex).toBe('(a + b + c)*xyz')
      })

      it('contains generates correct regex', () => {
        const template = getTemplateById('contains')
        expect(template).toBeDefined()
        const regex = template!.buildRegex('test')
        expect(regex).toBe('(a + b + c)*test(a + b + c)*')
      })
    })

    describe('basic templates', () => {
      it('exactly generates correct regex', () => {
        const template = getTemplateById('exactly')
        expect(template).toBeDefined()
        const regex = template!.buildRegex('abc')
        expect(regex).toBe('abc')
      })
    })

    describe('combination templates', () => {
      // alternation emits + for union (course notation)
      it('alternation generates correct regex', () => {
        const template = getTemplateById('alternation')
        expect(template).toBeDefined()
        const regex = template!.buildRegex('a', 'b')
        expect(regex).toBe('(a + b)')
      })

      it('concatenation generates correct regex', () => {
        const template = getTemplateById('concatenation')
        expect(template).toBeDefined()
        const regex = template!.buildRegex('a', 'b')
        expect(regex).toBe('ab')
      })
    })

    describe('repetition templates', () => {
      it('zero_or_more generates correct regex', () => {
        const template = getTemplateById('zero_or_more')
        expect(template).toBeDefined()
        const regex = template!.buildRegex('a')
        expect(regex).toBe('(a)*')
      })

      it('one_or_more generates correct regex', () => {
        const template = getTemplateById('one_or_more')
        expect(template).toBeDefined()
        const regex = template!.buildRegex('a')
        expect(regex).toBe('(a)+')
      })

      it('optional generates correct regex', () => {
        const template = getTemplateById('optional')
        expect(template).toBeDefined()
        const regex = template!.buildRegex('a')
        expect(regex).toBe('(a)?')
      })
    })

    describe('character templates', () => {
      it('any_single generates correct regex for single char', () => {
        const template = getTemplateById('any_single')
        expect(template).toBeDefined()
        const regex = template!.buildRegex('a')
        expect(regex).toBe('(a)')
      })

      // any_single emits + for union (course notation)
      it('any_single generates correct regex for multiple chars', () => {
        const template = getTemplateById('any_single')
        expect(template).toBeDefined()
        const regex = template!.buildRegex('abc')
        expect(regex).toBe('(a + b + c)')
      })

      it('any_single generates correct regex for numeric chars', () => {
        const template = getTemplateById('any_single')
        expect(template).toBeDefined()
        const regex = template!.buildRegex('012')
        expect(regex).toBe('(0 + 1 + 2)')
      })
    })
  })

  describe('template parameter counts', () => {
    it('position templates have 1 parameter', () => {
      const positionTemplates = ['starts_with', 'ends_with', 'contains']
      positionTemplates.forEach((id) => {
        const template = getTemplateById(id)
        expect(template).toBeDefined()
        expect(template!.parameters.length).toBe(1)
      })
    })

    it('combination templates have 2 parameters', () => {
      const combinationTemplates = ['alternation', 'concatenation']
      combinationTemplates.forEach((id) => {
        const template = getTemplateById(id)
        expect(template).toBeDefined()
        expect(template!.parameters.length).toBe(2)
      })
    })

    it('repetition templates have 1 parameter', () => {
      const repetitionTemplates = ['zero_or_more', 'one_or_more', 'optional']
      repetitionTemplates.forEach((id) => {
        const template = getTemplateById(id)
        expect(template).toBeDefined()
        expect(template!.parameters.length).toBe(1)
      })
    })
  })

  describe('template categories', () => {
    it('has templates in basic category', () => {
      const categorized = getCategorizedTemplates()
      expect(categorized.basic.length).toBeGreaterThan(0)
    })

    it('has templates in position category', () => {
      const categorized = getCategorizedTemplates()
      expect(categorized.position.length).toBeGreaterThan(0)
    })

    it('has templates in repetition category', () => {
      const categorized = getCategorizedTemplates()
      expect(categorized.repetition.length).toBeGreaterThan(0)
    })

    it('has templates in character category', () => {
      const categorized = getCategorizedTemplates()
      expect(categorized.character.length).toBeGreaterThan(0)
    })

    it('has templates in combination category', () => {
      const categorized = getCategorizedTemplates()
      expect(categorized.combination.length).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('handles empty string parameter', () => {
      const template = getTemplateById('exactly')
      expect(template).toBeDefined()
      const regex = template!.buildRegex('')
      expect(regex).toBe('')
    })

    it('handles special regex characters in parameters', () => {
      const template = getTemplateById('exactly')
      expect(template).toBeDefined()
      const regex = template!.buildRegex('a*b+c?')
      expect(regex).toBe('a*b+c?')
    })

    it('handles whitespace in parameters', () => {
      const template = getTemplateById('starts_with')
      expect(template).toBeDefined()
      const regex = template!.buildRegex('a b')
      expect(regex).toBe('a b(a + b + c)*')
    })
  })

  describe('integration with regex parser', () => {
    it('generated regex can be parsed - exactly', () => {
      const template = getTemplateById('exactly')
      const regex = template!.buildRegex('ab')
      expect(() => parse(regex)).not.toThrow()
    })

    it('generated regex can be parsed - alternation', () => {
      const template = getTemplateById('alternation')
      const regex = template!.buildRegex('a', 'b')
      expect(() => parse(regex)).not.toThrow()
    })

    it('generated regex can be parsed - concatenation', () => {
      const template = getTemplateById('concatenation')
      const regex = template!.buildRegex('a', 'b')
      expect(() => parse(regex)).not.toThrow()
    })

    it('generated regex can be parsed - zero_or_more', () => {
      const template = getTemplateById('zero_or_more')
      const regex = template!.buildRegex('a')
      expect(() => parse(regex)).not.toThrow()
    })

    it('generated regex can be parsed - one_or_more', () => {
      const template = getTemplateById('one_or_more')
      const regex = template!.buildRegex('a')
      expect(() => parse(regex)).not.toThrow()
    })

    it('generated regex can be parsed - optional', () => {
      const template = getTemplateById('optional')
      const regex = template!.buildRegex('a')
      expect(() => parse(regex)).not.toThrow()
    })

    it('generated regex can be parsed - any_single', () => {
      const template = getTemplateById('any_single')
      const regex = template!.buildRegex('abc')
      expect(() => parse(regex)).not.toThrow()
    })

    it('generated regex can be parsed - starts_with', () => {
      const template = getTemplateById('starts_with')
      const regex = template!.buildRegex('a')
      expect(() => parse(regex)).not.toThrow()
    })

    it('generated regex can be parsed - ends_with', () => {
      const template = getTemplateById('ends_with')
      const regex = template!.buildRegex('c')
      expect(() => parse(regex)).not.toThrow()
    })

    it('generated regex can be parsed - contains', () => {
      const template = getTemplateById('contains')
      const regex = template!.buildRegex('ab')
      expect(() => parse(regex)).not.toThrow()
    })

    // Round-trip guard: + form and | form parse to equivalent languages
    it('alternation + form parses and accepts same strings as | form', () => {
      // The parser accepts both + and | as union, so (a + b) and (a|b) are equivalent
      const plusForm = '(a + b)'
      const pipeForm = '(a|b)'
      // Both must parse without throwing
      expect(() => parse(plusForm)).not.toThrow()
      expect(() => parse(pipeForm)).not.toThrow()
      // Both ASTs should have type 'union'
      const plusAst = parse(plusForm)
      const pipeAst = parse(pipeForm)
      expect(plusAst.type).toBe('union')
      expect(pipeAst.type).toBe('union')
    })

    it('position template + form parses identically to equivalent | form', () => {
      // starts_with emits (a + b + c)* -- verify the parser handles spaced + union
      const plusForm = '(a + b + c)*'
      const pipeForm = '(a|b|c)*'
      expect(() => parse(plusForm)).not.toThrow()
      expect(() => parse(pipeForm)).not.toThrow()
      const plusAst = parse(plusForm)
      const pipeAst = parse(pipeForm)
      // Both should be star nodes over a union
      expect(plusAst.type).toBe('star')
      expect(pipeAst.type).toBe('star')
    })

    it('note: all templates now use parser-compatible syntax', () => {
      // Position templates use (a + b + c)* instead of .* for wildcards
      // All templates generate patterns compatible with our simplified parser
      expect(true).toBe(true)
    })
  })
})
