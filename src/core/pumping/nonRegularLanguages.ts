// The non-regular language library. Each language is a membership PREDICATE,
// not an automaton, because none of these languages is regular: no finite
// automaton recognizes them, so a predicate is the only correct representation
// (automata-correctness SKILL: do not model a non-regular language as a DFA/NFA).
//
// The predicate is the oracle for the pumping game's contradiction. The game
// never asserts "xy^i z is not in L"; it runs member() on the built string and
// believes only what the predicate returns (automata-correctness invariant 8).
// So these predicates must be exactly right against the course definitions.
//
// Course alignment: the PDF (regex_and_FSMs.pdf §4.3.2, Example 4.24) proves
// {0^n 1^n | n in N0} non-regular by DFA state-repetition. N0 includes 0, so the
// empty string is in that language. We mirror that convention here: a^n b^n uses
// n >= 0, hence member("") is true. The witnesses are the proven ones from the
// research: a^p b^p for a^n b^n, and a^p b a^p b for ww (Pitfall 2 -- a^p a^p is
// wrong because it stays inside ww under pumping).

/**
 * A non-regular language exposed as a membership predicate plus the metadata the
 * pumping game and the language picker need. Pure, total, deterministic: member
 * is the contradiction oracle and witness is the prover's proven starting word.
 */
export interface NonRegularLanguage {
  /** Stable id for state keying and the picker, e.g. 'an-bn', 'ww', 'an-bn-cn'. */
  id: string
  /** Short course-notation label, e.g. 'aⁿbⁿ', 'ww'. */
  label: string
  /** Course-notation set definition, rendered font-mono in the view. */
  definition: string
  /** Σ for this language. */
  alphabet: ReadonlySet<string>
  /** The oracle: true iff s is in this language. Pure, total, deterministic. */
  member: (s: string) => boolean
  /** A proven word in L with |w| >= p. The prover's recommended witness. */
  witness: (p: number) => string
}

// Count how many of the same character `ch` lead `s` starting at `from`. Used to
// decide a^n b^n without a RegExp: T-08-02 forbids compiling input to RegExp, and
// a literal /^(a*)(b*)$/ would still draw a reviewer flag, so we count by hand.
function leadingRun(s: string, ch: string, from: number): number {
  let i = from
  while (i < s.length && s[i] === ch) i++
  return i - from
}

/**
 * { aⁿbⁿ : n ≥ 0 }. The course's canonical non-regular language (§4.3.2 uses the
 * 0/1 form). n ≥ 0 means λ ∈ L (the n = 0 case), so member("") is true.
 */
export const anbn: NonRegularLanguage = {
  id: 'an-bn',
  label: 'aⁿbⁿ',
  definition: '{ aⁿbⁿ : n ≥ 0 }',
  alphabet: new Set(['a', 'b']),
  // Count a run of 'a' then a run of 'b'; accept iff the two runs are equal in
  // length AND together cover the whole string. "" gives a=0, b=0, total 0 === 0
  // length, so it is accepted (n = 0). "aab" gives a=2, b=1 -> reject. "ba" has a
  // leading 'b' so the a-run is 0 and the b-run does not reach the end -> reject.
  member: (s: string): boolean => {
    const aCount = leadingRun(s, 'a', 0)
    const bCount = leadingRun(s, 'b', aCount)
    return aCount === bCount && aCount + bCount === s.length
  },
  witness: (p: number): string => `${'a'.repeat(p)}${'b'.repeat(p)}`,
}

/**
 * { uu : u ∈ Σ* } over Σ = {a, b}. ww needs |Σ| ≥ 2: over a single symbol it
 * collapses to { a²ⁿ }, which is regular (Pitfall 2). The proven witness is
 * a^p b a^p b, not a^p a^p, so that |xy| ≤ p forces y into the first a-block and
 * pumping breaks the halves.
 */
export const ww: NonRegularLanguage = {
  id: 'ww',
  label: 'ww',
  definition: '{ uu : u ∈ Σ* }',
  alphabet: new Set(['a', 'b']),
  // Odd length cannot be uu. Even length 2m is in ww iff the first m characters
  // equal the last m. "" is length 0 (even), halves are both "" -> u = λ, accept.
  member: (s: string): boolean => {
    if (s.length % 2 !== 0) return false
    const m = s.length / 2
    return s.slice(0, m) === s.slice(m)
  },
  witness: (p: number): string => `${'a'.repeat(p)}b${'a'.repeat(p)}b`,
}

/**
 * { aⁿbⁿcⁿ : n ≥ 0 }. Optional bonus language (A6). Not regular and not even
 * context-free, but membership is a trivial three-run count. Same n ≥ 0 / λ ∈ L
 * convention as a^n b^n. Witness a^p b^p c^p keeps |xy| ≤ p inside the a-block.
 */
export const anbncn: NonRegularLanguage = {
  id: 'an-bn-cn',
  label: 'aⁿbⁿcⁿ',
  definition: '{ aⁿbⁿcⁿ : n ≥ 0 }',
  alphabet: new Set(['a', 'b', 'c']),
  // Three equal runs a then b then c that cover the whole string. "" gives all
  // zeros and total length 0 -> accept (n = 0). Any out-of-order symbol leaves a
  // later run short of the end, so the coverage check rejects it.
  member: (s: string): boolean => {
    const aCount = leadingRun(s, 'a', 0)
    const bCount = leadingRun(s, 'b', aCount)
    const cCount = leadingRun(s, 'c', aCount + bCount)
    return (
      aCount === bCount &&
      bCount === cCount &&
      aCount + bCount + cCount === s.length
    )
  },
  witness: (p: number): string =>
    `${'a'.repeat(p)}${'b'.repeat(p)}${'c'.repeat(p)}`,
}

/**
 * The languages offered by the pumping game's picker. a^n b^n and ww are the two
 * required (they gate the phase); a^n b^n c^n is the bonus. Every id is unique.
 */
export const NONREGULAR_LANGUAGES: readonly NonRegularLanguage[] = [
  anbn,
  ww,
  anbncn,
]
