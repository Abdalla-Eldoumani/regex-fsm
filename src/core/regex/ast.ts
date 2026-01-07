export type TokenType =
  | 'SYMBOL'
  | 'UNION'
  | 'STAR'
  | 'PLUS'
  | 'OPTIONAL'
  | 'LPAREN'
  | 'RPAREN'
  | 'EPSILON'
  | 'EOF'

export interface Token {
  type: TokenType
  value?: string
  pos: number
}

export type RegexNode =
  | { type: 'empty' }
  | { type: 'symbol'; value: string }
  | { type: 'concat'; left: RegexNode; right: RegexNode }
  | { type: 'union'; left: RegexNode; right: RegexNode }
  | { type: 'star'; child: RegexNode }
  | { type: 'plus'; child: RegexNode }
  | { type: 'optional'; child: RegexNode }
