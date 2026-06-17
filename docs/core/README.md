# Core module

`src/core/` is the algorithmic heart of regex-fsm: pure functions with no UI dependencies, fully unit-tested, and checked by property tests against brute-force language oracles. Course notation throughout -- the empty string is `λ`, the empty language and trap state are `∅`.

For the algorithms in depth, see [../algorithms.md](../algorithms.md). This page covers the module layout, the data types, and the parser.

## Layout

```
src/core/
├── regex/
│   ├── tokenizer.ts      # lexing; one neutral PLUS token per '+'
│   ├── parser.ts         # recursive-descent parser, validation
│   └── ast.ts            # AST node definitions
├── automata/
│   └── types.ts          # State, Transition, NFA, DFA, BOUNDS
├── algorithms/
│   ├── thompson.ts       # regex → NFA (Thompson)
│   ├── subset.ts         # NFA → DFA (subset construction)
│   ├── minimize.ts       # DFA minimization (Moore)
│   ├── asuDirect.ts      # regex → DFA (ASU syntax tree / followpos)
│   ├── brzozowski.ts     # regex → DFA (Brzozowski derivatives)
│   ├── gnfa.ts           # NFA → regex (GNFA state elimination)
│   ├── product.ts        # union / intersection (product construction)
│   ├── complement.ts     # DFA completion and complement
│   ├── equivalence.ts    # language equivalence + shortest counterexample
│   ├── computationTree.ts# NFA parallel-configuration tree for an input
│   ├── avoidance.ts      # KMP "does not contain X" DFA
│   ├── lambda.ts         # λ-closure
│   ├── simulate.ts       # NFA and DFA string acceptance with traces
│   ├── bounds.ts         # assertWithinBounds; the too-large guard
│   └── gnfaPresets.ts    # curated NFA sources for the NFA→regex view
├── cache/                # LRU cache with localStorage persistence
└── patterns/
    └── templates.ts      # natural-language → regex templates
```

## Data types

```typescript
interface State {
  id: string          // "q0", "{q0,q1}", "∅"
  label?: string
}

interface Transition {
  from: string
  to: string
  symbol: string | null   // null is a λ-transition
}

interface NFA {
  states: State[]
  transitions: Transition[]
  startState: string
  acceptStates: string[]
  alphabet: Set<string>    // excludes λ
}

interface DFA {
  states: State[]
  transitions: Transition[]
  startState: string
  acceptStates: string[]
  alphabet: Set<string>
}
```

An NFA may have several transitions on one symbol from a state and may have λ-transitions; a DFA has exactly one transition per symbol per state and no λ-transitions.

### Resource bounds

`automata/types.ts` exports a frozen `BOUNDS`:

- `MAX_DFA_STATES = 256` -- construction stops above this.
- `TIME_BUDGET_MS = 2000` -- wall-clock limit per construction.
- `MAX_PARSE_DEPTH = 300` -- parser recursion limit.

`algorithms/bounds.ts` exposes `assertWithinBounds`, which throws a typed too-large error when a cap is exceeded. Views catch it and show a notice instead of hanging.

## Regex AST

```typescript
type RegexNode =
  | { type: 'empty' }                                   // λ
  | { type: 'symbol', value: string }
  | { type: 'concat', left: RegexNode, right: RegexNode }
  | { type: 'union', left: RegexNode, right: RegexNode }
  | { type: 'star', child: RegexNode }
  | { type: 'plus', child: RegexNode }                  // positive closure
  | { type: 'optional', child: RegexNode }
```

The `type` field discriminates the union.

## Tokenizer

`tokenize(input): Token[]`. Symbols, operators, and parentheses, each with a position. `λ` and `ε` both lex to the empty-string token. Escape sequences such as `\*` and `\(` produce literal symbols.

The `+` character is overloaded in this course, so the tokenizer does not guess: every `+` becomes one neutral `PLUS` token, and only `|` lexes to union. The parser resolves union versus positive closure by position.

## Parser

`parse(input): RegexNode`. Recursive descent over the grammar in [../algorithms.md](../algorithms.md). A `+` is read as union when the following token can begin an atom, and as positive closure otherwise; so `a+b` is union while `a+` and `(ab)+` are closure. The parser rejects a quantifier stacked on a quantifier, and reports unmatched and empty parentheses, each with a position.

## Notation formatting

The regex shown to the user is rendered from the AST by `src/notation/format.ts`, which emits course glyphs (`+`, `λ`) or textbook glyphs (`|`, `ε`) depending on the active notation mode. Course mode prints spaces around an infix `+` so the result re-parses as union rather than positive closure.

## Caching

`src/core/cache/` is an LRU cache with localStorage persistence and hash-based keys (djb2). Parse, NFA, DFA, and minimization results are memoized; repeated patterns return without recomputation. Writes use a dirty flag so localStorage is only touched when the cache changed.

## Testing

Run with `npm run test`. Every algorithm has a unit test file beside it, and the constructions additionally carry property tests: a construction and a brute-force language enumeration must agree on every string up to a bound. Test cases cover the empty string, single symbols, each operator, nesting, the empty and universal languages, invalid input, custom alphabets, minimization equivalence, the avoidance patterns, and the resource caps.
