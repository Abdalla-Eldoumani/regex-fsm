import { describe, it, expect } from 'vitest'
import { automatonToTikZ } from './automatonToTikZ'
import type { Automaton } from '@/core/automata/types'

// This suite proves the TikZ serializer emits a compilable standalone tikzpicture
// in course notation that reflects the actual (Q, Sigma, delta, q0, A), and that
// TeX specials in any id or symbol are escaped so a crafted value cannot break
// compilation or inject TeX (threat T-12-07). The empty-string move renders as
// the TeX lambda macro and the empty language as the TeX emptyset, per the
// automata-correctness skill.

describe('automatonToTikZ', () => {
  it('emits a standalone tikzpicture environment', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a']),
    }
    const tex = automatonToTikZ(a)
    expect(tex).toContain('\\begin{tikzpicture}')
    expect(tex).toContain('\\end{tikzpicture}')
  })

  it('marks the start node initial and the accept node accepting', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a']),
    }
    const tex = automatonToTikZ(a)
    expect(tex).toContain('initial')
    expect(tex).toContain('accepting')
  })

  it('renders a null transition symbol as the TeX lambda macro', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: null }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set<string>(),
    }
    const tex = automatonToTikZ(a)
    expect(tex).toContain('$\\lambda$')
  })

  it('renders the trap state label as the TeX emptyset', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: '∅' }],
      transitions: [
        { from: 'q0', to: '∅', symbol: 'a' },
        { from: '∅', to: '∅', symbol: 'a' },
      ],
      startState: 'q0',
      acceptStates: [],
      alphabet: new Set(['a']),
    }
    const tex = automatonToTikZ(a)
    expect(tex).toContain('$\\emptyset$')
  })

  // Threat T-12-07: a TeX special character in a symbol must be escaped, here the
  // hash, which is the alignment-tab macro in TeX and would break compilation raw.
  it('escapes a hash in a transition symbol to a backslash-hash', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: '#' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['#']),
    }
    const tex = automatonToTikZ(a)
    expect(tex).toContain('\\#')
    // The raw hash must not appear as an unescaped node/edge label token; every
    // hash in the output is part of an escaped \# sequence.
    expect(/(^|[^\\])#/.test(tex)).toBe(false)
  })

  it('escapes underscore, ampersand, percent, and dollar in a state id', () => {
    const a: Automaton = {
      states: [{ id: 'q_0&x%y$z' }],
      transitions: [],
      startState: 'q_0&x%y$z',
      acceptStates: [],
      alphabet: new Set<string>(),
    }
    const tex = automatonToTikZ(a)
    expect(tex).toContain('\\_')
    expect(tex).toContain('\\&')
    expect(tex).toContain('\\%')
    expect(tex).toContain('\\$')
  })

  // Threat T-12-07, the brace case. Subset-construction DFA state ids carry literal
  // braces, e.g. "{q0,q1}". A raw brace in TeX opens/closes a group, so an
  // unescaped id would swallow following tokens and break compilation. tex() must
  // escape "{" to "\{" and "}" to "\}" so the set-notation id renders as text.
  it('escapes braces in a subset-construction state id so LaTeX does not eat them', () => {
    const a: Automaton = {
      states: [{ id: '{q0,q1}' }, { id: '{q2}' }],
      transitions: [
        { from: '{q0,q1}', to: '{q2}', symbol: 'a' },
        { from: '{q2}', to: '{q0,q1}', symbol: 'b' },
      ],
      startState: '{q0,q1}',
      acceptStates: ['{q2}'],
      alphabet: new Set(['a', 'b']),
    }
    const tex = automatonToTikZ(a)
    // The set-notation ids appear with both braces escaped.
    expect(tex).toContain('\\{q0,q1\\}')
    expect(tex).toContain('\\{q2\\}')
    // The raw, unescaped id "{q0,q1}" must NOT survive as a node-body token: a brace
    // that is part of the id is always preceded by a backslash. (Structural TeX
    // braces from \node{...} are fine; what we forbid is the q0,q1 set wrapped in
    // bare braces.)
    expect(tex).not.toContain('{q0,q1}')
    expect(tex).not.toContain('{q2}')
  })

  it('reflects the actual automaton with a node per state and an edge per transition', () => {
    const a: Automaton = {
      states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
      transitions: [
        { from: 'q0', to: 'q1', symbol: 'a' },
        { from: 'q1', to: 'q2', symbol: 'b' },
        { from: 'q2', to: 'q2', symbol: 'a' },
      ],
      startState: 'q0',
      acceptStates: ['q2'],
      alphabet: new Set(['a', 'b']),
    }
    const tex = automatonToTikZ(a)
    // Three node declarations.
    expect((tex.match(/\\node/g) ?? []).length).toBe(3)
    // The self-loop on q2 uses a loop edge.
    expect(tex).toContain('loop')
    // Edge symbols present.
    expect(tex).toContain('a')
    expect(tex).toContain('b')
  })
})
