import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ComputationTree } from '@/components/simulation/ComputationTree'
import { computationTree } from '@/core/algorithms/computationTree'
import type { NFA } from '@/core/automata/types'

// ComputationTree render test (SIM-02). The tree is driven by a REAL computationTree
// result (never a hand-fabricated object) so a regression in either the algorithm or
// the view's cue mapping is caught. The configuration-set DAG merges parallel
// branches and marks a node dead only when its WHOLE set loses its successor, so a
// dead sibling and a live accepting leaf cannot share one level in one tree. Two
// minimal NFAs therefore cover the cues honestly:
//   - acceptNfa drives an accepting leaf and a lambda-closure expansion (the lambda
//     label), and
//   - deadNfa drives a configuration that dies into the empty set.

// q0 -a-> {q1,q2}; q1 -lambda-> q3 (closure, so the 'a' edge is viaLambda); then
// q3 -b-> q4 (accept). On "ab" the final level is the accepting leaf {q4}.
const acceptNfa: NFA = {
  states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }, { id: 'q3' }, { id: 'q4' }],
  transitions: [
    { from: 'q0', to: 'q1', symbol: 'a' },
    { from: 'q0', to: 'q2', symbol: 'a' },
    { from: 'q1', to: 'q3', symbol: null },
    { from: 'q3', to: 'q4', symbol: 'b' },
  ],
  startState: 'q0',
  acceptStates: ['q4'],
  alphabet: new Set(['a', 'b']),
}

// q0 -a-> q1 (accept), and q1 has NO move on b. On "ab" the {q1} configuration dies:
// level 1 is marked dead, level 2 is the empty set.
const deadNfa: NFA = {
  states: [{ id: 'q0' }, { id: 'q1' }],
  transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
  startState: 'q0',
  acceptStates: ['q1'],
  alphabet: new Set(['a', 'b']),
}

describe('ComputationTree', () => {
  it('renders the tree container stepped to the final level', () => {
    const result = computationTree(acceptNfa, 'ab')
    render(<ComputationTree result={result} currentStep={result.levels.length - 1} />)
    expect(screen.getByTestId('sim-tree')).toBeInTheDocument()
  })

  it('marks the accepting leaf with the accept cue for an accepted input', () => {
    const result = computationTree(acceptNfa, 'ab')
    expect(result.accepted).toBe(true)
    render(<ComputationTree result={result} currentStep={result.levels.length - 1} />)
    const accepts = screen.getAllByTestId('sim-tree-accept')
    expect(accepts.length).toBeGreaterThanOrEqual(1)
    // The accepting leaf is the final lambda-closed set {q4}, in course set notation.
    expect(accepts.some(n => n.textContent === '{q4}')).toBe(true)
  })

  it('labels the lambda-closure expansion distinctly on the level it reaches', () => {
    const result = computationTree(acceptNfa, 'ab')
    render(<ComputationTree result={result} currentStep={result.levels.length - 1} />)
    // Level 1 ({q1,q2,q3}) was reached by a lambda-closure expansion, so the tree
    // annotates that row with the lambda move marker.
    const tree = screen.getByTestId('sim-tree')
    expect(within(tree).getAllByText(/λ-move/).length).toBeGreaterThanOrEqual(1)
    // The consuming symbol of a level is still named ("reading 'a'").
    expect(within(tree).getByText(/reading 'a'/)).toBeInTheDocument()
  })

  it('marks a dead branch with the empty-set glyph', () => {
    const result = computationTree(deadNfa, 'ab')
    expect(result.accepted).toBe(false)
    render(<ComputationTree result={result} currentStep={result.levels.length - 1} />)
    const deads = screen.getAllByTestId('sim-tree-dead')
    expect(deads.length).toBeGreaterThanOrEqual(1)
    // The dead leaf renders the empty-set glyph (a configuration that went nowhere).
    expect(deads.some(n => n.textContent === '∅')).toBe(true)
  })

  it('draws only the levels up to the current step (lockstep with the tape)', () => {
    const result = computationTree(acceptNfa, 'ab')
    // At step 0 only the root level is drawn; the accepting leaf at level 2 is not
    // yet present, so the tree advances with the shared step index.
    render(<ComputationTree result={result} currentStep={0} />)
    expect(screen.getByTestId('sim-tree')).toBeInTheDocument()
    expect(screen.queryByTestId('sim-tree-accept')).toBeNull()
  })
})
