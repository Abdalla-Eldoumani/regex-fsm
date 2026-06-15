import { RegexNode } from '../regex/ast'
import { NFA, BOUNDS } from '../automata/types'
import { assertWithinBounds } from './bounds'

// GNFA state elimination (NFA -> regex), Theorem 4.18 in the course notes.
//
// Why a LOCAL label type. The course regex grammar (Definition 3.9) includes the
// empty language as an atom, but the shared RegexNode does not: it has only
// 'empty' (which formats to the empty string glyph). State elimination needs the
// empty language both as the "no edge" label and as the multiplicative annihilator
// (empty-language . R = empty-language). Rather than add an 'emptyset' variant to
// RegexNode -- which would force a new case into the four existing switch sites
// (format.ts, thompson.ts, asuDirect.ts, brzozowski.ts) and put ~860 tests at risk
// -- this module defines its own GnfaLabel, exactly as brzozowski.ts defines its
// own BrzNode with a 'reject' variant. The label is converted to a RegexNode only
// at the very end (toRegexNode), for the single final START->ACCEPT edge.
//
// 'empty' is the empty STRING (lambda); 'emptyset' is the empty LANGUAGE. They are
// not interchangeable: lambda is the concatenation identity, the empty language is
// the concatenation annihilator and the union identity. Conflating them is the
// classic source-of-wrong-language bug, so they stay distinct here.
export type GnfaLabel =
  | { type: 'empty' } // lambda: the empty string
  | { type: 'emptyset' } // the empty language (no RegexNode equivalent)
  | { type: 'symbol'; value: string }
  | { type: 'concat'; left: GnfaLabel; right: GnfaLabel }
  | { type: 'union'; left: GnfaLabel; right: GnfaLabel }
  | { type: 'star'; child: GnfaLabel }

// Constructor helpers. They build raw nodes; simplify() applies the algebra.
// GNFA elimination only ever produces union/concat/star over the atoms, so there
// are no plus/optional constructors (RESEARCH A4) -- those never occur here.
export function lambda(): GnfaLabel {
  return { type: 'empty' }
}

export function emptyset(): GnfaLabel {
  return { type: 'emptyset' }
}

export function sym(value: string): GnfaLabel {
  return { type: 'symbol', value }
}

export function concat(left: GnfaLabel, right: GnfaLabel): GnfaLabel {
  return { type: 'concat', left, right }
}

export function union(left: GnfaLabel, right: GnfaLabel): GnfaLabel {
  return { type: 'union', left, right }
}

export function star(child: GnfaLabel): GnfaLabel {
  return { type: 'star', child }
}

// A stable string key for structural equality. Mirrors brzozowski.ts toCanonical:
// the empty-string glyph for lambda, the empty-set glyph for the empty language,
// the symbol's value for a symbol, and parenthesized forms for the compound nodes.
// Two labels with the same canonical key denote the same expression tree, so this
// is what drives the idempotent-union rule R + R = R below. It is structural, not
// semantic: it does not decide language equivalence (that is the property tests'
// job in plan 02), only that two trees are literally the same after simplify().
export function canonical(r: GnfaLabel): string {
  switch (r.type) {
    case 'empty':
      return 'λ'
    case 'emptyset':
      return '∅'
    case 'symbol':
      return r.value
    case 'concat':
      return `(${canonical(r.left)}.${canonical(r.right)})`
    case 'union':
      return `(${canonical(r.left)}|${canonical(r.right)})`
    case 'star':
      return `(${canonical(r.child)})*`
  }
}

// Apply the language-preserving regex identities so labels stay readable rather
// than exploding as states are eliminated. EVERY rule here preserves the language
// the label denotes -- this function must never change L(). The locked identity set
// (06-CONTEXT) is, with E the empty language and L lambda:
//
//   E . R = R . E = E      (the empty language annihilates concatenation)
//   L . R = R . L = R      (lambda is the concatenation identity)
//   E + R = R + E = R      (the empty language is the union identity)
//   E* = L                 (zero-or-more of nothing is just the empty string)
//   L* = L                 (zero-or-more lambdas is still just lambda)
//   (R*)* = R*             (star is idempotent)
//   R + R = R              (union is idempotent; decided by canonical())
//
// Structure mirrors brzozowski.ts simplify() (lines 74-120) with 'emptyset' in
// place of 'reject'. Recurses bottom-up: children are simplified first so the
// rules see already-reduced operands.
export function simplify(r: GnfaLabel): GnfaLabel {
  switch (r.type) {
    case 'empty':
    case 'emptyset':
    case 'symbol':
      return r

    case 'concat': {
      const left = simplify(r.left)
      const right = simplify(r.right)
      // empty-language . R = R . empty-language = empty-language
      if (left.type === 'emptyset' || right.type === 'emptyset') {
        return { type: 'emptyset' }
      }
      // lambda . R = R
      if (left.type === 'empty') return right
      // R . lambda = R
      if (right.type === 'empty') return left
      return { type: 'concat', left, right }
    }

    case 'union': {
      const left = simplify(r.left)
      const right = simplify(r.right)
      // empty-language + R = R
      if (left.type === 'emptyset') return right
      // R + empty-language = R
      if (right.type === 'emptyset') return left
      const lKey = canonical(left)
      const rKey = canonical(right)
      // R + R = R (idempotent union via structural equality)
      if (lKey === rKey) return left
      // Sort operands by canonical key so a + b and b + a share one stable form
      // (mirrors brzozowski.ts lines 107-108). Union is commutative in language,
      // so reordering is language-preserving.
      if (lKey > rKey) return { type: 'union', left: right, right: left }
      return { type: 'union', left, right }
    }

    case 'star': {
      const child = simplify(r.child)
      // empty-language* = lambda (the empty word is always in a Kleene star)
      if (child.type === 'emptyset') return { type: 'empty' }
      // lambda* = lambda
      if (child.type === 'empty') return { type: 'empty' }
      // (R*)* = R*
      if (child.type === 'star') return child
      return { type: 'star', child }
    }
  }
}

// Convert a GnfaLabel to the shared RegexNode for the final regex, so the Phase 3
// formatter (formatRegex) can render it in course notation. The mapping is
// one-to-one for empty/symbol/concat/union/star -- those all exist in RegexNode.
//
// 'emptyset' has NO RegexNode equivalent (RegexNode predates this phase, Pitfall 5).
// For any non-empty language the final label simplifies away every emptyset, so
// this throw should be unreachable in practice; it fires only if a caller forgets
// to guard the whole-language-is-empty case with isEmptyLanguage. The message says
// exactly that, so the bug is obvious if it ever surfaces.
export function toRegexNode(l: GnfaLabel): RegexNode {
  switch (l.type) {
    case 'empty':
      return { type: 'empty' }
    case 'symbol':
      return { type: 'symbol', value: l.value }
    case 'concat':
      return { type: 'concat', left: toRegexNode(l.left), right: toRegexNode(l.right) }
    case 'union':
      return { type: 'union', left: toRegexNode(l.left), right: toRegexNode(l.right) }
    case 'star':
      return { type: 'star', child: toRegexNode(l.child) }
    case 'emptyset':
      throw new Error(
        'toRegexNode: the empty language has no RegexNode equivalent. Guard the ' +
          'whole-language-is-empty case with NfaToRegexResult.isEmptyLanguage before calling.'
      )
  }
}

// The new single START and ACCEPT ids the GNFA construction introduces. They use
// a sentinel shape no editor id or qN id can collide with (Pitfall 2): the editor
// emits qN / user labels, Thompson emits qN; neither produces a __gnfa_*__ id.
// They are excluded from elimination and are the only two states left at the end.
export const GNFA_START = '__gnfa_start__'
export const GNFA_ACCEPT = '__gnfa_accept__'

// A serializable record of the GNFA after one elimination step, for the animated
// view to replay (Pattern 4). step 0 is the initial GNFA (eliminated === null);
// step k>=1 is the GNFA AFTER removing `eliminated`. edges carry GnfaLabels (the
// view formats them with toRegexNode + formatRegex). states and edges are sorted
// deterministically so identical inputs yield identical snapshots (Pitfall 4).
export interface GnfaSnapshot {
  step: number
  eliminated: string | null
  states: string[]
  edges: Array<{ from: string; to: string; label: GnfaLabel }>
  note: string
}

export interface NfaToRegexResult {
  // The final regex as a shared RegexNode, or null when the language is empty
  // (the empty language has no RegexNode; render the empty-set glyph instead, A5).
  regex: RegexNode | null
  // true => the source recognizes the empty language; skip the parse round-trip
  // and render the empty-set glyph (Pitfall 5).
  isEmptyLanguage: boolean
  // The raw simplified START->ACCEPT label (emptyset when the language is empty).
  finalLabel: GnfaLabel
  // The ordered per-step snapshots, snapshot 0 first.
  steps: GnfaSnapshot[]
}

// The edge-label store: outer key = from-state, inner key = to-state. An ABSENT
// entry IS the empty language (RESEARCH Alternatives recommends the map over a
// dense matrix so the empty language is not stored everywhere). labelOf() makes
// that explicit: a missing edge reads as emptyset.
type LabelStore = Map<string, Map<string, GnfaLabel>>

function labelOf(store: LabelStore, from: string, to: string): GnfaLabel {
  return store.get(from)?.get(to) ?? { type: 'emptyset' }
}

// Fold a label into the store, UNIONing with any existing edge (Pitfall 3): two
// parallel transitions q0--a-->q1 and q0--b-->q1 must combine to a + b, never
// overwrite. simplify keeps the stored label reduced. An emptyset result is
// dropped (no edge) so the store stays sparse and snapshots skip dead edges.
function addLabel(store: LabelStore, from: string, to: string, label: GnfaLabel): void {
  const merged = simplify(union(labelOf(store, from, to), label))
  if (merged.type === 'emptyset') {
    store.get(from)?.delete(to)
    return
  }
  let inner = store.get(from)
  if (!inner) {
    inner = new Map<string, GnfaLabel>()
    store.set(from, inner)
  }
  inner.set(to, merged)
}

// Build a GnfaSnapshot from the current store: every non-emptyset edge, sorted by
// (from, to), with the remaining state ids sorted. Deterministic by construction
// so snapshots never depend on Map insertion order (Pitfall 4).
function snapshot(
  step: number,
  eliminated: string | null,
  stateIds: string[],
  store: LabelStore,
  note: string
): GnfaSnapshot {
  const edges: GnfaSnapshot['edges'] = []
  for (const from of stateIds) {
    const inner = store.get(from)
    if (!inner) continue
    for (const to of inner.keys()) {
      const label = inner.get(to)!
      if (label.type === 'emptyset') continue
      edges.push({ from, to, label })
    }
  }
  edges.sort((a, b) => (a.from === b.from ? a.to.localeCompare(b.to) : a.from.localeCompare(b.from)))
  return {
    step,
    eliminated,
    states: [...stateIds].sort((a, b) => a.localeCompare(b)),
    edges,
    note,
  }
}

export interface GnfaBuild {
  start: string
  accept: string
  states: string[]
  store: LabelStore
}

// Build a GNFA from an NFA (N2R-01): add one fresh START with a lambda-edge to the
// old start, and one fresh ACCEPT with a lambda-edge from every old accept state.
// Each NFA transition becomes a GnfaLabel edge; parallel edges union with +.
// Pure: never mutates the input NFA (core immutability convention).
export function buildGNFA(nfa: NFA): GnfaBuild {
  // SAFETY-01. Cap the GNFA size before elimination so a pathological input
  // surfaces TooLargeError here, consistent with subset.ts / brzozowski.ts,
  // rather than driving the O(V^3) elimination loop on a huge graph. Elimination
  // itself adds no states (it only removes them), so guarding the initial count
  // bounds the whole run. The +2 covers the new START and ACCEPT.
  assertWithinBounds(nfa.states.length + 2, BOUNDS.TIME_BUDGET_MS, performance.now())

  const store: LabelStore = new Map()
  const stateIds = [GNFA_START, GNFA_ACCEPT, ...nfa.states.map(s => s.id)]

  // Wiring edges: START --lambda--> old start, every old accept --lambda--> ACCEPT.
  // lambda is the concatenation identity, so these compose transparently (Pitfall 2).
  addLabel(store, GNFA_START, nfa.startState, lambda())
  for (const accept of nfa.acceptStates) {
    addLabel(store, accept, GNFA_ACCEPT, lambda())
  }

  // Fold every transition. A lambda-transition has symbol === null and folds as
  // union(R_ij, lambda); a symbol transition folds as union(R_ij, symbol(s)).
  for (const t of nfa.transitions) {
    addLabel(store, t.from, t.to, t.symbol === null ? lambda() : sym(t.symbol))
  }

  return { start: GNFA_START, accept: GNFA_ACCEPT, states: stateIds, store }
}

// The deterministic elimination order (Pattern 3). Interior states are eliminated
// in ASCENDING state index: qN ids sort by their numeric suffix, anything else
// falls back to localeCompare. START and ACCEPT are never eliminable. A fixed
// order makes the produced regex and the snapshots reproducible run to run; the
// order changes the regex's FORM only, never its language (this is exactly what
// the per-step language property in plan 02 protects).
function interiorOrder(stateIds: string[], start: string, accept: string): string[] {
  const interior = stateIds.filter(id => id !== start && id !== accept)
  const numeric = (id: string): number | null => {
    const m = /^q(\d+)$/.exec(id)
    return m ? Number(m[1]) : null
  }
  return [...interior].sort((a, b) => {
    const na = numeric(a)
    const nb = numeric(b)
    if (na !== null && nb !== null) return na - nb
    return a.localeCompare(b)
  })
}

export interface EliminateResult {
  finalLabel: GnfaLabel
  steps: GnfaSnapshot[]
}

// Run state elimination to completion on a GNFA build (the heart of N2R-01).
// For each interior state q, in the deterministic order, rewire every predecessor
// i and successor j (i and j may be START/ACCEPT or equal each other; neither is q):
//
//   R_ij <- R_ij + R_iq (R_qq)* R_qj
//
// This is the standard GNFA elimination, equivalent to the course's r1 + s*r2 /
// (r2 s*) r1 algebra (Theorem 4.18). A missing edge reads as the empty language,
// so a missing self-loop gives star(emptyset) which simplify collapses to lambda
// (Pitfall 1): never special-case the self-loop by skipping the term -- let the
// identities do the work. Operates on a private copy of the store; never mutates
// the input build.
export function eliminate(build: GnfaBuild): EliminateResult {
  const { start, accept } = build
  // Work on a deep-enough copy: clone the outer and inner maps so the caller's
  // store is untouched (the GnfaLabel nodes themselves are treated as immutable).
  const store: LabelStore = new Map()
  for (const [from, inner] of build.store) {
    store.set(from, new Map(inner))
  }
  let stateIds = [...build.states]

  const order = interiorOrder(stateIds, start, accept)
  const steps: GnfaSnapshot[] = [
    snapshot(0, null, stateIds, store, 'Initial GNFA: new START and ACCEPT wired with λ-edges'),
  ]

  let step = 1
  for (const q of order) {
    const selfLoop = star(labelOf(store, q, q))
    // Predecessors i with an edge into q, and successors j with an edge out of q,
    // excluding q itself. Read from the snapshot of the store BEFORE this state's
    // rewrites so all new R_ij use q's original incident labels.
    const preds = stateIds.filter(i => i !== q && labelOf(store, i, q).type !== 'emptyset')
    const succs = stateIds.filter(j => j !== q && labelOf(store, q, j).type !== 'emptyset')

    // Capture R_iq and R_qj before mutating the store (i->j writes never touch
    // edges into or out of q, but capturing keeps the formula unambiguous).
    const through = new Map<string, GnfaLabel>()
    for (const i of preds) {
      for (const j of succs) {
        const path = simplify(concat(concat(labelOf(store, i, q), selfLoop), labelOf(store, q, j)))
        through.set(`${i} ${j}`, path)
      }
    }
    for (const i of preds) {
      for (const j of succs) {
        addLabel(store, i, j, through.get(`${i} ${j}`)!)
      }
    }

    // Delete q and every edge incident to it.
    store.delete(q)
    for (const inner of store.values()) {
      inner.delete(q)
    }
    stateIds = stateIds.filter(id => id !== q)

    steps.push(snapshot(step, q, stateIds, store, `Eliminate ${q}: R_ij + R_iq (R_qq)* R_qj`))
    step += 1
  }

  // Only START -> ACCEPT can remain; its label is the resulting regex. Absent
  // (no path from start to accept) means the empty language (A5).
  const finalLabel = simplify(labelOf(store, start, accept))
  return { finalLabel, steps }
}

// Convert an NFA to an equivalent regex by GNFA state elimination (N2R-01/N2R-03).
// Returns BOTH the final regex (as a RegexNode, or null + isEmptyLanguage when the
// language is empty) AND the ordered per-step snapshots for animation. The
// language-preserving invariant holds at every snapshot (proven by the plan 02
// property tests). Pure; never mutates the input.
export function nfaToRegex(nfa: NFA): NfaToRegexResult {
  const build = buildGNFA(nfa)
  const { finalLabel, steps } = eliminate(build)
  const isEmptyLanguage = finalLabel.type === 'emptyset'
  return {
    regex: isEmptyLanguage ? null : toRegexNode(finalLabel),
    isEmptyLanguage,
    finalLabel,
    steps,
  }
}
