import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TheoryPanel } from '@/components/education/TheoryPanel'

// These tests encode the course definitions from the PDF so that a future edit
// reintroducing F / | / "sugar" / ε fails CI rather than silently misteaching.

describe('TheoryPanel', () => {
  // The first section (index 0) is expanded by default.
  // Click a section header button to expand it before asserting.

  async function expandSection(title: string) {
    const btn = screen.getByRole('button', { name: new RegExp(title, 'i') })
    await userEvent.click(btn)
  }

  describe('nfa topic', () => {
    it('renders the NFA definition with (Q, Σ, δ, q₀, A) and A for accepting', async () => {
      render(<TheoryPanel topic="nfa" />)
      // Definition is section 0, expanded by default.
      const content = document.body.textContent ?? ''
      expect(content).toContain('(Q, Σ, δ, q₀, A)')
      expect(content).toContain('accepting states')
    })

    it('does not use F for the accepting set', () => {
      render(<TheoryPanel topic="nfa" />)
      // q₀, F) would be the old wrong quintuple
      expect(document.body.textContent).not.toMatch(/q₀,\s*F\)/)
    })

    it('uses λ for the empty string (not ε)', async () => {
      render(<TheoryPanel topic="nfa" />)
      // Expand all sections to get full text coverage
      await expandSection('Properties')
      await expandSection('Example')
      expect(document.body.textContent).toContain('λ')
      expect(document.body.textContent).not.toMatch(/[^a-zA-Z]ε/)
    })

    it('example uses + for union, not |', async () => {
      render(<TheoryPanel topic="nfa" />)
      await expandSection('Example')
      expect(document.body.textContent).toContain('a + b')
      expect(document.body.textContent).not.toContain('(a|b)')
    })
  })

  describe('dfa topic', () => {
    it('renders the DFA definition with (Q, Σ, δ, q₀, A) and A for accepting', () => {
      render(<TheoryPanel topic="dfa" />)
      const content = document.body.textContent ?? ''
      expect(content).toContain('(Q, Σ, δ, q₀, A)')
      expect(content).toContain('accepting states')
    })

    it('does not use F for the accepting set', () => {
      render(<TheoryPanel topic="dfa" />)
      expect(document.body.textContent).not.toMatch(/q₀,\s*F\)/)
    })

    it('example uses + for union, not |', async () => {
      render(<TheoryPanel topic="dfa" />)
      await expandSection('Example')
      expect(document.body.textContent).toContain('a + b')
      expect(document.body.textContent).not.toContain('(a|b)')
    })
  })

  describe('regex topic', () => {
    it('describes r+ as a first-class course operator (not syntactic sugar)', () => {
      render(<TheoryPanel topic="regex" />)
      // Section 0 (Definition) is expanded by default.
      const content = document.body.textContent ?? ''
      expect(content).toContain('first-class')
      expect(content).not.toContain('syntactic sugar')
    })

    it('uses + for union in examples, not |', async () => {
      render(<TheoryPanel topic="regex" />)
      await expandSection('Example')
      const content = document.body.textContent ?? ''
      expect(content).toContain('a + b')
      expect(content).not.toContain('(a|b)')
    })

    it('precedence text says union binds loosest', async () => {
      render(<TheoryPanel topic="regex" />)
      await expandSection('Properties')
      // Match case-insensitively: the text begins a sentence with capital U.
      expect(document.body.textContent?.toLowerCase()).toContain('union binds loosest')
    })

    it('mentions L(r+) = L(r)+ as the positive closure language definition', () => {
      render(<TheoryPanel topic="regex" />)
      expect(document.body.textContent).toContain('L(r+)')
    })
  })
})
