import { Token, RegexNode } from './ast'
import { tokenize } from './tokenizer'

class Parser {
  private tokens: Token[]
  private pos: number

  constructor(tokens: Token[]) {
    this.tokens = tokens
    this.pos = 0
  }

  private current(): Token {
    return this.tokens[this.pos]
  }

  private peek(): Token {
    return this.tokens[Math.min(this.pos + 1, this.tokens.length - 1)]
  }

  private advance(): void {
    if (this.current().type !== 'EOF') {
      this.pos++
    }
  }

  private match(...types: Token['type'][]): boolean {
    return types.includes(this.current().type)
  }

  // A token that can begin an atom (and therefore a new operand at union level).
  private startsAtom(type: Token['type']): boolean {
    return type === 'SYMBOL' || type === 'EPSILON' || type === 'LPAREN'
  }

  // `+` is overloaded: it is union when a new operand follows it, and positive
  // closure when nothing parseable as an operand follows. `|` is always union.
  // The current PLUS acts as union iff the next token can begin an atom.
  private plusIsUnion(): boolean {
    return this.match('PLUS') && this.startsAtom(this.peek().type)
  }

  private unionHere(): boolean {
    return this.match('UNION') || this.plusIsUnion()
  }

  private expect(type: Token['type']): void {
    if (this.current().type !== type) {
      throw new Error(
        `Expected ${type} but found ${this.current().type} at position ${this.current().pos}`
      )
    }
    this.advance()
  }

  parse(): RegexNode {
    if (this.current().type === 'EOF') {
      throw new Error('Empty regex expression')
    }
    const node = this.parseUnion()
    this.expect('EOF')
    return node
  }

  private parseUnion(): RegexNode {
    let left = this.parseConcat()

    while (this.unionHere()) {
      this.advance()
      const right = this.parseConcat()
      left = { type: 'union', left, right }
    }

    return left
  }

  private parseConcat(): RegexNode {
    const nodes: RegexNode[] = []

    // Stop at the boundaries of a concatenation: end, an explicit `|`, a closing
    // paren, or a `+` that is acting as union (so parseUnion picks it up instead
    // of parseRepeat swallowing it as closure on the left operand).
    while (!this.match('EOF', 'UNION', 'RPAREN') && !this.plusIsUnion()) {
      nodes.push(this.parseRepeat())
    }

    if (nodes.length === 0) {
      throw new Error(`Unexpected token ${this.current().type} at position ${this.current().pos}`)
    }

    if (nodes.length === 1) {
      return nodes[0]
    }

    return nodes.reduce((left, right) => ({ type: 'concat', left, right }))
  }

  private parseRepeat(): RegexNode {
    let node = this.parseAtom()

    // A `+` here is postfix positive closure only when it is NOT acting as union
    // (i.e. nothing parseable as an operand follows it). `*` and `?` are always
    // postfix. A union-acting `+` is left for parseUnion.
    while (this.match('STAR', 'OPTIONAL') || (this.match('PLUS') && !this.plusIsUnion())) {
      // Check if the node is already a quantifier
      if (node.type === 'star' || node.type === 'plus' || node.type === 'optional') {
        throw new Error(
          `Invalid regex: quantifier cannot follow quantifier at position ${this.current().pos}`
        )
      }

      const type = this.current().type
      this.advance()

      if (type === 'STAR') {
        node = { type: 'star', child: node }
      } else if (type === 'PLUS') {
        node = { type: 'plus', child: node }
      } else {
        node = { type: 'optional', child: node }
      }
    }

    return node
  }

  private parseAtom(): RegexNode {
    if (this.match('SYMBOL')) {
      const value = this.current().value!
      this.advance()
      return { type: 'symbol', value }
    }

    if (this.match('EPSILON')) {
      this.advance()
      return { type: 'empty' }
    }

    if (this.match('LPAREN')) {
      this.advance()
      const node = this.parseUnion()
      this.expect('RPAREN')
      return node
    }

    throw new Error(
      `Unexpected token ${this.current().type} at position ${this.current().pos}`
    )
  }
}

export function parse(input: string): RegexNode {
  const tokens = tokenize(input)
  const parser = new Parser(tokens)
  return parser.parse()
}
