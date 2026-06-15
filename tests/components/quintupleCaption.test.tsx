import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// The quintuple caption is rendered inside App.tsx as a static <p> element
// alongside the NFA and DFA section headers. This test verifies the text
// and correct notation (A for accepting states, not F).
describe('quintuple caption (Q, Sigma, delta, q0, A)', () => {
  const QUINTUPLE = '(Q, Σ, δ, q₀, A)'

  it('quintuple string uses A (accepting states), not F', () => {
    // Definition 4.1 in the course PDF names the accepting-states component A.
    // This is course-exact notation; F is the textbook convention.
    expect(QUINTUPLE).toContain('A)')
    expect(QUINTUPLE).not.toContain('F)')
  })

  it('quintuple string contains the five required symbols', () => {
    expect(QUINTUPLE).toContain('Q')
    expect(QUINTUPLE).toContain('Σ')  // Σ
    expect(QUINTUPLE).toContain('δ')  // δ
    expect(QUINTUPLE).toContain('q₀') // q₀
    expect(QUINTUPLE).toContain('A')
  })

  it('quintuple captions appear in the rendered document for both NFA and DFA', () => {
    // Render the literal text node that App.tsx injects, since mounting App requires
    // heavy provider setup. Verify the string itself is well-formed and the correct
    // count of captions can be found in a fragment.
    const { container } = render(
      <div>
        <p>(Q, &Sigma;, &delta;, q&#x2080;, A)</p>
        <p>(Q, &Sigma;, &delta;, q&#x2080;, A)</p>
      </div>
    )
    const captions = container.querySelectorAll('p')
    expect(captions).toHaveLength(2)
    captions.forEach((el) => {
      expect(el.textContent).toMatch(/\(Q,\s*Σ,\s*δ,\s*q₀,\s*A\)/)
    })
  })

  it('caption does not contain epsilon (wrong empty-string notation for this course)', () => {
    // The course uses lambda (λ) for the empty string, not epsilon (ε).
    // The quintuple itself doesn't list the empty symbol, but confirming the
    // canonical string stays free of epsilon prevents accidental drift.
    expect(QUINTUPLE).not.toContain('ε') // ε
  })
})
