import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { parse } from '@/core/regex/parser'
import { RegexNode } from '@/core/regex/ast'
import { buildNFA } from '@/core/algorithms/thompson'
import { nfaToDFA } from '@/core/algorithms/subset'
import { simulateDFA } from '@/core/algorithms/simulate'

// Independent oracle (automata-correctness skill: "a string is in L(regex) under
// the brute-force matcher if and only if the constructed DFA accepts it").
//
// This matcher interprets a RegexNode directly against the input. It is NOT the
// DFA and it never compiles the input to a JS RegExp (threat T-03-04), so it is a
// genuinely independent check on the parse -> Thompson -> subset pipeline.
//
// matchEnds(node, s, i) returns every end index j such that node matches s[i..j).
// The whole string is accepted iff s.length is a reachable end from position 0.
function matchEnds(node: RegexNode, s: string, i: number): Set<number> {
  switch (node.type) {
    case 'empty':
      return new Set([i])
    case 'symbol':
      return i < s.length && s[i] === node.value ? new Set([i + 1]) : new Set()
    case 'concat': {
      const out = new Set<number>()
      for (const mid of matchEnds(node.left, s, i)) {
        for (const end of matchEnds(node.right, s, mid)) {
          out.add(end)
        }
      }
      return out
    }
    case 'union': {
      const out = new Set<number>(matchEnds(node.left, s, i))
      for (const end of matchEnds(node.right, s, i)) {
        out.add(end)
      }
      return out
    }
    case 'optional': {
      // zero or one: the empty match plus one match of the child
      const out = new Set<number>([i])
      for (const end of matchEnds(node.child, s, i)) {
        out.add(end)
      }
      return out
    }
    case 'star':
      // zero or more: includes the empty match at i
      return closure(node.child, s, i, true)
    case 'plus':
      // one or more: every end reachable by matching the child at least once
      return closure(node.child, s, i, false)
  }
}

// Reflexive-transitive end set of repeating `child`. includeStart adds the
// zero-repetition match (star); plus omits it but still iterates to a fixpoint.
// The visited set makes nullable children (e.g. a*) terminate instead of looping
// forever on empty matches.
function closure(
  child: RegexNode,
  s: string,
  i: number,
  includeStart: boolean
): Set<number> {
  const reached = new Set<number>()
  if (includeStart) {
    reached.add(i)
  }
  // Seed with one application of the child.
  let frontier = Array.from(matchEnds(child, s, i))
  for (const p of frontier) {
    reached.add(p)
  }
  // Keep applying the child from every newly reached position.
  while (frontier.length > 0) {
    const next: number[] = []
    for (const pos of frontier) {
      for (const end of matchEnds(child, s, pos)) {
        if (!reached.has(end)) {
          reached.add(end)
          next.push(end)
        }
      }
    }
    frontier = next
  }
  return reached
}

function bruteForceAccepts(ast: RegexNode, input: string): boolean {
  return matchEnds(ast, input, 0).has(input.length)
}

function dfaAccepts(ast: RegexNode, input: string): boolean {
  const dfa = nfaToDFA(buildNFA(ast))
  return simulateDFA(dfa, input).accepted
}

// Bounded recursive AST arbitrary over the alphabet {a, b}. Includes union (the
// course + operator), concatenation, Kleene star, positive closure (+), and
// optional, so the property exercises both + meanings the 03-01 fix introduced.
const SYMBOLS = ['a', 'b'] as const

function regexArb(): fc.Arbitrary<RegexNode> {
  const leaf: fc.Arbitrary<RegexNode> = fc.oneof(
    fc.constantFrom(...SYMBOLS).map((value) => ({ type: 'symbol', value }) as RegexNode),
    fc.constant({ type: 'empty' } as RegexNode)
  )
  return fc.letrec<{ node: RegexNode }>((tie) => ({
    node: fc.oneof(
      { maxDepth: 4, depthSize: 'small' },
      leaf,
      fc.record({ left: tie('node'), right: tie('node') }).map(
        ({ left, right }) => ({ type: 'concat', left, right }) as RegexNode
      ),
      fc.record({ left: tie('node'), right: tie('node') }).map(
        ({ left, right }) => ({ type: 'union', left, right }) as RegexNode
      ),
      tie('node').map((child) => ({ type: 'star', child }) as RegexNode),
      tie('node').map((child) => ({ type: 'plus', child }) as RegexNode),
      tie('node').map((child) => ({ type: 'optional', child }) as RegexNode)
    ),
  })).node
}

const stringArb = fc
  .array(fc.constantFrom(...SYMBOLS), { minLength: 0, maxLength: 6 })
  .map((chars) => chars.join(''))

describe('brute-force matcher equivalent to constructed DFA', () => {
  // Seeded so a counterexample reproduces deterministically (skill requirement).
  // If this finds a failing (ast, input), add it as a named unit test below and
  // fix the pipeline; do not loosen the property.
  it('a string is accepted by the DFA iff the brute-force matcher accepts it', () => {
    fc.assert(
      fc.property(regexArb(), stringArb, (ast, input) => {
        expect(dfaAccepts(ast, input)).toBe(bruteForceAccepts(ast, input))
      }),
      { seed: 0x5151a, numRuns: 400 }
    )
  })

  // Explicit course example, routed through parse() so the + union parser is
  // exercised end to end. (a + b)*abb accepts strings of a's and b's that end in
  // abb. PDF canonical example; + and | spellings denote the same language.
  it('(a+b)*abb parses, builds, and matches its course language', () => {
    const ast = parse('(a+b)*abb')

    const accept = ['abb', 'aabb', 'babb', 'ababb', 'baabb', 'abababb']
    const reject = ['', 'ab', 'aab', 'aba', 'abba', 'b', 'a']

    accept.forEach((s) => {
      expect(dfaAccepts(ast, s)).toBe(true)
      expect(bruteForceAccepts(ast, s)).toBe(true)
    })
    reject.forEach((s) => {
      expect(dfaAccepts(ast, s)).toBe(false)
      expect(bruteForceAccepts(ast, s)).toBe(false)
    })
  })

  // The + union spelling and the | spelling must yield the identical language
  // through the whole pipeline (the parse fix's core promise).
  it('(a+b)*abb and (a|b)*abb accept the same strings', () => {
    const plusAst = parse('(a+b)*abb')
    const barAst = parse('(a|b)*abb')

    fc.assert(
      fc.property(stringArb, (input) => {
        expect(dfaAccepts(plusAst, input)).toBe(dfaAccepts(barAst, input))
      }),
      { seed: 0xabb, numRuns: 200 }
    )
  })
})
