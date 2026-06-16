import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InputTape } from '@/components/simulation/InputTape'

// The verdict frame (SIM-01). InputTape previously ignored its accepted prop; the
// final tape frame must read the accept/reject verdict with an icon AND the literal
// word, never color alone (the colorblind-safe floor). When accepted is omitted the
// tape renders as before with no verdict frame.

describe('InputTape verdict frame', () => {
  it('renders no verdict frame when accepted is omitted', () => {
    render(<InputTape input="ab" currentPosition={0} />)
    expect(screen.queryByTestId('sim-tape-verdict')).toBeNull()
  })

  it('renders no verdict frame when accepted is null', () => {
    render(<InputTape input="ab" currentPosition={0} accepted={null} />)
    expect(screen.queryByTestId('sim-tape-verdict')).toBeNull()
  })

  it('renders an Accepted verdict with text when accepted is true', () => {
    render(<InputTape input="ab" currentPosition={2} accepted={true} />)
    const verdict = screen.getByTestId('sim-tape-verdict')
    expect(verdict).toBeInTheDocument()
    expect(verdict).toHaveTextContent('Accepted')
    // The word carries the meaning, so it is present regardless of color.
    expect(screen.getByText('Accepted')).toBeInTheDocument()
  })

  it('renders a Rejected verdict with text when accepted is false', () => {
    render(<InputTape input="ab" currentPosition={2} accepted={false} />)
    const verdict = screen.getByTestId('sim-tape-verdict')
    expect(verdict).toBeInTheDocument()
    expect(verdict).toHaveTextContent('Rejected')
    expect(screen.getByText('Rejected')).toBeInTheDocument()
  })

  it('still renders the empty-input prompt and no verdict when input is empty', () => {
    render(<InputTape input="" currentPosition={0} accepted={true} />)
    // The empty-input early return is unchanged: prompt shown, no tape verdict frame.
    expect(screen.getByText(/Enter a test string/i)).toBeInTheDocument()
    expect(screen.queryByTestId('sim-tape-verdict')).toBeNull()
  })
})
