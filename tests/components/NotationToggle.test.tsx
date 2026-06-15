import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotationProvider } from '@/notation/NotationContext'
import { NotationToggle } from '@/notation/NotationToggle'

function renderWithProvider() {
  return render(
    <NotationProvider>
      <NotationToggle />
    </NotationProvider>
  )
}

describe('NotationToggle', () => {
  describe('ARIA structure', () => {
    it('renders a radiogroup with an accessible name', () => {
      renderWithProvider()
      const group = screen.getByRole('radiogroup', { name: /notation/i })
      expect(group).toBeInTheDocument()
    })

    it('renders exactly two radio options', () => {
      renderWithProvider()
      const radios = screen.getAllByRole('radio')
      expect(radios).toHaveLength(2)
    })

    it('Course option is checked by default', () => {
      renderWithProvider()
      const course = screen.getByRole('radio', { name: /course/i })
      expect(course).toHaveAttribute('aria-checked', 'true')
    })

    it('Textbook option is unchecked by default', () => {
      renderWithProvider()
      const textbook = screen.getByRole('radio', { name: /textbook/i })
      expect(textbook).toHaveAttribute('aria-checked', 'false')
    })
  })

  describe('glyph rendering', () => {
    it('Course option shows the course union glyph +', () => {
      renderWithProvider()
      const course = screen.getByRole('radio', { name: /course/i })
      expect(course.textContent).toContain('+')
    })

    it('Course option shows the course empty-string glyph λ', () => {
      renderWithProvider()
      const course = screen.getByRole('radio', { name: /course/i })
      expect(course.textContent).toContain('λ')
    })

    it('Textbook option shows the textbook union glyph |', () => {
      renderWithProvider()
      const textbook = screen.getByRole('radio', { name: /textbook/i })
      expect(textbook.textContent).toContain('|')
    })

    it('Textbook option shows the textbook empty-string glyph ε', () => {
      renderWithProvider()
      const textbook = screen.getByRole('radio', { name: /textbook/i })
      expect(textbook.textContent).toContain('ε')
    })
  })

  describe('click interaction', () => {
    it('clicking Textbook moves aria-checked to Textbook', async () => {
      renderWithProvider()
      const textbook = screen.getByRole('radio', { name: /textbook/i })
      await userEvent.click(textbook)
      expect(textbook).toHaveAttribute('aria-checked', 'true')
    })

    it('clicking Textbook unchecks Course', async () => {
      renderWithProvider()
      const course = screen.getByRole('radio', { name: /course/i })
      const textbook = screen.getByRole('radio', { name: /textbook/i })
      await userEvent.click(textbook)
      expect(course).toHaveAttribute('aria-checked', 'false')
    })

    it('clicking Course again after switching returns to Course', async () => {
      renderWithProvider()
      const course = screen.getByRole('radio', { name: /course/i })
      const textbook = screen.getByRole('radio', { name: /textbook/i })
      await userEvent.click(textbook)
      await userEvent.click(course)
      expect(course).toHaveAttribute('aria-checked', 'true')
      expect(textbook).toHaveAttribute('aria-checked', 'false')
    })
  })

  describe('keyboard interaction', () => {
    it('ArrowRight moves selection to Textbook when Course is active', async () => {
      renderWithProvider()
      const course = screen.getByRole('radio', { name: /course/i })
      const textbook = screen.getByRole('radio', { name: /textbook/i })
      // Focus the active radio then press ArrowRight; the keydown handler is on
      // the group div and fires as the event bubbles up from the focused child.
      course.focus()
      await userEvent.keyboard('{ArrowRight}')
      expect(textbook).toHaveAttribute('aria-checked', 'true')
    })

    it('ArrowLeft wraps back to Course from Textbook', async () => {
      renderWithProvider()
      const course = screen.getByRole('radio', { name: /course/i })
      const textbook = screen.getByRole('radio', { name: /textbook/i })
      await userEvent.click(textbook)
      textbook.focus()
      await userEvent.keyboard('{ArrowLeft}')
      expect(course).toHaveAttribute('aria-checked', 'true')
    })
  })
})
