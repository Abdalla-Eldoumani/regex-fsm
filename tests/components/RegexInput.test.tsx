import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotationProvider } from '@/notation/NotationContext'
import { NotationContext, type NotationContextValue } from '@/notation/NotationContext'
import { GLYPHS } from '@/notation/glyphs'
import { RegexInput } from '@/components/input/RegexInput'

function renderWithCourseMode(overrides?: Partial<Parameters<typeof RegexInput>[0]>) {
  const props = {
    value: '',
    onChange: vi.fn(),
    alphabet: '',
    onAlphabetChange: vi.fn(),
    ...overrides,
  }
  return render(
    <NotationProvider>
      <RegexInput {...props} />
    </NotationProvider>
  )
}

function renderWithTextbookMode(overrides?: Partial<Parameters<typeof RegexInput>[0]>) {
  const props = {
    value: '',
    onChange: vi.fn(),
    alphabet: '',
    onAlphabetChange: vi.fn(),
    ...overrides,
  }
  const textbookValue: NotationContextValue = {
    mode: 'textbook',
    setMode: vi.fn(),
    glyphs: GLYPHS['textbook'],
  }
  return render(
    <NotationContext.Provider value={textbookValue}>
      <RegexInput {...props} />
    </NotationContext.Provider>
  )
}

describe('RegexInput', () => {
  describe('course mode (default)', () => {
    it('shows + as the union glyph in the legend', () => {
      renderWithCourseMode()
      // The union badge shows the glyph followed by "union"
      const badge = screen.getByText('union', { exact: false }).closest('span')
      expect(badge?.textContent).toContain('+')
    })

    it('shows course placeholder with + union operator', () => {
      renderWithCourseMode()
      const input = screen.getByRole('textbox', { name: /regular expression/i })
      expect(input).toHaveAttribute('placeholder', '(a + b)*abb')
    })
  })

  describe('textbook mode', () => {
    it('shows | as the union glyph in the legend', () => {
      renderWithTextbookMode()
      const badge = screen.getByText('union', { exact: false }).closest('span')
      expect(badge?.textContent).toContain('|')
    })

    it('shows textbook placeholder with | union operator', () => {
      renderWithTextbookMode()
      const input = screen.getByRole('textbox', { name: /regular expression/i })
      expect(input).toHaveAttribute('placeholder', '(a|b)*abb')
    })
  })

  describe('verbatim value', () => {
    it('displays the typed value verbatim regardless of mode', async () => {
      const onChange = vi.fn()
      renderWithCourseMode({ value: 'a|b', onChange })
      const input = screen.getByRole('textbox', { name: /regular expression/i })
      // The typed value (pipe union) is never rewritten
      expect(input).toHaveValue('a|b')
    })

    it('calls onChange with the raw typed value', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      renderWithCourseMode({ value: '', onChange })
      const input = screen.getByRole('textbox', { name: /regular expression/i })
      await user.type(input, 'a')
      expect(onChange).toHaveBeenCalledWith('a')
    })
  })

  describe('error state', () => {
    it('shows error message when error prop is provided', () => {
      renderWithCourseMode({ error: 'Unexpected token at position 2' })
      expect(screen.getByText('Unexpected token at position 2')).toBeInTheDocument()
    })

    it('applies error border class when error is present', () => {
      renderWithCourseMode({ error: 'parse error' })
      const input = screen.getByRole('textbox', { name: /regular expression/i })
      expect(input.className).toContain('border-error')
    })
  })
})
