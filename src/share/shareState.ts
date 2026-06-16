import type { RegexShareDoc, ShareState } from './shareCodec'
import { SHARE_VERSION } from './shareCodec'

// The App-state <-> ShareState seam. The share codec (shareCodec.ts) owns the
// wire format and the fail-closed validator; this module owns the narrower job of
// turning the home view's regex-scratchpad fields into a RegexShareDoc and back,
// losslessly. It is pure (no DOM, no React, no window) so the round-trip is
// proven by a unit test without a browser, which is the full-fidelity claim the
// codec's document-level round-trip does not by itself cover: the codec proves
// decode(encode(doc)) === doc, but the App holds its alphabet as a STRING, not a
// string[], so the App-level round-trip has its own boundary to prove.

// The construction-method union the App holds. Kept in step with App.tsx and the
// codec's CONSTRUCTION_METHODS; a value outside it never reaches here because the
// App's own state is the only producer and the codec rejects unknown methods on
// the way back in.
export type ConstructionMethod = 'thompson' | 'asu' | 'brzozowski'

// The exact regex-document fields App.tsx holds. alphabet is the App STRING form
// (e.g. "ab"), not the ShareState string[] form (e.g. ['a','b']). Capturing this
// as its own shape keeps the conversion honest: every field App restores from a
// shared link is named here, so none can be silently dropped at the boundary.
export interface AppShareFields {
  regex: string
  alphabet: string
  testString: string
  constructionMethod: ConstructionMethod
  shouldMinimize: boolean
  useLetterNames: boolean
}

// The alphabet boundary, mirrored from algorithmCache.ts (Set <-> array there;
// string <-> array here). The App alphabet is a flat string of single-character
// symbols, so splitting on the empty string is the inverse of joining on it.
//
// The empty-alphabet auto-derive case is explicit and load-bearing: an empty App
// alphabet string means "derive the alphabet from the regex and test string at
// build time". The captured array must then be exactly [] -- NOT [''] (which
// String.prototype.split does NOT produce for "", but a naive split on a
// single-space or a fallback could) and NOT a non-empty placeholder. Carrying []
// preserves the observable App state: applyShareState joins [] back to "", the
// field stays empty, and the app's own auto-derive still drives the alphabet.
function alphabetStringToArray(alphabet: string): string[] {
  if (alphabet === '') return []
  return alphabet.split('')
}

function alphabetArrayToString(alphabet: string[]): string {
  return alphabet.join('')
}

// Snapshot the current regex-scratchpad fields into a RegexShareDoc. The alphabet
// string becomes the ShareState string[]; every other field is carried as-is. The
// automaton-document case (kind: 'automaton') is produced where a hand-built
// automaton surface is the active source; the home regex view always produces the
// regex document, which is what this function covers.
export function toShareState(fields: AppShareFields): RegexShareDoc {
  return {
    v: SHARE_VERSION,
    kind: 'regex',
    src: fields.regex,
    alphabet: alphabetStringToArray(fields.alphabet),
    options: {
      constructionMethod: fields.constructionMethod,
      shouldMinimize: fields.shouldMinimize,
      useLetterNames: fields.useLetterNames,
      testString: fields.testString,
    },
  }
}

// The inverse: turn a validated ShareState back into the App fields. For the
// regex document this joins the alphabet string[] back to the App string and
// returns every field. For the automaton document the regex scratchpad cannot be
// reconstructed (the share carried a quintuple, not a regex), so this returns null
// and the caller applies the automaton surface instead. The codec has already
// validated the input, so no field needs re-checking here.
export function applyShareState(state: ShareState): AppShareFields | null {
  if (state.kind !== 'regex') return null
  return {
    regex: state.src,
    alphabet: alphabetArrayToString(state.alphabet),
    testString: state.options.testString,
    constructionMethod: state.options.constructionMethod,
    shouldMinimize: state.options.shouldMinimize,
    useLetterNames: state.options.useLetterNames,
  }
}
