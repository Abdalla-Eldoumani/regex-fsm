import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ErrorBoundary from '@/components/ErrorBoundary'

// ErrorBoundary is the last line of defense: when a child throws during render the
// app must show a recoverable fallback, not a blank white screen. These tests prove
// the boundary catches a thrown child, renders the fallback copy, surfaces the error
// text, and offers both recovery controls (reload + go home). The fallback uses a
// react-router <Link>, so the render is wrapped in a router; without it the Link
// throws and the test would fail for the wrong reason.

// A child that throws on render to trip the boundary.
function Boom(): never {
  throw new Error('kaboom from child')
}

describe('ErrorBoundary', () => {
  // React logs caught render errors to console.error (twice: the boundary's own
  // componentDidCatch and React's internal report). Silence it so the expected noise
  // does not pollute the run, and restore it after each test.
  let errorSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('renders children unchanged when nothing throws', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <p>healthy child</p>
        </ErrorBoundary>
      </MemoryRouter>,
    )
    expect(screen.getByText('healthy child')).toBeInTheDocument()
    // The fallback heading must NOT be present on the happy path.
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('renders the fallback message when a child throws', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      </MemoryRouter>,
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    // The actual error text is surfaced for debugging.
    expect(screen.getByText(/kaboom from child/)).toBeInTheDocument()
  })

  it('offers both recovery controls (reload and go home)', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      </MemoryRouter>,
    )
    // Reload is a button; Go Home is a router link to "/".
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
    const home = screen.getByRole('link', { name: /go home/i })
    expect(home).toBeInTheDocument()
    expect(home).toHaveAttribute('href', '/')
  })

  it('logs the caught error to the console for debugging', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      </MemoryRouter>,
    )
    // componentDidCatch logs through console.error; the spy must have seen it.
    expect(errorSpy).toHaveBeenCalled()
  })
})
