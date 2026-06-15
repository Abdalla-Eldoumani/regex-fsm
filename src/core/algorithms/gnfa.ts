import { RegexNode } from '../regex/ast'

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
