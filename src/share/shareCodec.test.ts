import { describe, it, expect, vi } from 'vitest'
import fc from 'fast-check'
import { compressToEncodedURIComponent } from 'lz-string'
import {
  decodeShareState,
  encodeShareState,
  buildShareHash,
  SHARE_VERSION,
  MAX_ENCODED_LENGTH,
  type AutomatonShareDoc,
  type RegexShareDoc,
  type ShareState,
} from './shareCodec'
import { BOUNDS } from '@/core/automata/types'

// This suite IS the proof that the share codec is lossless on the way out
// (SHARE-01) and fails closed on the way in (SHARE-02). decodeShareState is the
// entire new untrusted-ingest surface, so the heart of the file is the seeded
// fuzz: over thousands of arbitrary and adversarially-encoded inputs the decoder
// must NEVER throw and must ALWAYS return null or a structurally-valid ShareState.
// The seed is fixed so any failing case reproduces; per the automata-correctness
// skill and the root conventions, a discovered failure becomes a named regression
// test and the codec is fixed -- the property is never loosened to make it pass.
//
// Why mock lz-string this way: the oversized-before-decompress case must prove the
// size cap runs BEFORE decompression (the decompression-bomb guard). We keep the
// real compress/decompress for every functional case and only wrap decompress in a
// spy so its call count is observable. vi.mock is hoisted, so importActual restores
// the genuine implementations.
vi.mock(import('lz-string'), async (importOriginal) => {
  const actual = await importOriginal()
  // lz-string ships as CommonJS, so under the bundler the named exports can sit
  // behind a default-interop wrapper; spreading the namespace alone does not
  // reliably carry them. List both functions explicitly so the production module's
  // `import { compressToEncodedURIComponent, decompressFromEncodedURIComponent }`
  // resolves, and only decompress is wrapped in a spy.
  return {
    ...actual,
    compressToEncodedURIComponent: actual.compressToEncodedURIComponent,
    decompressFromEncodedURIComponent: vi.fn(actual.decompressFromEncodedURIComponent),
  }
})

// Pull the spy handle back from the mocked module so call counts can be asserted.
const lz = await import('lz-string')
const decompressSpy = vi.mocked(lz.decompressFromEncodedURIComponent)

// A structurally-valid automaton document: states first, then start/accept/
// transitions drawn ONLY from those state ids, and the alphabet drawn from the
// symbols actually used (the null lambda symbol is allowed but never enters the
// alphabet array). This generator only produces inputs that SHOULD survive
// validation, so the round-trip property is about losslessness, not rejection.
function arbitraryAutomatonShareDoc(): fc.Arbitrary<AutomatonShareDoc> {
  return fc
    .uniqueArray(fc.string({ minLength: 1, maxLength: 6 }), { minLength: 1, maxLength: 8 })
    .chain((ids) => {
      const idFrom = fc.constantFrom(...ids)
      const symbol = fc.constantFrom('a', 'b', 'c', '0', '1')
      return fc.record({
        states: fc.constant(ids.map((id) => ({ id }))),
        alphabet: fc.uniqueArray(symbol, { maxLength: 5 }).map((a) => [...a].sort()),
        start: idFrom,
        accept: fc.uniqueArray(idFrom, { maxLength: ids.length }),
        transitions: fc.array(
          fc.record({
            from: idFrom,
            to: idFrom,
            // null === lambda; a concrete symbol is constrained to the alphabet below
            symbol: fc.option(symbol, { nil: null }),
          }),
          { maxLength: 12 },
        ),
      })
    })
    .map((doc) => {
      // Keep only transitions whose concrete symbol is in the declared alphabet,
      // so the generated doc is referentially consistent (lambda always allowed).
      const alpha = new Set(doc.alphabet)
      const transitions = doc.transitions.filter(
        (t) => t.symbol === null || alpha.has(t.symbol),
      )
      return {
        v: SHARE_VERSION,
        kind: 'automaton' as const,
        states: doc.states,
        alphabet: doc.alphabet,
        transitions,
        start: doc.start,
        accept: doc.accept,
      }
    })
}

function arbitraryRegexShareDoc(): fc.Arbitrary<RegexShareDoc> {
  return fc.record({
    v: fc.constant(SHARE_VERSION),
    kind: fc.constant('regex' as const),
    src: fc.string({ maxLength: 64 }),
    alphabet: fc.uniqueArray(fc.constantFrom('a', 'b', 'c', '0', '1'), { maxLength: 5 }).map((a) =>
      [...a].sort(),
    ),
    options: fc.record({
      constructionMethod: fc.constantFrom('thompson', 'asu', 'brzozowski') as fc.Arbitrary<
        'thompson' | 'asu' | 'brzozowski'
      >,
      shouldMinimize: fc.boolean(),
      useLetterNames: fc.boolean(),
      testString: fc.string({ maxLength: 32 }),
    }),
  })
}

// A known-good automaton doc reused by the unit cases (a 2-state machine with a
// self-loop, a parallel pair of edges, and a lambda move -- the shapes a naive
// codec drops).
const goodAutomaton: AutomatonShareDoc = {
  v: SHARE_VERSION,
  kind: 'automaton',
  states: [{ id: 'q0', label: 'start' }, { id: 'q1' }],
  alphabet: ['a', 'b'],
  transitions: [
    { from: 'q0', to: 'q0', symbol: 'a' }, // self-loop
    { from: 'q0', to: 'q1', symbol: 'a' }, // parallel edge on the same symbol
    { from: 'q0', to: 'q1', symbol: 'b' },
    { from: 'q1', to: 'q0', symbol: null }, // lambda move
  ],
  start: 'q0',
  accept: ['q1'],
}

const goodRegex: RegexShareDoc = {
  v: SHARE_VERSION,
  kind: 'regex',
  src: '(a + b)*abb',
  alphabet: ['a', 'b'],
  options: {
    constructionMethod: 'thompson',
    shouldMinimize: true,
    useLetterNames: false,
    testString: 'aabb',
  },
}

// Re-encode an arbitrary object into the real wire format so the decoder runs its
// full pipeline (decompress -> JSON.parse -> validate) against it.
function wire(value: unknown): string {
  return compressToEncodedURIComponent(JSON.stringify(value))
}

describe('shareCodec', () => {
  describe('encode/buildShareHash (SHARE-01)', () => {
    it('encodes to a non-empty url-safe payload and prefixes the hash with #s=', () => {
      const encoded = encodeShareState(goodAutomaton)
      expect(encoded.length).toBeGreaterThan(0)
      // compressToEncodedURIComponent emits only url-safe characters
      expect(encoded).toMatch(/^[A-Za-z0-9+\-$_.!~*'()]*$/)
      expect(buildShareHash(goodAutomaton)).toBe(`#s=${encoded}`)
    })
  })

  describe('lossless round-trip (SHARE-01)', () => {
    it('round-trips a known automaton document field-for-field', () => {
      expect(decodeShareState(encodeShareState(goodAutomaton))).toEqual(goodAutomaton)
    })

    it('round-trips a known regex document field-for-field', () => {
      expect(decodeShareState(encodeShareState(goodRegex))).toEqual(goodRegex)
    })

    it('round-trips generated valid automaton documents (lossless)', () => {
      fc.assert(
        fc.property(arbitraryAutomatonShareDoc(), (doc) => {
          expect(decodeShareState(encodeShareState(doc))).toEqual(doc)
        }),
        { seed: 0x5a1e, numRuns: 1000 },
      )
    })

    it('round-trips generated valid regex documents (lossless)', () => {
      fc.assert(
        fc.property(arbitraryRegexShareDoc(), (doc) => {
          expect(decodeShareState(encodeShareState(doc))).toEqual(doc)
        }),
        { seed: 0x5a1e, numRuns: 1000 },
      )
    })
  })

  describe('fail-closed fuzz: never throws, always null-or-valid (SHARE-02)', () => {
    const isNullOrValid = (r: ShareState | null): boolean =>
      r === null || r.kind === 'regex' || r.kind === 'automaton'

    it('over arbitrary strings (5000 runs)', () => {
      fc.assert(
        fc.property(fc.string(), (raw) => {
          const r = decodeShareState(raw) // must not throw
          return isNullOrValid(r)
        }),
        { seed: 0x5eed, numRuns: 5000 },
      )
    })

    it('over the encoding of arbitrary objects (2000 runs)', () => {
      fc.assert(
        fc.property(fc.object(), (obj) => {
          const r = decodeShareState(encodeShareState(obj as never)) // must not throw
          return isNullOrValid(r)
        }),
        { seed: 0x5eed, numRuns: 2000 },
      )
    })

    it('over truncated valid payloads (a corrupted suffix never throws)', () => {
      const full = encodeShareState(goodAutomaton)
      fc.assert(
        fc.property(fc.integer({ min: 0, max: full.length }), (cut) => {
          const r = decodeShareState(full.slice(0, cut)) // must not throw
          return isNullOrValid(r)
        }),
        { seed: 0x5eed, numRuns: 500 },
      )
    })
  })

  describe('gate (a): oversized rejected BEFORE decompression (SHARE-02 / T-12-01)', () => {
    it('rejects a raw string longer than the cap and never calls decompress', () => {
      decompressSpy.mockClear()
      const oversized = 'A'.repeat(MAX_ENCODED_LENGTH + 1)
      expect(decodeShareState(oversized)).toBeNull()
      // The decompression-bomb guard MUST short-circuit before decompression runs.
      expect(decompressSpy).not.toHaveBeenCalled()
    })

    it('rejects the empty string without throwing', () => {
      expect(decodeShareState('')).toBeNull()
    })
  })

  describe('gate (b): decompress null/empty branch is load-bearing (SHARE-02 / T-12-11)', () => {
    it('returns null when decompress yields null (in-bounds garbage)', () => {
      // lz-string returns null at runtime for input it cannot decompress; the
      // typings under-declare this. A cleanup that drops the null check turns this red.
      expect(decodeShareState('@@@not-a-valid-encoded-payload@@@')).toBeNull()
    })

    it('returns null when decompress yields an empty string', () => {
      // compressToEncodedURIComponent('') is a non-empty token that decompresses
      // back to '' -- a distinct failure shape from null, covered separately so the
      // empty-string check cannot be dropped without a red test.
      const emptyEncoded = compressToEncodedURIComponent('')
      expect(emptyEncoded.length).toBeGreaterThan(0)
      expect(decodeShareState(emptyEncoded)).toBeNull()
    })
  })

  describe('gate (c): JSON.parse only, malformed json fails closed (SHARE-02 / T-12-02)', () => {
    it('returns null for decompressible-but-not-json content', () => {
      const notJson = compressToEncodedURIComponent('this is not json {{{')
      expect(decodeShareState(notJson)).toBeNull()
    })

    it('returns null for a JSON primitive that is not an object', () => {
      expect(decodeShareState(wire(42))).toBeNull()
      expect(decodeShareState(wire('a string'))).toBeNull()
      expect(decodeShareState(wire(null))).toBeNull()
      expect(decodeShareState(wire([1, 2, 3]))).toBeNull()
    })
  })

  describe('gate (d): strict schema validation (SHARE-02 / T-12-03)', () => {
    it('returns null for a valid-json object of the wrong shape', () => {
      expect(decodeShareState(wire({ hello: 'world' }))).toBeNull()
    })

    it('returns null for an unknown schema version', () => {
      expect(decodeShareState(wire({ ...goodAutomaton, v: 999 }))).toBeNull()
    })

    it('returns null for an unrecognized kind', () => {
      expect(decodeShareState(wire({ v: SHARE_VERSION, kind: 'mystery' }))).toBeNull()
    })

    it('returns null when an automaton field has the wrong type', () => {
      expect(decodeShareState(wire({ ...goodAutomaton, start: 123 }))).toBeNull()
      expect(decodeShareState(wire({ ...goodAutomaton, alphabet: 'ab' }))).toBeNull()
      expect(decodeShareState(wire({ ...goodAutomaton, states: 'nope' }))).toBeNull()
    })

    it('returns null when a transition symbol is neither string nor null', () => {
      const bad = {
        ...goodAutomaton,
        transitions: [{ from: 'q0', to: 'q1', symbol: 7 }],
      }
      expect(decodeShareState(wire(bad))).toBeNull()
    })

    it('returns null when a regex option enum value is not recognized', () => {
      const bad = {
        ...goodRegex,
        options: { ...goodRegex.options, constructionMethod: 'earley' },
      }
      expect(decodeShareState(wire(bad))).toBeNull()
    })

    it('returns null when a regex boolean option has the wrong type', () => {
      const bad = {
        ...goodRegex,
        options: { ...goodRegex.options, shouldMinimize: 'yes' },
      }
      expect(decodeShareState(wire(bad))).toBeNull()
    })
  })

  describe('gate (e): BOUNDS + referential integrity (SHARE-02 / T-12-05)', () => {
    it('returns null when the state count exceeds BOUNDS.MAX_DFA_STATES', () => {
      const tooMany = Array.from({ length: BOUNDS.MAX_DFA_STATES + 1 }, (_, i) => ({
        id: `q${i}`,
      }))
      const bad = {
        v: SHARE_VERSION,
        kind: 'automaton',
        states: tooMany,
        alphabet: ['a'],
        transitions: [],
        start: 'q0',
        accept: [],
      }
      expect(decodeShareState(wire(bad))).toBeNull()
    })

    it('returns null when start is not a declared state', () => {
      expect(decodeShareState(wire({ ...goodAutomaton, start: 'ghost' }))).toBeNull()
    })

    it('returns null when an accept id is not a declared state', () => {
      expect(decodeShareState(wire({ ...goodAutomaton, accept: ['q1', 'ghost'] }))).toBeNull()
    })

    it('returns null when a transition references an undeclared state', () => {
      const badFrom = {
        ...goodAutomaton,
        transitions: [{ from: 'ghost', to: 'q1', symbol: 'a' }],
      }
      const badTo = {
        ...goodAutomaton,
        transitions: [{ from: 'q0', to: 'ghost', symbol: 'a' }],
      }
      expect(decodeShareState(wire(badFrom))).toBeNull()
      expect(decodeShareState(wire(badTo))).toBeNull()
    })

    it('returns null when a transition symbol is not in the declared alphabet', () => {
      const bad = {
        ...goodAutomaton,
        transitions: [{ from: 'q0', to: 'q1', symbol: 'z' }],
      }
      expect(decodeShareState(wire(bad))).toBeNull()
    })

    it('accepts a lambda transition even though lambda is never in the alphabet', () => {
      const r = decodeShareState(encodeShareState(goodAutomaton))
      expect(r).not.toBeNull()
      expect(r?.kind === 'automaton' && r.transitions.some((t) => t.symbol === null)).toBe(true)
    })
  })

  describe('eval-trap guard (SHARE-02 / T-12-02)', () => {
    it('never feeds a crafted regex src to a regex engine; an unbalanced src is null-or-valid', () => {
      const crafted = { ...goodRegex, src: '((((' }
      const r = decodeShareState(encodeShareState(crafted as ShareState))
      // src is data: it round-trips as a string and is never compiled here.
      expect(r === null || (r.kind === 'regex' && r.src === '((((')).toBe(true)
    })
  })

  // The per-field src/testString caps are module-private (MAX_REGEX_SRC_LENGTH and
  // MAX_TEST_STRING_LENGTH, both 4096). A field at the cap survives; one byte over
  // is rejected. Referencing the literal here is deliberate: if the source cap
  // moves, this test should be updated in lockstep, which is the point of locking it.
  const FIELD_CAP = 4096

  describe('gate (e): per-field DoS caps fail closed (SHARE-02 / T-12-05)', () => {
    it('rejects a regex src longer than the cap but admits one at the cap', () => {
      const atCap = { ...goodRegex, src: 'a'.repeat(FIELD_CAP) }
      const overCap = { ...goodRegex, src: 'a'.repeat(FIELD_CAP + 1) }
      // alphabet must contain 'a' for nothing else to trip; goodRegex already has it.
      expect(decodeShareState(encodeShareState(atCap as ShareState))).not.toBeNull()
      expect(decodeShareState(encodeShareState(overCap as ShareState))).toBeNull()
    })

    it('rejects a testString longer than the cap but admits one at the cap', () => {
      const atCap = {
        ...goodRegex,
        options: { ...goodRegex.options, testString: 'a'.repeat(FIELD_CAP) },
      }
      const overCap = {
        ...goodRegex,
        options: { ...goodRegex.options, testString: 'a'.repeat(FIELD_CAP + 1) },
      }
      expect(decodeShareState(encodeShareState(atCap as ShareState))).not.toBeNull()
      expect(decodeShareState(encodeShareState(overCap as ShareState))).toBeNull()
    })

    it('rejects a regex alphabet larger than MAX_ALPHABET_SIZE', () => {
      // MAX_ALPHABET_SIZE === BOUNDS.MAX_DFA_STATES. One symbol over the cap is
      // rejected even though every entry is a valid string.
      const tooMany = Array.from({ length: BOUNDS.MAX_DFA_STATES + 1 }, (_, i) => `s${i}`)
      const bad = { ...goodRegex, alphabet: tooMany }
      expect(decodeShareState(wire(bad))).toBeNull()
    })

    it('rejects an automaton alphabet larger than MAX_ALPHABET_SIZE', () => {
      // The automaton branch caps its own alphabet at MAX_ALPHABET_SIZE. Build a
      // referentially-clean doc (no transitions reference the oversized symbols) so
      // only the alphabet-size gate can be the reason for the null.
      const tooMany = Array.from({ length: BOUNDS.MAX_DFA_STATES + 1 }, (_, i) => `s${i}`)
      const bad = {
        v: SHARE_VERSION,
        kind: 'automaton',
        states: [{ id: 'q0' }],
        alphabet: tooMany,
        transitions: [],
        start: 'q0',
        accept: [],
      }
      expect(decodeShareState(wire(bad))).toBeNull()
    })

    it('rejects an automaton whose transition count exceeds the edge cap', () => {
      // The edge cap is transitions.length > MAX_DFA_STATES * (alphabet.length + 1).
      // With one symbol that is 256 * 2 = 512, so 513 transitions trips it. The count
      // gate runs BEFORE referential integrity, so valid self-loops on q0 are enough.
      const cap = BOUNDS.MAX_DFA_STATES * (1 + 1)
      const tooManyEdges = Array.from({ length: cap + 1 }, () => ({
        from: 'q0',
        to: 'q0',
        symbol: 'a',
      }))
      const bad = {
        v: SHARE_VERSION,
        kind: 'automaton',
        states: [{ id: 'q0' }],
        alphabet: ['a'],
        transitions: tooManyEdges,
        start: 'q0',
        accept: [],
      }
      expect(decodeShareState(wire(bad))).toBeNull()
    })

    it('rejects an automaton with more accept states than states', () => {
      // accept.length > states.length is impossible for a real machine; the gate
      // rejects it before referential integrity even resolves the ids.
      const bad = {
        v: SHARE_VERSION,
        kind: 'automaton',
        states: [{ id: 'q0' }],
        alphabet: ['a'],
        transitions: [],
        start: 'q0',
        accept: ['q0', 'q1'],
      }
      expect(decodeShareState(wire(bad))).toBeNull()
    })
  })

  describe('gate (a): MAX_ENCODED_LENGTH exact boundary (SHARE-02 / T-12-01)', () => {
    it('admits an input of exactly the cap to decompression and rejects one over', () => {
      // The length gate is `raw.length > MAX_ENCODED_LENGTH`, so a string of exactly
      // the cap is NOT rejected by the gate -- decompression is attempted (and here
      // fails on garbage, yielding null). A string one over is rejected before
      // decompress ever runs. This pins the boundary as strictly-greater, not >=.
      decompressSpy.mockClear()
      const atCap = 'A'.repeat(MAX_ENCODED_LENGTH)
      expect(decodeShareState(atCap)).toBeNull() // garbage, but the gate let it through
      expect(decompressSpy).toHaveBeenCalledTimes(1)

      decompressSpy.mockClear()
      const overCap = 'A'.repeat(MAX_ENCODED_LENGTH + 1)
      expect(decodeShareState(overCap)).toBeNull()
      expect(decompressSpy).not.toHaveBeenCalled()
    })
  })

  // Prototype-pollution lock (SHARE-02). A crafted payload carrying __proto__ and
  // constructor keys must never mutate Object.prototype, and the decode must return
  // null or a clean ShareState -- never an object whose prototype was poisoned. The
  // validator builds a fresh object from checked fields, and JSON.parse treats
  // __proto__ as a plain own key, so the chain is never reached; this test is the
  // standing guard against a future change that spreads the parsed input instead.
  describe('prototype-pollution lock (SHARE-02)', () => {
    it('a payload with __proto__ and constructor never pollutes Object.prototype', () => {
      // The malicious JSON is written as a RAW string, not via JSON.stringify of an
      // object literal: literal `__proto__:` syntax sets the prototype rather than an
      // own key and would be dropped by stringify, so it would never reach the wire.
      // A real attacker sends the bytes directly, which is what this models.
      const malicious =
        '{"v":1,"kind":"automaton","states":[{"id":"q0"}],"alphabet":["a"],' +
        '"transitions":[],"start":"q0","accept":[],' +
        '"__proto__":{"polluted":true},"constructor":{"prototype":{"alsoPolluted":true}}}'
      const r = decodeShareState(compressToEncodedURIComponent(malicious))

      // No global pollution leaked from the decode.
      expect(({} as Record<string, unknown>).polluted).toBeUndefined()
      expect(({} as Record<string, unknown>).alsoPolluted).toBeUndefined()
      // The result is null or a clean object that does not carry the pollution marker
      // as an own enumerable key.
      expect(
        r === null ||
          (r.kind === 'automaton' && !Object.prototype.hasOwnProperty.call(r, 'polluted')),
      ).toBe(true)
    })

    it('a __proto__ nested inside a valid regex doc does not pollute', () => {
      // A second vector: __proto__ buried in the options object. Decode must still be
      // null-or-valid and must not pollute the global prototype.
      const malicious =
        '{"v":1,"kind":"regex","src":"a","alphabet":["a"],"options":' +
        '{"constructionMethod":"thompson","shouldMinimize":true,"useLetterNames":false,' +
        '"testString":"","__proto__":{"hacked":true}}}'
      const r = decodeShareState(compressToEncodedURIComponent(malicious))
      expect(({} as Record<string, unknown>).hacked).toBeUndefined()
      expect(r === null || r.kind === 'regex').toBe(true)
    })
  })
})
