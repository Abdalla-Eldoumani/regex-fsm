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

  private advance(): void {
    if (this.current().type !== 'EOF') {
      this.pos++
    }
  }

  private match(...types: Token['type'][]): boolean {
    return types.includes(this.current().type)
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

    while (this.match('UNION')) {
      this.advance()
      const right = this.parseConcat()
      left = { type: 'union', left, right }
    }

    return left
  }

  private parseConcat(): RegexNode {
    const nodes: RegexNode[] = []

    while (!this.match('EOF', 'UNION', 'RPAREN')) {
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

    while (this.match('STAR', 'PLUS', 'OPTIONAL')) {
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
