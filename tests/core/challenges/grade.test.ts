import { describe, it, expect } from 'vitest'
import { gradeChallenge } from '@/core/challenges/grade'
import { StudentInput, Exercise } from '@/core/challenges/types'
import { Automaton, TooLargeError } from '@/core/automata/types'
import { CHALLENGES } from '@/core/challenges/bank'

// The grader (CHALLENGE-01/02). Every assertion is decided by the returned
// GradeResult / Equivalence object, never by automaton shape (invariant 8): a
// correct answer of a DIFFERENT shape than the reference passes, a wrong answer
// carries the shortest counterexample plus the direction of the error, degenerate
// input never crashes, and a too-large construction re-throws TooLargeError so the
// view can show its notice. No input is compiled to a JS RegExp.

const endsAb = CHALLENGES.find(c => c.id === 'dfa-ends-ab')!
const startsA = CHALLENGES.find(c => c.id === 'nfa-starts-a')!
const endsB = CHALLENGES.find(c => c.id === 'regex-ends-b')!

// A hand-built minimal DFA for "ends in ab" over {a, b}. Its shape is NOT the
// Thompson construction of (a + b)*ab (three states, no trap, distinct transition
// structure), so a passing verdict proves grading is by language, not by shape.
// q0 start, q1 = a trailing run of a's was just seen, q2 = "ab" just completed.
const endsAbByHand: Automaton = {
  states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
  transitions: [
    { from: 'q0', to: 'q1', symbol: 'a' },
    { from: 'q0', to: 'q0', symbol: 'b' },
    { from: 'q1', to: 'q1', symbol: 'a' },
    { from: 'q1', to: 'q2', symbol: 'b' },
    { from: 'q2', to: 'q1', symbol: 'a' },
    { from: 'q2', to: 'q0', symbol: 'b' },
  ],
  startState: 'q0',
  acceptStates: ['q2'],
  alphabet: new Set(['a', 'b']),
}

// Accepts every string over {a, b}: a single accepting state with self-loops. Wrong
// for "ends in ab" because it over-accepts (it accepts strings the reference does
// not), so the direction is 'student'.
const universal: Automaton = {
  states: [{ id: 's' }],
  transitions: [
    { from: 's', to: 's', symbol: 'a' },
    { from: 's', to: 's', symbol: 'b' },
  ],
  startState: 's',
  acceptStates: ['s'],
  alphabet: new Set(['a', 'b']),
}

// The empty/startless automaton toAutomaton produces from an empty editor. It must
// be graded as the empty-language submission, never crash the grader (Pitfall 6).
const startless: Automaton = {
  states: [],
  transitions: [],
  startState: '',
  acceptStates: [],
  alphabet: new Set<string>(),
}

describe('gradeChallenge', () => {
  it('passes a correct automaton of a DIFFERENT shape than the reference', () => {
    // Structure-independence: the hand-built DFA is not the reference's Thompson
    // form, yet it denotes the same language, so it grades equivalent.
    const input: StudentInput = { kind: 'automaton', automaton: endsAbByHand }
    const result = gradeChallenge(input, endsAb)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.verdict.equivalent).toBe(true)
  })

  it('fails an over-accepting automaton with the student direction', () => {
    // The universal machine accepts strings the reference rejects, so the student
    // wrongly accepts: acceptedBy 'student'.
    const input: StudentInput = { kind: 'automaton', automaton: universal }
    const result = gradeChallenge(input, endsAb)
    expect(result.ok).toBe(true)
    if (result.ok && !result.verdict.equivalent) {
      expect(result.verdict.acceptedBy).toBe('student')
    } else {
      throw new Error('expected a non-equivalent verdict')
    }
  })

  it('fails an over-accepting regex with the shortest counterexample and student direction', () => {
    // Student "(a + b)(a + b)*" accepts every non-empty string, including "b", which
    // the reference "a(a + b)*" rejects. Shortest witness is "b", wrongly accepted.
    const input: StudentInput = { kind: 'regex', src: '(a + b)(a + b)*' }
    const result = gradeChallenge(input, startsA)
    expect(result.ok).toBe(true)
    if (result.ok && !result.verdict.equivalent) {
      expect(result.verdict.counterexample).toBe('b')
      expect(result.verdict.acceptedBy).toBe('student')
    } else {
      throw new Error('expected a non-equivalent verdict')
    }
  })

  it('fails an under-accepting regex with the reference direction', () => {
    // Student "a" accepts only the single letter a; the reference "a(a + b)*"
    // accepts "aa", which the student rejects. The student wrongly rejects "aa".
    const input: StudentInput = { kind: 'regex', src: 'a' }
    const result = gradeChallenge(input, startsA)
    expect(result.ok).toBe(true)
    if (result.ok && !result.verdict.equivalent) {
      expect(result.verdict.counterexample).toBe('aa')
      expect(result.verdict.acceptedBy).toBe('reference')
    } else {
      throw new Error('expected a non-equivalent verdict')
    }
  })

  it('passes a correct student regex', () => {
    // A regex submission for the regex-build exercise: the reference denotation
    // itself grades equivalent, as does any other denotation of "ends in b".
    const input: StudentInput = { kind: 'regex', src: '(a + b)*b' }
    const result = gradeChallenge(input, endsB)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.verdict.equivalent).toBe(true)
  })

  it('returns an inline error for empty regex text, without throwing', () => {
    const input: StudentInput = { kind: 'regex', src: '   ' }
    const result = gradeChallenge(input, endsB)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0)
  })

  it('returns an inline error for an unparseable student regex, without throwing', () => {
    const input: StudentInput = { kind: 'regex', src: '(a + b' }
    const result = gradeChallenge(input, endsB)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0)
  })

  it('grades an empty/startless automaton as the empty language, without throwing', () => {
    // The empty machine accepts nothing, so against "ends in ab" it wrongly rejects
    // a string the reference accepts (acceptedBy 'reference'). It must not crash.
    const input: StudentInput = { kind: 'automaton', automaton: startless }
    const result = gradeChallenge(input, endsAb)
    expect(result.ok).toBe(true)
    if (result.ok && !result.verdict.equivalent) {
      expect(result.verdict.acceptedBy).toBe('reference')
    } else {
      throw new Error('expected a non-equivalent verdict')
    }
  })

  it('re-throws TooLargeError when the student construction exceeds the bound', () => {
    // A "k-th symbol from the end is 0" pattern over a five-symbol alphabet
    // determinizes to far more than the 256-state cap. The grader must re-throw
    // TooLargeError (so the view shows TooLargeNotice), not swallow it into
    // { ok: false } (SAFETY-01).
    const wide = '(0 + 1 + 2 + 3 + 4)'
    const tail = Array(6).fill(wide).join('')
    const input: StudentInput = { kind: 'regex', src: `${wide}*0${tail}` }
    const exercise: Exercise = {
      id: 'wide-too-large',
      type: 'regex',
      prompt: 'A pattern over Σ = {0, 1, 2, 3, 4} whose DFA exceeds the render bound.',
      alphabet: ['0', '1', '2', '3', '4'],
      reference: '(0 + 1 + 2 + 3 + 4)*',
    }
    expect(() => gradeChallenge(input, exercise)).toThrow(TooLargeError)
  })
})
