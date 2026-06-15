// Curated preset source NFAs for the NFA-to-regex elimination view.
//
// All presets are small, course-recognizable NFAs over {a, b}. They are
// hand-authored so the elimination produces a short, readable step sequence
// and the E2E can rely on deterministic step counts (Pitfall 4).
//
// regexToSourceNfa is provided for the typed-regex input path. parse is
// depth-bounded (MAX_PARSE_DEPTH=300); callers surface parse errors; this
// function does not swallow them (T-06-07).

import { parse } from '@/core/cachedAlgorithms'
import { buildNFA } from '@/core/algorithms/thompson'
import type { NFA, State, Transition } from '@/core/automata/types'

export interface GnfaPreset {
  id: string
  label: string
  nfa: NFA
}

// Helper to build a State object (mirrors nfa.ts createState).
function st(id: string): State {
  return { id }
}

// Helper to build a symbol transition.
function sym(from: string, to: string, symbol: string | null): Transition {
  return { from, to, symbol }
}

// Preset 1: a* — single self-loop, accepts any number of a's.
// States: q0 (start + accept). One transition q0 --a--> q0.
// Elimination is trivial and produces `a*` in one step after the initial GNFA.
const aStarNfa: NFA = {
  states: [st('q0')],
  transitions: [sym('q0', 'q0', 'a')],
  startState: 'q0',
  acceptStates: ['q0'],
  alphabet: new Set(['a']),
}

// Preset 2: a + b — two branches from one start to two accept states.
// Recognizes exactly the strings "a" and "b".
// Layout: q0 --a--> q1, q0 --b--> q2. Both q1, q2 are accept states.
const aOrBNfa: NFA = {
  states: [st('q0'), st('q1'), st('q2')],
  transitions: [sym('q0', 'q1', 'a'), sym('q0', 'q2', 'b')],
  startState: 'q0',
  acceptStates: ['q1', 'q2'],
  alphabet: new Set(['a', 'b']),
}

// Preset 3: strings ending in "ab" over {a, b}.
// States: q0 (start), q1 (seen a), q2 (seen ab, accept).
// Transitions: q0 --a--> q1, q0 --b--> q0, q0 --a--> q0,
//              q1 --b--> q2, q1 --a--> q1.
// This is a compact hand-built NFA (not the Thompson construction of (a+b)*ab)
// but it recognizes exactly the strings ending in "ab" over {a, b}.
const endsInAbNfa: NFA = {
  states: [st('q0'), st('q1'), st('q2')],
  transitions: [
    sym('q0', 'q0', 'a'),
    sym('q0', 'q0', 'b'),
    sym('q0', 'q1', 'a'),
    sym('q1', 'q2', 'b'),
  ],
  startState: 'q0',
  acceptStates: ['q2'],
  alphabet: new Set(['a', 'b']),
}

// Preset 4: (ab)* — strings of even length alternating a then b (including empty).
// Derived via buildNFA(parse('(ab)*')) for correctness; frozen at load time so
// the preset is deterministic across reloads.
const abStarNfa: NFA = buildNFA(parse('(ab)*'))

// Preset 5: contains "a" — any string over {a, b} that has at least one a.
// States: q0 (start), q1 (seen a, accept).
// q0 --a--> q1, q0 --b--> q0, q1 --a--> q1, q1 --b--> q1.
const containsANfa: NFA = {
  states: [st('q0'), st('q1')],
  transitions: [
    sym('q0', 'q0', 'b'),
    sym('q0', 'q1', 'a'),
    sym('q1', 'q1', 'a'),
    sym('q1', 'q1', 'b'),
  ],
  startState: 'q0',
  acceptStates: ['q1'],
  alphabet: new Set(['a', 'b']),
}

export const GNFA_PRESETS: GnfaPreset[] = [
  { id: 'a-star', label: 'a*', nfa: aStarNfa },
  { id: 'a-or-b', label: 'a + b', nfa: aOrBNfa },
  { id: 'ends-in-ab', label: 'ends in ab', nfa: endsInAbNfa },
  { id: 'ab-star', label: '(ab)*', nfa: abStarNfa },
  { id: 'contains-a', label: 'contains a', nfa: containsANfa },
]

// Convert a typed regex string to a source NFA via parse + buildNFA.
// parse is depth-bounded and throws on invalid input; callers surface the error.
export function regexToSourceNfa(src: string): NFA {
  return buildNFA(parse(src))
}
