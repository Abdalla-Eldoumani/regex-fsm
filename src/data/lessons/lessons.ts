import type { Lesson } from '@/types/tour'

// Concept lessons re-authored from the salvaged teaching prose. The teaching
// content is kept; the old DOM-anchoring field is dropped, since a lesson is
// pure data and navigates by route, not by probing a node. Every
// learner-facing string uses course notation: + for union, λ for the empty
// string, Σ for the alphabet, ∅ for the empty set, and the (Q, Σ, δ, q₀, A)
// quintuple. Symbolic fragments are plain text here; the dialog renders them
// font-mono. Lecture references are preserved only where the legacy steps
// carried one.

// 1. Regex and the builder.
export const regexLesson: Lesson = {
  id: 'regex',
  title: 'Regular expressions and the builder',
  body:
    'A regular expression denotes a language over an alphabet Σ. The builder reads one and constructs the automaton beside it.\n\n' +
    'Course notation: + is union, so a + b matches a or b. Concatenation is implicit, so ab matches a then b. * is the Kleene star (zero or more). λ is the empty string. Σ is the set of input symbols.\n\n' +
    'Type a pattern such as (a + b)*abb and watch the construction follow.',
  route: '/',
}

// 2. Thompson NFA.
export const thompsonLesson: Lesson = {
  id: 'thompson',
  title: 'Thompson construction: regex to NFA',
  body:
    'Thompson construction turns the parse tree into an NFA one fragment at a time. Every fragment has exactly one start state and one accept state.\n\n' +
    'A single symbol a is start --a--> accept. λ is start --λ--> accept. Union R + S adds a new start and a new accept joined by λ-transitions into each branch. Concatenation RS links the accept of R to the start of S by a λ-transition. The star R* adds a loop back and a λ skip past the fragment.\n\n' +
    'The result is an NFA (Q, Σ, δ, q₀, A) whose size is linear in the length of the regex.',
  route: '/',
  lectureRef: 'Definition 4.3',
}

// 3. λ-closure.
export const lambdaClosureLesson: Lesson = {
  id: 'lambda-closure',
  title: 'λ-closure',
  body:
    'The λ-closure of a set of states S is every state reachable from S by following zero or more λ-transitions. S is always in its own closure.\n\n' +
    'It is computed with a worklist: start with S, and for each state popped, add every λ-successor not yet seen. Checking membership before adding stops λ-cycles from looping forever.\n\n' +
    'λ-closure is the bridge from the NFA to the subset DFA and the step that drives NFA simulation.',
  route: '/',
  lectureRef: 'Definition 4.5',
}

// 4. Subset DFA.
export const subsetLesson: Lesson = {
  id: 'subset',
  title: 'Subset construction: NFA to DFA',
  body:
    'Subset construction (the powerset construction) makes a DFA whose every state is a SET of NFA states. The start state is the λ-closure of {q₀}.\n\n' +
    'For a state S and a symbol a, the next state is the λ-closure of the move set: every NFA state reachable from a member of S on a. When that set is empty the transition goes to the trap state ∅, which self-loops on every symbol. A DFA state is accepting when it contains any NFA accept state.\n\n' +
    'The DFA can have up to 2^n states for an n-state NFA, so the construction can blow up.',
  route: '/multi',
  lectureRef: 'Theorem 4.2',
}

// 5. Minimization.
export const minimizeLesson: Lesson = {
  id: 'minimize',
  title: 'DFA minimization',
  body:
    'Moore partition refinement finds the unique smallest DFA for a language by merging states that behave identically on every input.\n\n' +
    'Begin with two blocks: the accepting states and the non-accepting states. Then repeat: split any block whose members disagree on which block a symbol leads to. When no block can be split, each remaining block becomes one state of the minimized DFA.\n\n' +
    'Minimization preserves the language exactly; it only removes redundant states.',
  route: '/multi',
}

// 6. NFA to regex by state elimination.
export const nfaToRegexLesson: Lesson = {
  id: 'nfa-to-regex',
  title: 'NFA to regex by state elimination',
  body:
    'State elimination converts an automaton back into a single regular expression by deleting states one at a time and relabelling edges with regexes.\n\n' +
    'When state q is removed, every path through it is rewritten directly between its neighbours. The new label from state i to state j is R_ij + R_iq (R_qq)* R_qj: the old direct route, plus the detour into q, around its self-loop any number of times, and out to j.\n\n' +
    'When only the start and accept remain, the surviving label is the regex for the language.',
  route: '/n2r',
}

// 7. Closure constructions.
export const closureLesson: Lesson = {
  id: 'closure',
  title: 'Closure constructions',
  body:
    'The regular languages are closed under union, intersection, and complement, and each closure is a construction you can run.\n\n' +
    'Union and intersection use the product automaton: states are pairs, and a pair accepts when either component accepts (union) or both accept (intersection). Complement first completes the DFA, adding the trap state ∅ for missing transitions, then flips accepting and non-accepting states. Completing first matters: flipping an incomplete DFA gives the wrong language.\n\n' +
    'Each construction yields a DFA for the combined language.',
  route: '/closure',
}

// 8. Pumping lemma.
export const pumpingLesson: Lesson = {
  id: 'pumping',
  title: 'The pumping lemma',
  body:
    'The pumping lemma proves a language is NOT regular. It is an adversarial argument played in a fixed order.\n\n' +
    'If a language is regular there is a pumping length p. For any string in the language of length at least p, it splits as xyz with y non-empty and xy within the first p symbols, and every xy^i z for i = 0, 1, 2, ... stays in the language. To prove non-regularity, take a worst-case string, and for every legal split exhibit one i whose pumped string leaves the language. That contradiction means no such p exists.\n\n' +
    'Play the round: the tool picks p and a split, you pick the string and the exponent that breaks it.',
  route: '/pumping',
}

// Ordered course sequence. λ-closure sits between Thompson and subset because
// it is the operation the subset construction depends on.
export const lessons: Lesson[] = [
  regexLesson,
  thompsonLesson,
  lambdaClosureLesson,
  subsetLesson,
  minimizeLesson,
  nfaToRegexLesson,
  closureLesson,
  pumpingLesson,
]
