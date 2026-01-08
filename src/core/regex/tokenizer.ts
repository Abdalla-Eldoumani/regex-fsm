import { Token } from './ast'

export function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let pos = 0

  while (pos < input.length) {
    const char = input[pos]

    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      pos++
      continue
    }

    if (char === '\\' && pos + 1 < input.length) {
      tokens.push({ type: 'SYMBOL', value: input[pos + 1], pos })
      pos += 2
      continue
    }

    if (char === 'ε' || char === 'λ') {
      tokens.push({ type: 'EPSILON', pos })
      pos++
      continue
    }

    if (char === '(') {
      tokens.push({ type: 'LPAREN', pos })
      pos++
      continue
    }

    if (char === ')') {
      tokens.push({ type: 'RPAREN', pos })
      pos++
      continue
    }

    if (char === '*') {
      tokens.push({ type: 'STAR', pos })
      pos++
      continue
    }

    if (char === '?') {
      tokens.push({ type: 'OPTIONAL', pos })
      pos++
      continue
    }

    if (char === '|') {
      tokens.push({ type: 'UNION', pos })
      pos++
      continue
    }

    if (char === '+') {
      const lastToken = tokens[tokens.length - 1]
      const isPlusOperator = lastToken && (
        lastToken.type === 'RPAREN' ||
        lastToken.type === 'STAR' ||
        lastToken.type === 'PLUS' ||
        lastToken.type === 'OPTIONAL' ||
        lastToken.type === 'SYMBOL' ||
        lastToken.type === 'EPSILON'
      )

      if (isPlusOperator) {
        tokens.push({ type: 'PLUS', pos })
      } else {
        tokens.push({ type: 'UNION', pos })
      }
      pos++
      continue
    }

    if (/[a-zA-Z0-9]/.test(char)) {
      tokens.push({ type: 'SYMBOL', value: char, pos })
      pos++
      continue
    }

    throw new Error(`Invalid character '${char}' at position ${pos}`)
  }

  tokens.push({ type: 'EOF', pos })
  return tokens
}
