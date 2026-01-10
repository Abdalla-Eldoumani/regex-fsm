import { useState } from 'react'

interface TheorySection {
  title: string
  content: string
}

interface TheoryPanelProps {
  topic: 'nfa' | 'dfa' | 'regex' | 'thompson' | 'subset' | 'simulation'
}

const theoryContent: Record<string, TheorySection[]> = {
  nfa: [
    {
      title: 'Definition',
      content: 'A Nondeterministic Finite Automaton (NFA) is a 5-tuple (Q, Σ, δ, q₀, F) where Q is a finite set of states, Σ is the input alphabet, δ: Q × (Σ ∪ {ε}) → P(Q) is the transition function, q₀ ∈ Q is the start state, and F ⊆ Q is the set of accept states.',
    },
    {
      title: 'Properties',
      content: 'NFAs can have multiple transitions for the same input symbol from a given state. They can have epsilon (ε) transitions that allow state changes without consuming input. An NFA accepts a string if at least one computation path leads to an accept state.',
    },
    {
      title: 'Example',
      content: 'An NFA for the language (a|b)*abb has states that track the progress toward matching the suffix "abb". It uses nondeterminism to guess when the final "abb" sequence begins.',
    },
  ],
  dfa: [
    {
      title: 'Definition',
      content: 'A Deterministic Finite Automaton (DFA) is a 5-tuple (Q, Σ, δ, q₀, F) where Q is a finite set of states, Σ is the input alphabet, δ: Q × Σ → Q is the transition function, q₀ ∈ Q is the start state, and F ⊆ Q is the set of accept states.',
    },
    {
      title: 'Properties',
      content: 'DFAs have exactly one transition for each symbol from each state. No epsilon transitions exist. For any input, exactly one computation path exists. DFAs are equivalent in power to NFAs but may require exponentially more states.',
    },
    {
      title: 'Example',
      content: 'A DFA for the language (a|b)*abb requires states that remember the last two symbols read. Each state represents what suffix of "abb" has been matched so far.',
    },
  ],
  regex: [
    {
      title: 'Definition',
      content: 'Regular expressions define languages using operators: concatenation (ab), union (a|b), and Kleene star (a*). Additional operators like positive closure (a+) and optional (a?) are syntactic sugar.',
    },
    {
      title: 'Properties',
      content: 'Regular expressions define exactly the regular languages. Every regular expression can be converted to an equivalent NFA. Operator precedence: star > concatenation > union. Parentheses override precedence.',
    },
    {
      title: 'Example',
      content: 'The regex (a|b)*abb matches any string over {a,b} ending in "abb". The star applies to (a|b), allowing any prefix, followed by the literal suffix "abb".',
    },
  ],
  thompson: [
    {
      title: 'Definition',
      content: 'Thompson\'s construction converts a regular expression to an equivalent NFA recursively. Base cases handle empty string and single symbols. Recursive cases combine sub-NFAs using epsilon transitions.',
    },
    {
      title: 'Properties',
      content: 'The resulting NFA has exactly one start state with no incoming edges and one accept state with no outgoing edges. Each state has at most two outgoing transitions. The NFA has O(m) states for a regex of length m.',
    },
    {
      title: 'Example',
      content: 'For regex ab|c: Build NFAs for a, b, and c. Concatenate a and b using epsilon transitions. Build union of (ab) and c using epsilon transitions from new start state.',
    },
  ],
  subset: [
    {
      title: 'Definition',
      content: 'Subset construction (powerset construction) converts an NFA to an equivalent DFA. Each DFA state represents a set of NFA states. The DFA simulates all possible NFA computations in parallel.',
    },
    {
      title: 'Properties',
      content: 'The algorithm computes epsilon closures and move operations. DFA start state is ε-closure of NFA start state. For each DFA state S and symbol a: new state is ε-closure(move(S, a)). DFA may have up to 2ⁿ states for n-state NFA.',
    },
    {
      title: 'Example',
      content: 'For an NFA with states {q0, q1, q2}, the DFA might have states like {q0}, {q0,q1}, {q1,q2}, representing all reachable NFA state combinations.',
    },
  ],
  simulation: [
    {
      title: 'Definition',
      content: 'Simulation runs an automaton on an input string to determine acceptance. NFA simulation tracks a set of possible states. DFA simulation tracks a single current state.',
    },
    {
      title: 'Properties',
      content: 'NFA simulation: Initialize with ε-closure of start state. For each input symbol, compute move then ε-closure. Accept if any final state is in accept set. DFA simulation: Start at q₀. For each symbol, follow unique transition. Accept if final state is in F.',
    },
    {
      title: 'Example',
      content: 'Simulating "abb" on an NFA for (a|b)*abb: Start in {q0}. Read "a": move to {q0,q1}. Read "b": move to {q0,q2}. Read "b": move to {q0,q3}. Accept since q3 is an accept state.',
    },
  ],
}

export function TheoryPanel({ topic }: TheoryPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]))

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSections(newExpanded)
  }

  const sections = theoryContent[topic] || []

  const topicTitles: Record<string, string> = {
    nfa: 'Nondeterministic Finite Automaton (NFA)',
    dfa: 'Deterministic Finite Automaton (DFA)',
    regex: 'Regular Expressions',
    thompson: 'Thompson\'s Construction',
    subset: 'Subset Construction',
    simulation: 'Automaton Simulation',
  }

  return (
    <div className="p-4 bg-surface0 rounded-lg">
      <h3 className="text-lg font-semibold text-text mb-4">{topicTitles[topic]}</h3>
      <div className="space-y-2">
        {sections.map((section, index) => (
          <div key={index} className="border border-overlay0 rounded">
            <button
              onClick={() => toggleSection(index)}
              className="w-full px-4 py-2 text-left flex items-center justify-between hover:bg-surface1 transition-colors"
            >
              <span className="font-medium text-text">{section.title}</span>
              <span className="text-subtext0">
                {expandedSections.has(index) ? '−' : '+'}
              </span>
            </button>
            {expandedSections.has(index) && (
              <div className="px-4 py-3 bg-base text-sm text-subtext1 leading-relaxed border-t border-overlay0">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
