import { RegexNode } from '@/core/regex/ast'
import { GLYPHS, NotationMode } from './glyphs'

// Precedence levels for parenthesization decisions.
// A child with a lower precedence level than its parent context needs parentheses.
const PREC = {
  union: 0,
  concat: 1,
  closure: 2, // star, plus, optional
  atom: 3,    // symbol, empty, already-parenthesized
} as const

type PrecLevel = typeof PREC[keyof typeof PREC]

function nodePrec(node: RegexNode): PrecLevel {
  switch (node.type) {
    case 'union': return PREC.union
    case 'concat': return PREC.concat
    case 'star':
    case 'plus':
    case 'optional': return PREC.closure
    case 'symbol':
    case 'empty': return PREC.atom
  }
}

// Returns true if the rightmost (last-to-print) character of the formatted node
// would be a `+` from a positive-closure node. In course mode a trailing `+`
// followed by an atom would be re-parsed as the union operator, so such nodes
// must be parenthesized when they appear as the left operand of a concat.
function rightmostIsPlus(node: RegexNode): boolean {
  switch (node.type) {
    case 'plus': return true
    case 'concat': return rightmostIsPlus(node.right)
    case 'union': return rightmostIsPlus(node.right)
    default: return false
  }
}

// Returns true if the leftmost character of the formatted right child of a concat
// could begin a new atom — if so a trailing + on the left would be misread as union.
function leftmostStartsAtom(node: RegexNode): boolean {
  switch (node.type) {
    case 'symbol': return true
    case 'empty': return true       // λ / ε are atoms
    case 'concat': return leftmostStartsAtom(node.left)
    case 'union': return leftmostStartsAtom(node.left)
    // closures: formatted as child+suffix, leftmost is the child's leftmost
    case 'star':
    case 'plus':
    case 'optional': return leftmostStartsAtom(node.child)
  }
}

function fmt(node: RegexNode, mode: NotationMode, minPrec: PrecLevel): string {
  const prec = nodePrec(node)
  const needsParens = prec < minPrec
  const inner = fmtInner(node, mode)
  return needsParens ? `(${inner})` : inner
}

function fmtInner(node: RegexNode, mode: NotationMode): string {
  const glyphs = GLYPHS[mode]

  switch (node.type) {
    case 'empty':
      return glyphs.empty

    case 'symbol':
      return node.value

    case 'union': {
      // In course mode emit spaces around + so the re-parser can distinguish
      // union (infix binary) from positive closure (postfix unary).
      const sep = mode === 'course' ? ` ${glyphs.union} ` : glyphs.union
      const left = fmt(node.left, mode, PREC.union)
      // Right child: parenthesize if it is itself a union so that
      // union(a, union(b,c)) re-parses as a+(b+c) and not (a+b)+c.
      const right = fmt(node.right, mode, PREC.union + 1 as PrecLevel)
      return `${left}${sep}${right}`
    }

    case 'concat': {
      // Concat is left-associative: the parser reduces [a, b, c] to concat(concat(a,b),c).
      // Right child: if it is itself a concat, parenthesize it (require PREC.closure
      // on the right so concat nodes get parens and atoms/closures do not).
      //
      // Trailing-plus ambiguity: if the left child's last printed character is `+`
      // (from a plus/positive-closure node) and the right child starts with an atom,
      // the parser would read `+` as union. Parenthesize the left child in that case.
      const rightStr = fmt(node.right, mode, PREC.closure)
      const leftNeedsParens =
        rightmostIsPlus(node.left) && leftmostStartsAtom(node.right)
      const leftStr = leftNeedsParens
        ? `(${fmtInner(node.left, mode)})`
        : fmt(node.left, mode, PREC.concat)
      return `${leftStr}${rightStr}`
    }

    case 'star':
      // The closure child needs parens if it is union or concat (both lower than closure).
      return `${fmt(node.child, mode, PREC.closure)}*`

    case 'plus':
      // Print + from the node TYPE, not the glyph table: in course mode the
      // union glyph is also '+', but a 'plus' node is always positive closure.
      return `${fmt(node.child, mode, PREC.closure)}+`

    case 'optional':
      return `${fmt(node.child, mode, PREC.closure)}?`
  }
}

/**
 * Format a RegexNode as a regex string in the requested notation mode.
 *
 * Pure function: reads the AST, returns a string, never mutates the node.
 * No notation field is added to RegexNode by this function.
 *
 * The output string re-parses to the same AST (round-trip property):
 *   parse(formatRegex(ast, mode)) deep-equals ast  for both modes.
 */
export function formatRegex(ast: RegexNode, mode: NotationMode): string {
  return fmt(ast, mode, PREC.union)
}
