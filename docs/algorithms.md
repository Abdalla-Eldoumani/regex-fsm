# Algorithms

The algorithm layer (`src/core/algorithms/`) is pure: no UI, no DOM, fully unit-tested, and checked by property tests against brute-force language oracles. Course notation throughout: `+` for union, `λ` for the empty string, `∅` for the empty language and the trap state.

A shared guard, `assertWithinBounds` in `bounds.ts`, caps construction at **256 states** and a **2000 ms** budget; the parser has a recursion limit of **300**. Over a cap, a construction throws a typed too-large error rather than hanging.

## Regex parsing

Files: `core/regex/tokenizer.ts`, `core/regex/parser.ts`, `core/regex/ast.ts`.

The grammar, lowest precedence first:

```
regex  → union
union  → concat (('+' | '|') concat)*
concat → repeat+
repeat → atom ('*' | '+' | '?')*
atom   → SYMBOL | EPSILON | '(' regex ')'
```

`+` is overloaded. Infix it is union (`a + b`); postfix it is positive closure (`a+`). The tokenizer does not disambiguate -- it emits one neutral `PLUS` token for every `+` character, and only `|` lexes directly to union. The parser decides by grammatical position: a `+` is union when the next token can begin an atom (a symbol, the empty string, or a left parenthesis), and positive closure otherwise. So `a+b` and `(a + b)*abb` parse as union, while `a+`, `ab+`, and `(ab)+` parse as positive closure.

The parser rejects a quantifier stacked on a quantifier (`a**`, `a*+`, `a?***`) with a positioned error, and reports unmatched and empty parentheses.

## Thompson's construction

File: `thompson.ts`. Regex AST to NFA, recursively, with exactly one start state and one accept state.

- **Empty string `λ`**: `start --λ--> accept`.
- **Symbol `a`**: `start --a--> accept`.
- **Concatenation `RS`**: a λ-edge from `R`'s accept to `S`'s start.
- **Union `R + S`**: a new start with λ-edges into each sub-NFA, and a new accept with λ-edges out of each.
- **Kleene star `R*`**: four λ-edges -- skip (start to accept), enter, loop (accept of `R` back to its start), and exit.
- **Positive closure `R+`**: star without the skip edge.
- **Optional `R?`**: star without the loop edge.

The NFA has O(m) states for a regex of length m. A companion entry point also records the AST-node-to-NFA-fragment correspondence used by the multi-view.

## Subset construction

File: `subset.ts`. NFA to DFA, where each DFA state is a set of NFA states.

```
q0' = λ-closure({q0})
worklist = [q0']
while worklist not empty:
    S = worklist.pop()
    for each symbol a in Σ:
        T = λ-closure(move(S, a))
        if T is empty: δ'[S, a] = ∅;  mark trap needed
        else:          δ'[S, a] = T;  enqueue T if new
if trap needed: add ∅ with self-loops on every symbol
F' = { S : S ∩ F ≠ ∅ }
```

The result is **complete**: every state has exactly `|Σ|` outgoing transitions. The trap state `∅` is never accepting and loops to itself, so a rejected string is consumed to the end and the point of failure is visible. An optional custom alphabet makes transitions on symbols outside the regex appear explicitly. Worst case is 2^n states for an n-state NFA; typical regexes stay far below that. A companion entry point records which NFA-state set each DFA state represents.

### λ-closure and move

File: `lambda.ts`. λ-closure of a set is every state reachable by zero or more λ-edges, by stack-based search. `move(S, a)` is every state reachable from `S` by a single `a`-edge.

## Moore minimization

File: `minimize.ts`. Partition refinement to the minimal DFA.

1. Remove unreachable states.
2. Partition into accepting and non-accepting.
3. Split any block whose states disagree on the block a symbol leads to.
4. Repeat to a fixed point.
5. Each final block becomes one state; rename to `q0, q1, …` or `A, B, C, …`.

The result accepts the same language with the fewest states. The return value includes the map from original states to merged states, which the multi-view uses for correspondence highlighting.

## ASU direct construction

File: `asuDirect.ts`. Regex to DFA with no intermediate NFA, via syntax-tree annotation (Aho, Sethi, Ullman).

1. Augment the regex to `(R)#` with an end marker.
2. Number the leaf positions.
3. Compute `nullable`, `firstpos`, and `lastpos` for each node.
4. Compute `followpos` from the tree.
5. DFA states are sets of positions; transitions follow `followpos`. Add a trap state for completeness.

```
nullable:  λ → true;  symbol → false;  concat → both;  union → either;  star → true;  plus → nullable(child)
firstpos:  symbol(i) → {i};  concat → nullable(left) ? first(left) ∪ first(right) : first(left);  union → union of firsts;  star/plus → first(child)
lastpos:   symbol(i) → {i};  concat → nullable(right) ? last(left) ∪ last(right) : last(right);  union → union of lasts;  star/plus → last(child)
followpos: concat(c1,c2): for i in last(c1), follow(i) ∪= first(c2);  star/plus(c): for i in last(c), follow(i) ∪= first(c)
```

This often yields fewer states than Thompson plus subset.

## Brzozowski derivatives

File: `brzozowski.ts`. Regex to DFA where each state is a regex. The derivative of `R` with respect to `a` accepts exactly the `w` such that `aw ∈ L(R)`.

```
Da(∅) = ∅            Da(λ) = ∅
Da(a) = λ            Da(b) = ∅   (b ≠ a)
Da(R + S) = Da(R) + Da(S)
Da(RS)    = Da(R)·S + (nullable(R) ? Da(S) : ∅)
Da(R*)    = Da(R)·R*
```

Derivatives are simplified after each step (`∅ + R = R`, `∅·R = ∅`, `λ·R = R`) and identified by a canonical string form, so the set of distinct states stays finite. Accepting states are the nullable regexes.

## GNFA state elimination

File: `gnfa.ts`. NFA to regex.

Add a single new start state and a single new accept state, wired by λ to the original start and from the original accepts. Then remove the original states one at a time. When a state `q` is removed, every surviving path through `q` is rebuilt by combining the regex labels on `in(q)`, the self-loop on `q` under star, and `out(q)`, unioned into the direct edge. The labels are simplified with the usual algebraic laws (the empty language and empty string have their identities). When only the new start and accept remain, the label between them is the regex for the NFA's language. The view renames the new states to `S` and `A` and numbers the rest.

## Product, complement, and closure

Files: `product.ts`, `complement.ts`.

- **Product** builds the closure DFAs for union and intersection. Both source DFAs are completed over the common alphabet, then reachable state pairs are discovered breadth-first. A pair accepts when **both** components accept (intersection) or **either** accepts (union).
- **Complement** completes a DFA (`completeDFA` makes `δ` total by adding a trap with self-loops; it is idempotent) and flips the accepting set.

## Language equivalence with shortest counterexample

File: `equivalence.ts`. `equivalence(a, b, sigma?)` decides whether two DFAs accept the same language and, when they differ, returns the shortest distinguishing word and the direction of the error.

Both DFAs are completed over the common `Σ`, then the product is walked breadth-first from the start pair. The first reachable pair where exactly one component accepts is the witness; a back-pointer per pair reconstructs the path, which spells the counterexample. Because the frontier is a FIFO queue, the witness is reached by a shortest path, so the counterexample is minimal length. The empty string is a legal counterexample when the start pair itself is the witness; the view renders it as `λ`.

Direction is fixed by argument order. The first argument is the student, the second the reference. `acceptedBy: 'student'` means the student wrongly accepts the word; `acceptedBy: 'reference'` means the student wrongly rejects it. This is the grader for the challenges; it shares the completion routine and the resource cap with the product construction, and never compares graph shape.

## Computation tree

File: `computationTree.ts`. The parallel configurations an NFA passes through on one input string. Each level is the λ-closed set of active states after consuming one more symbol, recorded as a set (not a path); equal sets collapse to one node. Edges carry a flag for whether they were taken by a λ-move. The result drives the NFA-run visualization in the simulator.

## Simulation

File: `simulate.ts`.

- **NFA**: track the λ-closed set of active states; after each symbol, take `λ-closure(move(states, a))`. Accept if any final state is accepting. O(n · t) for input length n and t transitions.
- **DFA**: track a single state. Accept if the final state is accepting. O(n).

Both return a step-by-step trace so the UI can animate the run, and both agree on acceptance for the same language.

## KMP avoidance DFA

File: `avoidance.ts`. A DFA for "does not contain the substring X", built directly with the Knuth-Morris-Pratt failure function.

For a pattern of length n there are n+1 states. States `q0 … q(n-1)` are accepting (a partial match so far); `qn` is the trap (the pattern has appeared). On each symbol, advance on a match, or fall back through the failure function on a mismatch. For pattern `bba` over `{a, b}`, `q3` is the trap, so the machine accepts every string with no `bba` and rejects every string that contains one.

## Pattern templates

File: `core/patterns/templates.ts`. A library of templates (across categories such as position, repetition, counting, negation, and ordering) that turn a short description into a regex compatible with the parser, for example `starts_with('abc')` to `abc(a + b + c)*`. The hard cases that a simple regex cannot express, like "does not contain X", build a DFA directly through the avoidance construction.
