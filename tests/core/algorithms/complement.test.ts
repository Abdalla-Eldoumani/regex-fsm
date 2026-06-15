import { describe, it, expect } from 'vitest'
import { parse } from '@/core/cachedAlgorithms'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateDFA } from '@/core/algorithms/simulate'
import { completeDFA, complementDFA } from '@/core/algorithms/complement'
import { DFA } from '@/core/automata/types'

// Unit suite for completeDFA and complementDFA (automata-correctness invariants 1
// and 7, Theorem 4.23).
//
// THE METHOD: correctness is decided by LANGUAGE equivalence via simulateDFA over a
// string battery, never by graph shape or state count (invariant 8). No input is
// ever compiled to a JS RegExp (threat T-07-TAMPER); source DFAs come through the
// real pipeline parse -> buildNFA -> nfaToDFA. The structural assertions present
// here (trapAdded flag, added-edge identity, step stages) check the construction's
// internal contract; the LANGUAGE is always checked by simulate.

const SYMBOLS = ['a', 'b'] as const

function allStringsUpTo(maxLength: number): string[] {
  const out: string[] = ['']
  let frontier: string[] = ['']
  for (let len = 1; len <= maxLength; len++) {
    const next: string[] = []
    for (const prefix of frontier) {
      for (const sym of SYMBOLS) {
        const s = prefix + sym
        out.push(s)
        next.push(s)
      }
    }
    frontier = next
  }
  return out
}

const BATTERY = allStringsUpTo(6)

function dfaFromRegex(regex: string): DFA {
  return nfaToDFA(buildNFA(parse(regex)))
}

describe('completeDFA', () => {
  // Pitfall 1: subset.ts output is ALREADY complete, so completing it is a no-op.
  // The helper must not double-add a trap or invent edges.
  it('is a no-op on an already-complete DFA', () => {
    const complete = dfaFromRegex('a')
    const result = completeDFA(complete)

    expect(result.trapAdded).toBe(false)
    expect(result.addedEdges).toHaveLength(0)
    // Same structure: states deep-equal the input (returned unchanged).
    expect(result.dfa.states).toEqual(complete.states)
    expect(result.dfa).toBe(complete)
  })

  // The real-edge path: a hand-built DFA missing a 'b'-edge gains exactly that edge
  // to the trap, and the trap carries one self-loop per alphabet symbol.
  it('adds the right trap edges for an incomplete DFA', () => {
    // Σ = {a, b}. q0 -a-> q1 (accepting). No 'b'-edge from q0, no edges from q1.
    // Three transitions are missing: (q0,b), (q1,a), (q1,b).
    const incomplete: DFA = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a', 'b']),
    }

    const result = completeDFA(incomplete)

    expect(result.trapAdded).toBe(true)
    // Exactly the three missing edges, each routed to the trap.
    expect(result.addedEdges).toHaveLength(3)
    expect(result.addedEdges).toContainEqual({ from: 'q0', to: '∅', symbol: 'b' })
    expect(result.addedEdges).toContainEqual({ from: 'q1', to: '∅', symbol: 'a' })
    expect(result.addedEdges).toContainEqual({ from: 'q1', to: '∅', symbol: 'b' })

    // The trap exists with |Σ| self-loops and is not accepting.
    expect(result.dfa.states.some((s) => s.id === '∅')).toBe(true)
    const trapSelfLoops = result.dfa.transitions.filter(
      (t) => t.from === '∅' && t.to === '∅'
    )
    expect(trapSelfLoops).toHaveLength(incomplete.alphabet.size)
    expect(result.dfa.acceptStates).not.toContain('∅')
    // The original accept set is preserved by completion (the flip happens later).
    expect(result.dfa.acceptStates).toEqual(['q1'])
  })

  // Idempotency the other direction: completing an already-completed machine is a
  // second no-op (no new trap, no new edges).
  it('completing twice equals completing once', () => {
    const incomplete: DFA = {
      states: [{ id: 'q0' }],
      transitions: [{ from: 'q0', to: 'q0', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q0'],
      alphabet: new Set(['a', 'b']),
    }
    const once = completeDFA(incomplete).dfa
    const twice = completeDFA(once)
    expect(twice.trapAdded).toBe(false)
    expect(twice.addedEdges).toHaveLength(0)
  })

  it('does not mutate its input', () => {
    const incomplete: DFA = {
      states: [{ id: 'q0' }],
      transitions: [{ from: 'q0', to: 'q0', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q0'],
      alphabet: new Set(['a', 'b']),
    }
    const snapshotStates = incomplete.states.length
    const snapshotTransitions = incomplete.transitions.length
    completeDFA(incomplete)
    expect(incomplete.states).toHaveLength(snapshotStates)
    expect(incomplete.transitions).toHaveLength(snapshotTransitions)
  })
})

describe('complementDFA', () => {
  // Invariant 7: completion (step 1) precedes the flip (step 2), and the flip is
  // computed from the COMPLETED machine, not the input.
  it('completes before flipping', () => {
    const incomplete: DFA = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a', 'b']),
    }

    const result = complementDFA(incomplete)

    expect(result.steps).toHaveLength(3)
    expect(result.steps[0].stage).toBe('original')
    expect(result.steps[1].stage).toBe('completed')
    expect(result.steps[2].stage).toBe('flipped')

    // The completed machine added the trap; the flip set is derived from it.
    expect(result.steps[1].addedTrap).toBe(true)
    const completed = result.steps[1].dfa
    const wasAccept = new Set(completed.acceptStates)
    const expectedFlip = completed.states
      .map((s) => s.id)
      .filter((id) => !wasAccept.has(id))
    expect([...result.dfa.acceptStates].sort()).toEqual([...expectedFlip].sort())

    // The trap is now accepting (∅ ∈ flipped accept set). Forgetting this is the
    // silent Σ*\L bug.
    expect(result.dfa.acceptStates).toContain('∅')
  })

  // Non-vacuity / the Σ*\L precondition. A string that runs off a missing edge is
  // REJECTED by the incomplete input but ACCEPTED by its complement (it lands in
  // the now-accepting trap). If completion were skipped this string would be
  // wrongly rejected by the complement too, and the test would fail.
  it('accepts strings that ran off missing edges of an incomplete DFA', () => {
    // q0 -a-> q1 (accepting); q1 has no 'b'-edge. 'ab' runs off q1's missing 'b'.
    const incomplete: DFA = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a', 'b']),
    }

    // The input has no path for 'ab' (simulateDFA rejects on the missing edge).
    expect(simulateDFA(incomplete, 'ab').accepted).toBe(false)

    const complement = complementDFA(incomplete).dfa
    // The complement accepts it: 'ab' falls into the trap, which the flip made
    // accepting. This is exactly what completion-before-flip buys.
    expect(simulateDFA(complement, 'ab').accepted).toBe(true)
  })

  // Worked example by equivalence: complement of "contains an a" = "contains no a".
  // Decided by simulateDFA over the battery, never by shape.
  it('complement of contains-a equals contains-no-a (by equivalence)', () => {
    const containsA = dfaFromRegex('(a+b)*a(a+b)*')
    const complement = complementDFA(containsA).dfa

    for (const s of BATTERY) {
      const hasA = s.includes('a')
      // contains-a accepts iff the string has an a; its complement accepts iff not.
      expect(simulateDFA(complement, s).accepted).toBe(!hasA)
    }
  })

  // L(complement) = Σ* \ L(input) on a complete subset-built source over the battery.
  it('complement flips acceptance of a complete DFA over the battery', () => {
    const source = dfaFromRegex('(a+b)*abb')
    const complement = complementDFA(source).dfa
    for (const s of BATTERY) {
      expect(simulateDFA(complement, s).accepted).toBe(
        !simulateDFA(source, s).accepted
      )
    }
  })

  it('does not mutate its input', () => {
    const source = dfaFromRegex('a')
    const acceptsBefore = [...source.acceptStates]
    complementDFA(source)
    expect(source.acceptStates).toEqual(acceptsBefore)
  })
})
