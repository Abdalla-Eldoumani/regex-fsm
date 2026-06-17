import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { BOUNDS } from '@/core/automata/types'

// The share codec is the single serialized form for share URLs and saved-library
// entries: one versioned, compressed, url-safe representation of either a regex
// scratchpad or a hand-built automaton. There is ONE format and ONE validator so
// the URL surface (Plan 04) and the saved-automata library (Plan 03) cannot drift
// out of agreement. The codec is pure: no DOM, no React, no window. The only
// browser-independent dependency is lz-string for compression.
//
// encode is trusted (we serialize our own model). decode is the entire new
// untrusted-ingest attack surface and is built fail-closed from the first line:
// every gate returns the safe default (null) on the first violation and the
// function never throws for any input.

export const SHARE_VERSION = 1 as const

// Cap the RAW encoded string BEFORE decompression. lz-string is built to expand:
// a 2,000,000-char string compresses to ~3,334 encoded chars (a measured ~600x),
// so the guard must run on the compressed bytes or a tiny URL can blow up memory.
// A full 256-state DFA (the BOUNDS cap) compresses to ~5,225 encoded chars, so
// 16384 admits the largest legitimate payload with roughly 3x headroom while
// capping worst-case expansion to a few MB. This is the decompression-bomb guard.
export const MAX_ENCODED_LENGTH = 16_384

// Per-field caps for the regex document. A course regex is short; 4096 is far
// beyond any course example yet bounds the parse cost at apply time (Plan 04 feeds
// src to the project parser, never to a regex engine).
const MAX_REGEX_SRC_LENGTH = 4096
const MAX_TEST_STRING_LENGTH = 4096
// A generous symbol cap: the alphabet is small in practice but is bounded so a
// crafted payload cannot smuggle an unbounded array past the schema gate.
const MAX_ALPHABET_SIZE = BOUNDS.MAX_DFA_STATES

const CONSTRUCTION_METHODS = ['thompson', 'asu', 'brzozowski'] as const
type ConstructionMethod = (typeof CONSTRUCTION_METHODS)[number]

// A regex scratchpad: the inputs App.tsx holds. Restoring re-runs the
// deterministic pipeline (parse, buildNFA, nfaToDFA, ...) from these inputs, so
// the regex case stays small and the derived automata are never serialized.
export interface RegexShareDoc {
  v: typeof SHARE_VERSION
  kind: 'regex'
  src: string
  alphabet: string[]
  options: {
    constructionMethod: ConstructionMethod
    shouldMinimize: boolean
    useLetterNames: boolean
    testString: string
  }
}

// A hand-built automaton: the quintuple (Q, Sigma, delta, q0, A) round-tripped
// directly. alphabet is a sorted string[] because a Set is not JSON-serializable
// (the cache serializers in algorithmCache.ts are the precedent); symbol === null
// is the lambda move.
export interface AutomatonShareDoc {
  v: typeof SHARE_VERSION
  kind: 'automaton'
  states: { id: string; label?: string }[]
  alphabet: string[]
  transitions: { from: string; to: string; symbol: string | null }[]
  start: string
  accept: string[]
}

export type ShareState = RegexShareDoc | AutomatonShareDoc

// Compact JSON (no pretty spaces) keeps the hash short, then lz-string emits a
// url-safe alphabet directly so no separate base64 or escape step is needed.
export function encodeShareState(state: ShareState): string {
  return compressToEncodedURIComponent(JSON.stringify(state))
}

// The full hash a "Copy link" handler writes or copies.
export function buildShareHash(state: ShareState): string {
  return `#s=${encodeShareState(state)}`
}

// The security crux. Six gates in order, each failing closed to null; never
// throws. Returns the narrowed ShareState only on a full pass.
export function decodeShareState(raw: string): ShareState | null {
  // (a) hard size cap before any work -- the decompression-bomb guard. This runs
  // BEFORE decompression so a tiny crafted payload cannot expand into memory.
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_ENCODED_LENGTH) {
    return null
  }

  // (b) decompress in try/catch. The shipped lz-string .d.ts under-declares the
  // return as `string`, but at runtime decompressFromEncodedURIComponent returns
  // null for garbage and "" for empty input, and a malformed surrogate sequence
  // can throw. So the result is typed `string | null` and ALL THREE failure
  // shapes -- null, empty string, and a thrown error -- fail closed. The null and
  // empty-string checks are both load-bearing: dropping either would let garbage
  // through, so each is locked by its own unit test.
  let json: string | null
  try {
    json = decompressFromEncodedURIComponent(raw)
  } catch {
    return null
  }
  if (json === null || json === '') return null

  // (c) parse with JSON only. The incoming payload is data, never code: it is not
  // run through a dynamic code evaluator and its regex field is never compiled to a
  // host regex engine here. A parse throw fails closed.
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }

  // (d) schema validation then (e) BOUNDS + referential integrity. The validator
  // returns the narrowed ShareState or null and does both gates with no
  // best-effort coercion anywhere.
  return validateShareState(parsed)
}

// Hand-rolled type guard for a string[]. A schema library would be a new
// dependency for two fixed shapes; this is smaller, has zero supply-chain
// surface, and is trivially fuzzable.
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

// Gate (d) entry: known version and recognized discriminant, then delegate. An
// unknown version or kind is a rejection, not a repair.
function validateShareState(x: unknown): ShareState | null {
  if (typeof x !== 'object' || x === null) return null
  const o = x as Record<string, unknown>
  if (o.v !== SHARE_VERSION) return null

  if (o.kind === 'regex') return validateRegexDoc(o)
  if (o.kind === 'automaton') return validateAutomatonDoc(o)
  return null
}

function validateRegexDoc(o: Record<string, unknown>): RegexShareDoc | null {
  // (d) schema: every field the exact expected type
  if (typeof o.src !== 'string' || o.src.length > MAX_REGEX_SRC_LENGTH) return null
  if (!isStringArray(o.alphabet) || o.alphabet.length > MAX_ALPHABET_SIZE) return null
  if (typeof o.options !== 'object' || o.options === null) return null
  const opt = o.options as Record<string, unknown>
  if (!CONSTRUCTION_METHODS.includes(opt.constructionMethod as ConstructionMethod)) return null
  if (typeof opt.shouldMinimize !== 'boolean') return null
  if (typeof opt.useLetterNames !== 'boolean') return null
  if (typeof opt.testString !== 'string' || opt.testString.length > MAX_TEST_STRING_LENGTH) {
    return null
  }

  return {
    v: SHARE_VERSION,
    kind: 'regex',
    src: o.src,
    alphabet: o.alphabet,
    options: {
      constructionMethod: opt.constructionMethod as ConstructionMethod,
      shouldMinimize: opt.shouldMinimize,
      useLetterNames: opt.useLetterNames,
      testString: opt.testString,
    },
  }
}

function validateAutomatonDoc(o: Record<string, unknown>): AutomatonShareDoc | null {
  // (d) schema: every field the exact expected type
  if (!isStringArray(o.alphabet)) return null
  if (typeof o.start !== 'string') return null
  if (!isStringArray(o.accept)) return null
  if (!Array.isArray(o.states) || !Array.isArray(o.transitions)) return null

  const states: { id: string; label?: string }[] = []
  for (const s of o.states) {
    if (typeof s !== 'object' || s === null) return null
    const sr = s as Record<string, unknown>
    if (typeof sr.id !== 'string') return null
    if (sr.label !== undefined && typeof sr.label !== 'string') return null
    states.push(sr.label === undefined ? { id: sr.id } : { id: sr.id, label: sr.label })
  }

  const transitions: { from: string; to: string; symbol: string | null }[] = []
  for (const t of o.transitions) {
    if (typeof t !== 'object' || t === null) return null
    const tr = t as Record<string, unknown>
    if (typeof tr.from !== 'string' || typeof tr.to !== 'string') return null
    if (!(tr.symbol === null || typeof tr.symbol === 'string')) return null
    transitions.push({ from: tr.from, to: tr.to, symbol: tr.symbol })
  }

  // (e) BOUNDS: DoS caps against the frozen limit so a restored automaton cannot
  // exceed the locked 256-state bound or smuggle an unbounded edge/symbol list.
  if (states.length > BOUNDS.MAX_DFA_STATES) return null
  if (o.alphabet.length > MAX_ALPHABET_SIZE) return null
  if (transitions.length > BOUNDS.MAX_DFA_STATES * (o.alphabet.length + 1)) return null
  if (o.accept.length > states.length) return null

  // (e) referential integrity: every reference resolves to a declared id/symbol
  const ids = new Set(states.map((s) => s.id))
  const alpha = new Set(o.alphabet)
  if (!ids.has(o.start)) return null
  for (const a of o.accept) if (!ids.has(a)) return null
  for (const t of transitions) {
    if (!ids.has(t.from) || !ids.has(t.to)) return null
    if (t.symbol !== null && !alpha.has(t.symbol)) return null
  }

  // (f) full pass: return the validated, narrowed document only now
  return {
    v: SHARE_VERSION,
    kind: 'automaton',
    states,
    alphabet: o.alphabet,
    transitions,
    start: o.start,
    accept: o.accept,
  }
}
