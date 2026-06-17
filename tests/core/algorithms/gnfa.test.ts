import { describe, it, expect } from 'vitest'
import { parse } from '@/core/regex/parser'
import { formatRegex } from '@/notation/format'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateNFA, simulateDFA } from '@/core/algorithms/simulate'
import { assertNFAValid } from '../../utils'
import {
  nfaToRegex,
  buildGNFA,
  simplify,
  toRegexNode,
  canonical,
  lambda,
  emptyset,
  sym,
  concat,
  union,
  star,
  GNFA_START,
  GNFA_ACCEPT,
  type GnfaLabel,
  type NfaToRegexResult,
} from '@/core/algorithms/gnfa'
import { NFA } from '@/core/automata/types'

// Unit suite for GNFA state elimination (NFA -> regex, Theorem 4.18) and the
// automata-correctness skill invariants it must honor.
//
// THE METHOD (skill, "How to verify an automaton is correct"): never eyeball,
// never compare regex shapes, never compile to a JS RegExp. Decide LANGUAGE
// equivalence. The produced regex is checked by running it back through the real
// pipeline parse-free: toRegexNode(label) -> buildNFA -> nfaToDFA -> simulateDFA,
// and comparing acceptance against the source NFA over an exhaustive bounded
// string battery. A regex's exact form varies with elimination order (06-RESEARCH
// Anti-Pattern); only its language is the contract.

const SYMBOLS = ['a', 'b'] as const

// Every string over SYMBOLS with length in [0, maxLength], enumerated in full.
// Copied from minimize.property.test.ts: this is a DECISION over the bounded
// language (full enumeration), not a probabilistic sample. Length 6 over {a, b}
// is 2^0 + ... + 2^6 = 127 strings, long enough to expose a wrong-language bug in
// these small automata and cheap enough to run per case.
function allStringsUpTo(symbols: readonly string[], maxLength: number): string[] {
  const out: string[] = ['']
  let frontier: string[] = ['']
  for (let len = 1; len <= maxLength; len++) {
    const next: string[] = []
    for (const prefix of frontier) {
      for (const s of symbols) {
        const word = prefix + s
        out.push(word)
        next.push(word)
      }
    }
    frontier = next
  }
  return out
}

const BATTERY = allStringsUpTo(SYMBOLS, 6)

// Decide whether the produced regex accepts s, via the skill's equivalence path:
// the empty language accepts nothing; otherwise convert the final RegexNode to a
// DFA and simulate. NEVER `new RegExp` (threat T-03-04 / skill testing rule).
function acceptsViaRegex(result: NfaToRegexResult, s: string): boolean {
  if (result.isEmptyLanguage) return false
  return simulateDFA(nfaToDFA(buildNFA(result.regex!)), s).accepted
}

// Assert the produced regex's language equals the source NFA's language over the
// full battery. This is the only correctness claim the suite makes about a
// produced regex: equal languages, decided by simulate, not equal strings.
function assertSameLanguageAsSource(result: NfaToRegexResult, source: NFA): void {
  for (const s of BATTERY) {
    expect(acceptsViaRegex(result, s)).toBe(simulateNFA(source, s).accepted)
  }
}

// Decide whether a GnfaLabel (never emptyset) accepts s, by converting to a
// RegexNode and running the same pipeline. Used by the identity tests to show a
// simplified label denotes the same language as the original.
function labelAccepts(label: GnfaLabel, s: string): boolean {
  return simulateDFA(nfaToDFA(buildNFA(toRegexNode(label))), s).accepted
}

// Two non-emptyset labels denote the same language iff acceptance agrees on every
// battery string. The whole point of the identity tests: simplify() preserves L().
function labelsSameLanguage(a: GnfaLabel, b: GnfaLabel): boolean {
  for (const s of BATTERY) {
    if (labelAccepts(a, s) !== labelAccepts(b, s)) return false
  }
  return true
}

describe('GNFA construction (buildGNFA, N2R-01)', () => {
  it('adds a fresh START and ACCEPT wired with lambda-edges, distinct from input ids', () => {
    // q0 is the only state and it accepts: L = {lambda}.
    const nfa: NFA = {
      states: [{ id: 'q0' }],
      transitions: [],
      startState: 'q0',
      acceptStates: ['q0'],
      alphabet: new Set<string>(),
    }
    assertNFAValid(nfa)

    const build = buildGNFA(nfa)

    // START and ACCEPT are present, distinct from each other and from q0.
    expect(build.states).toContain(GNFA_START)
    expect(build.states).toContain(GNFA_ACCEPT)
    expect(build.states).toContain('q0')
    expect(GNFA_START).not.toBe(GNFA_ACCEPT)
    expect(GNFA_START).not.toBe('q0')
    expect(GNFA_ACCEPT).not.toBe('q0')
    expect(build.start).toBe(GNFA_START)
    expect(build.accept).toBe(GNFA_ACCEPT)

    // START --lambda--> old start (q0), and old accept (q0) --lambda--> ACCEPT.
    expect(canonical(build.store.get(GNFA_START)!.get('q0')!)).toBe(canonical(lambda()))
    expect(canonical(build.store.get('q0')!.get(GNFA_ACCEPT)!)).toBe(canonical(lambda()))
  })

  it('unions parallel edges q0--a-->q1 and q0--b-->q1 into a single a+b label (Pitfall 3)', () => {
    const nfa: NFA = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [
        { from: 'q0', to: 'q1', symbol: 'a' },
        { from: 'q0', to: 'q1', symbol: 'b' },
      ],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a', 'b']),
    }

    const build = buildGNFA(nfa)
    const label = build.store.get('q0')!.get('q1')!

    // The two parallel edges must combine to union(a, b), never overwrite. canonical
    // is structural; simplify sorts union operands so a+b and b+a share one key.
    expect(canonical(label)).toBe(canonical(simplify(union(sym('a'), sym('b')))))
  })
})

describe('elimination formula and self-loop (nfaToRegex, N2R-01)', () => {
  // The formula R_ij + R_iq (R_qq)* R_qj is exercised by language, not by reading
  // the produced string. Each case asserts the produced regex's language equals the
  // source NFA's over the whole battery.

  it('self-loop q0 --a--> q0 (q0 accept) yields the language a* (Pitfall 1)', () => {
    // A missing self-loop reads as emptyset and star(emptyset) collapses to lambda;
    // a present self-loop must contribute (R_qq)* faithfully. Here R_qq = a, so the
    // language is a*. Decided over the battery, never by checking the string "a*".
    const nfa: NFA = {
      states: [{ id: 'q0' }],
      transitions: [{ from: 'q0', to: 'q0', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q0'],
      alphabet: new Set(['a']),
    }

    const result = nfaToRegex(nfa)
    expect(result.isEmptyLanguage).toBe(false)
    assertSameLanguageAsSource(result, nfa)
    // Spot the semantics explicitly: lambda and a and aaaa in, b out.
    expect(acceptsViaRegex(result, '')).toBe(true)
    expect(acceptsViaRegex(result, 'a')).toBe(true)
    expect(acceptsViaRegex(result, 'aaaa')).toBe(true)
    expect(acceptsViaRegex(result, 'b')).toBe(false)
  })

  it('concatenation NFA q0--a-->q1--b-->q2 (q2 accept) yields the language of ab', () => {
    const nfa: NFA = {
      states: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }],
      transitions: [
        { from: 'q0', to: 'q1', symbol: 'a' },
        { from: 'q1', to: 'q2', symbol: 'b' },
      ],
      startState: 'q0',
      acceptStates: ['q2'],
      alphabet: new Set(['a', 'b']),
    }

    const result = nfaToRegex(nfa)
    assertSameLanguageAsSource(result, nfa)
    expect(acceptsViaRegex(result, 'ab')).toBe(true)
    expect(acceptsViaRegex(result, 'a')).toBe(false)
    expect(acceptsViaRegex(result, 'abb')).toBe(false)
  })

  it('two-branch NFA (q0--a-->q1, q0--b-->q1, q1 accept) yields the language a+b', () => {
    const nfa: NFA = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [
        { from: 'q0', to: 'q1', symbol: 'a' },
        { from: 'q0', to: 'q1', symbol: 'b' },
      ],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a', 'b']),
    }

    const result = nfaToRegex(nfa)
    assertSameLanguageAsSource(result, nfa)
    expect(acceptsViaRegex(result, 'a')).toBe(true)
    expect(acceptsViaRegex(result, 'b')).toBe(true)
    expect(acceptsViaRegex(result, '')).toBe(false)
    expect(acceptsViaRegex(result, 'ab')).toBe(false)
  })
})

describe('simplify identities are language-preserving (N2R-03)', () => {
  // Each identity asserts simplify(input) denotes the SAME language as input. For
  // the cases where both sides reduce to a concrete regex, that is checked over the
  // battery. For the cases whose result is exactly lambda or the empty language,
  // the canonical glyph is asserted too, because those two atoms cannot be told
  // apart by a battery alone (the empty language and {lambda} differ only on lambda
  // itself, and labelAccepts can render lambda but not emptyset) -- pinning the
  // glyph is the honest way to prove "= lambda" vs "= empty language" here.

  it('R + empty-language = R (empty language is the union identity)', () => {
    const r = sym('a')
    const input = union(r, emptyset())
    const out = simplify(input)
    expect(canonical(out)).toBe(canonical(r))
    expect(labelsSameLanguage(out, r)).toBe(true)
  })

  it('empty-language . R = empty-language (annihilates concatenation on the left)', () => {
    const out = simplify(concat(emptyset(), sym('a')))
    // No battery: the empty language is exactly the empty-set glyph, accepts nothing.
    expect(canonical(out)).toBe(canonical(emptyset()))
  })

  it('R . empty-language = empty-language (annihilates concatenation on the right)', () => {
    const out = simplify(concat(sym('a'), emptyset()))
    expect(canonical(out)).toBe(canonical(emptyset()))
  })

  it('lambda . R = R (lambda is the concatenation identity)', () => {
    const r = sym('a')
    const out = simplify(concat(lambda(), r))
    expect(canonical(out)).toBe(canonical(r))
    expect(labelsSameLanguage(out, r)).toBe(true)
  })

  it('R . lambda = R (lambda is the concatenation identity, right side)', () => {
    const r = star(sym('b'))
    const out = simplify(concat(r, lambda()))
    expect(labelsSameLanguage(out, r)).toBe(true)
  })

  it('empty-language* = lambda (zero-or-more of nothing is the empty string)', () => {
    const out = simplify(star(emptyset()))
    expect(canonical(out)).toBe(canonical(lambda()))
    // lambda accepts exactly the empty string.
    expect(labelAccepts(out, '')).toBe(true)
    expect(labelAccepts(out, 'a')).toBe(false)
  })

  it('lambda* = lambda (zero-or-more lambdas is still just lambda)', () => {
    const out = simplify(star(lambda()))
    expect(canonical(out)).toBe(canonical(lambda()))
    expect(labelAccepts(out, '')).toBe(true)
    expect(labelAccepts(out, 'a')).toBe(false)
  })

  it('(R*)* = R* (star is idempotent)', () => {
    const inner = star(sym('a'))
    const out = simplify(star(inner))
    expect(labelsSameLanguage(out, inner)).toBe(true)
  })

  it('R + R = R (union is idempotent, decided by canonical)', () => {
    const r = concat(sym('a'), sym('b'))
    const out = simplify(union(r, r))
    expect(labelsSameLanguage(out, r)).toBe(true)
  })
})

describe('worked course examples by equivalence (N2R-01)', () => {
  // Pin a few course-style NFAs and assert the produced regex's language equals the
  // source's. NEVER assert the produced regex string: state-elimination form varies
  // with order (06-RESEARCH Anti-Pattern). The source NFAs here are produced by
  // Thompson construction from known course regexes, then fed BACK through nfaToRegex
  // -- a regex -> NFA -> regex round-trip that must preserve the language.

  const courseRegexes = ['a*', 'a+b', '(a+b)*abb', 'ab', '(ab)*']

  it.each(courseRegexes)('NFA(%s) -> regex preserves the language', (src) => {
    const source = buildNFA(parse(src))
    const result = nfaToRegex(source)
    assertSameLanguageAsSource(result, source)
  })

  it('the (a+b)*abb-shaped NFA accepts exactly strings ending in abb', () => {
    const source = buildNFA(parse('(a+b)*abb'))
    const result = nfaToRegex(source)

    const accept = ['abb', 'aabb', 'babb', 'ababb', 'abababb']
    const reject = ['', 'ab', 'aab', 'aba', 'abba', 'a', 'b']
    accept.forEach((s) => expect(acceptsViaRegex(result, s)).toBe(true))
    reject.forEach((s) => expect(acceptsViaRegex(result, s)).toBe(false))
  })

  it('the produced regex round-trips through formatRegex/parse (Pitfall 6)', () => {
    // The final label converts to a RegexNode; formatting it then re-parsing must
    // return the same AST (format.ts round-trip guarantee). a* produces a clean,
    // parser-safe node (no consecutive quantifiers, no emptyset), so this exercises
    // the conversion -> course-notation -> parse path end to end.
    const source = buildNFA(parse('a*'))
    const result = nfaToRegex(source)
    expect(result.isEmptyLanguage).toBe(false)

    const node = result.regex!
    const courseText = formatRegex(node, 'course')
    expect(parse(courseText)).toEqual(node)
  })
})

describe('empty-language terminal (A5)', () => {
  it('a no-accept NFA yields isEmptyLanguage, regex null, and rejects every battery string', () => {
    const nfa: NFA = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: [],
      alphabet: new Set(['a']),
    }

    const result = nfaToRegex(nfa)
    expect(result.isEmptyLanguage).toBe(true)
    expect(result.regex).toBeNull()
    expect(result.finalLabel.type).toBe('emptyset')

    // The source recognizes the empty language: it rejects everything, and so does
    // the produced result via acceptsViaRegex (which returns false on isEmptyLanguage).
    for (const s of BATTERY) {
      expect(simulateNFA(nfa, s).accepted).toBe(false)
      expect(acceptsViaRegex(result, s)).toBe(false)
    }
  })

  it('toRegexNode throws on the empty language so the isEmptyLanguage guard is mandatory', () => {
    // Converting emptyset is unreachable for any non-empty language, but the throw
    // documents that callers must guard with isEmptyLanguage (Pitfall 5). Pinning it
    // keeps that contract from silently regressing into a wrong RegexNode.
    expect(() => toRegexNode(emptyset())).toThrow(/empty language/i)
  })
})
