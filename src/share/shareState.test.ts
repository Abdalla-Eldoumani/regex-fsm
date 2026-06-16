import { describe, it, expect } from 'vitest'
import { toShareState, applyShareState, type AppShareFields } from './shareState'
import { decodeShareState, encodeShareState } from './shareCodec'

// The App-state <-> ShareState round-trip. The codec's own suite proves
// decode(encode(doc)) reproduces the document field-for-field; this proves the
// NARROWER seam the codec does not cover -- that the App, which holds its alphabet
// as a STRING, round-trips through toShareState -> applyShareState with every
// captured field intact, including the empty-alphabet auto-derive boundary where a
// naive string<->array conversion would either invent a [''] symbol or drop a real
// one. These two failures are the T-12-20 lossy-conversion threat; the cases below
// pin both shut.

describe('toShareState -> applyShareState round-trip', () => {
  it('restores every captured field for a representative App state', () => {
    const original: AppShareFields = {
      regex: '(a + b)*abb',
      alphabet: 'ab',
      testString: 'aabb',
      constructionMethod: 'thompson',
      shouldMinimize: true,
      useLetterNames: false,
    }

    const restored = applyShareState(toShareState(original))

    // applyShareState returns null only for an automaton document; a regex
    // document always restores, so this must be non-null.
    expect(restored).not.toBeNull()
    // Field-for-field equality is the lossless claim: regex, alphabet, testString,
    // constructionMethod, shouldMinimize, useLetterNames all survive the boundary.
    expect(restored).toEqual(original)
  })

  it('round-trips the non-default options without coercion', () => {
    // A second representative state with the other construction method and the
    // opposite option flags, so no field is silently pinned to a default.
    const original: AppShareFields = {
      regex: 'a+',
      alphabet: 'abc',
      testString: '',
      constructionMethod: 'brzozowski',
      shouldMinimize: false,
      useLetterNames: true,
    }

    const restored = applyShareState(toShareState(original))

    expect(restored).toEqual(original)
  })

  it('keeps an empty App alphabet empty (the auto-derive boundary)', () => {
    // An empty App alphabet string means the app auto-derives the alphabet from
    // the regex and test string at build time. The captured ShareState alphabet
    // must therefore be exactly the empty array, and applyShareState must restore
    // the same empty App alphabet so auto-derive still drives it.
    const original: AppShareFields = {
      regex: 'ab',
      alphabet: '',
      testString: '',
      constructionMethod: 'thompson',
      shouldMinimize: true,
      useLetterNames: false,
    }

    const doc = toShareState(original)

    // The captured alphabet is the empty array: no stray '' symbol (an off-by-one
    // that would later read as a one-symbol alphabet) and nothing invented.
    expect(doc.alphabet).toEqual([])
    expect(doc.alphabet).toHaveLength(0)

    const restored = applyShareState(doc)
    expect(restored).not.toBeNull()
    // The restored App alphabet is the same empty string, so the observable App
    // state is unchanged and auto-derive behaves identically.
    expect(restored!.alphabet).toBe('')
    expect(restored).toEqual(original)
  })

  it('does not drop a real derived symbol on the way back', () => {
    // The complement of the empty case: a populated alphabet must round-trip every
    // symbol, in order, with no loss.
    const original: AppShareFields = {
      regex: '0(0 + 1)*1',
      alphabet: '01',
      testString: '0011',
      constructionMethod: 'asu',
      shouldMinimize: true,
      useLetterNames: false,
    }

    const doc = toShareState(original)
    expect(doc.alphabet).toEqual(['0', '1'])

    const restored = applyShareState(doc)
    expect(restored!.alphabet).toBe('01')
  })

  it('survives a full encode -> decode -> apply trip through the wire format', () => {
    // The end-to-end path a shared URL actually takes: App fields -> ShareState ->
    // compressed string -> validated ShareState -> App fields. Proves the seam
    // composes with the codec, not just with itself.
    const original: AppShareFields = {
      regex: '(a + b)*',
      alphabet: 'ab',
      testString: 'abab',
      constructionMethod: 'thompson',
      shouldMinimize: false,
      useLetterNames: true,
    }

    const encoded = encodeShareState(toShareState(original))
    const decoded = decodeShareState(encoded)
    expect(decoded).not.toBeNull()
    const restored = applyShareState(decoded!)
    expect(restored).toEqual(original)
  })

  it('returns null for an automaton document so the caller applies that surface', () => {
    // applyShareState only reconstructs the regex scratchpad; an automaton document
    // carries a quintuple, not a regex, so the regex-field restore is correctly a
    // no-op (null) and the automaton apply path handles it instead.
    const restored = applyShareState({
      v: 1,
      kind: 'automaton',
      states: [{ id: 'q0' }],
      alphabet: ['a'],
      transitions: [{ from: 'q0', to: 'q0', symbol: 'a' }],
      start: 'q0',
      accept: ['q0'],
    })
    expect(restored).toBeNull()
  })
})
