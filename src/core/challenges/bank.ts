import { Exercise } from './types'

// The curated construction bank, mapped to the three course exercise types:
// build-a-DFA, build-an-NFA, build-a-regex. Modeled on the flat curated arrays in
// gnfaPresets.ts and pumping/nonRegularLanguages.ts: a hand-authored list of
// records with a stable id, a plain-language prompt, the alphabet, and a reference.
//
// Each reference is stored as a course-notation regex because grading is by
// language, not by shape (automata-correctness invariant 8). The reference only has
// to denote the target language; the student still builds a DFA or NFA. Every
// reference language is pinned by an explicit accept/reject string table in
// bank.test.ts, so a mis-authored regex fails the suite before it can ship. The
// counting reference (dfa-even-as) is pinned past one a on both sides of the parity
// so a subtly wrong regex cannot pass.
//
// The set is curated, not generated: correct, well-chosen feedback matters more
// than volume for the first release. The array is plain data and extends trivially.
export const CHALLENGES: readonly Exercise[] = [
  {
    id: 'dfa-ends-ab',
    type: 'dfa',
    prompt: 'Build a DFA over Σ = {a, b} that accepts exactly the strings ending in "ab".',
    alphabet: ['a', 'b'],
    reference: '(a + b)*ab',
  },
  {
    id: 'dfa-even-as',
    type: 'dfa',
    prompt: 'Build a DFA over Σ = {a, b} that accepts exactly the strings with an even number of a’s.',
    alphabet: ['a', 'b'],
    reference: 'b*(ab*ab*)*',
  },
  {
    id: 'nfa-contains-aa',
    type: 'nfa',
    prompt: 'Build an NFA over Σ = {a, b} that accepts exactly the strings containing "aa".',
    alphabet: ['a', 'b'],
    reference: '(a + b)*aa(a + b)*',
  },
  {
    id: 'nfa-starts-a',
    type: 'nfa',
    prompt: 'Build an NFA over Σ = {a, b} that accepts exactly the strings starting with "a".',
    alphabet: ['a', 'b'],
    reference: 'a(a + b)*',
  },
  {
    id: 'regex-ends-b',
    type: 'regex',
    prompt: 'Write a regular expression over Σ = {a, b} for the strings ending in "b".',
    alphabet: ['a', 'b'],
    reference: '(a + b)*b',
  },
]
