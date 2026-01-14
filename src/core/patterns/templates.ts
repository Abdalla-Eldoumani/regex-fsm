export interface PatternTemplate {
  id: string
  name: string
  description: string
  category: 'basic' | 'position' | 'repetition' | 'character' | 'combination' | 'length' | 'counting' | 'negation' | 'ordering'
  buildRegex: (...args: string[]) => string
  parameters: {
    name: string
    placeholder: string
    description: string
  }[]
  parserCompatible?: boolean  // Whether this pattern works with our simplified parser
}

export const patternTemplates: PatternTemplate[] = [
  // Basic patterns
  {
    id: 'exactly',
    name: 'Exactly',
    description: 'Matches strings that are exactly the specified pattern',
    category: 'basic',
    buildRegex: (pattern: string) => pattern,
    parserCompatible: true,
    parameters: [
      {
        name: 'pattern',
        placeholder: 'abc',
        description: 'The exact pattern to match',
      },
    ],
  },
  {
    id: 'empty_string',
    name: 'Empty string',
    description: 'Matches only the empty string (λ)',
    category: 'basic',
    buildRegex: () => 'λ',
    parserCompatible: true,
    parameters: [],
  },

  // Position patterns
  {
    id: 'starts_with',
    name: 'Starts with',
    description: 'Matches strings that begin with a specific pattern',
    category: 'position',
    buildRegex: (pattern: string) => `${pattern}(a|b|c)*`,
    parserCompatible: true,
    parameters: [
      {
        name: 'pattern',
        placeholder: 'a',
        description: 'The pattern the string must start with',
      },
    ],
  },
  {
    id: 'ends_with',
    name: 'Ends with',
    description: 'Matches strings that end with a specific pattern',
    category: 'position',
    buildRegex: (pattern: string) => `(a|b|c)*${pattern}`,
    parserCompatible: true,
    parameters: [
      {
        name: 'pattern',
        placeholder: 'c',
        description: 'The pattern the string must end with',
      },
    ],
  },
  {
    id: 'starts_and_ends',
    name: 'Starts with X and ends with Y',
    description: 'Matches strings that begin with one pattern and end with another',
    category: 'position',
    buildRegex: (start: string, end: string) => `${start}(a|b|c)*${end}`,
    parserCompatible: true,
    parameters: [
      {
        name: 'start',
        placeholder: 'a',
        description: 'Pattern at the start',
      },
      {
        name: 'end',
        placeholder: 'c',
        description: 'Pattern at the end',
      },
    ],
  },
  {
    id: 'contains',
    name: 'Contains substring',
    description: 'Matches strings that contain a specific substring anywhere',
    category: 'position',
    buildRegex: (pattern: string) => `(a|b|c)*${pattern}(a|b|c)*`,
    parserCompatible: true,
    parameters: [
      {
        name: 'pattern',
        placeholder: 'ab',
        description: 'The substring that must appear',
      },
    ],
  },
  // Combination patterns
  {
    id: 'alternation',
    name: 'Either/Or (union)',
    description: 'Matches strings containing either pattern A or pattern B',
    category: 'combination',
    buildRegex: (patternA: string, patternB: string) => `(${patternA}|${patternB})`,
    parserCompatible: true,
    parameters: [
      {
        name: 'patternA',
        placeholder: 'a',
        description: 'First alternative pattern',
      },
      {
        name: 'patternB',
        placeholder: 'b',
        description: 'Second alternative pattern',
      },
    ],
  },
  {
    id: 'concatenation',
    name: 'Followed by',
    description: 'Matches pattern A immediately followed by pattern B',
    category: 'combination',
    buildRegex: (patternA: string, patternB: string) => `${patternA}${patternB}`,
    parserCompatible: true,
    parameters: [
      {
        name: 'patternA',
        placeholder: 'a',
        description: 'First pattern',
      },
      {
        name: 'patternB',
        placeholder: 'b',
        description: 'Second pattern',
      },
    ],
  },
  {
    id: 'zero_or_more',
    name: 'Zero or more',
    description: 'Matches zero or more repetitions of a pattern (Kleene star)',
    category: 'repetition',
    buildRegex: (pattern: string) => `(${pattern})*`,
    parserCompatible: true,
    parameters: [
      {
        name: 'pattern',
        placeholder: 'a',
        description: 'Pattern to repeat zero or more times',
      },
    ],
  },
  {
    id: 'one_or_more',
    name: 'One or more',
    description: 'Matches one or more repetitions of a pattern',
    category: 'repetition',
    buildRegex: (pattern: string) => `(${pattern})+`,
    parserCompatible: true,
    parameters: [
      {
        name: 'pattern',
        placeholder: 'a',
        description: 'Pattern to repeat one or more times',
      },
    ],
  },
  {
    id: 'optional',
    name: 'Optional',
    description: 'Matches zero or one occurrence of a pattern',
    category: 'repetition',
    buildRegex: (pattern: string) => `(${pattern})?`,
    parserCompatible: true,
    parameters: [
      {
        name: 'pattern',
        placeholder: 'a',
        description: 'Optional pattern',
      },
    ],
  },
  {
    id: 'any_single',
    name: 'Any single character',
    description: 'Matches any single character from the alphabet',
    category: 'character',
    buildRegex: (chars: string) => `(${chars.split('').join('|')})`,
    parserCompatible: true,
    parameters: [
      {
        name: 'chars',
        placeholder: 'abc',
        description: 'Characters to match (e.g., abc)',
      },
    ],
  },

  // Length patterns
  {
    id: 'even_length',
    name: 'Even length strings',
    description: 'Matches all strings of even length (including empty string)',
    category: 'length',
    buildRegex: (alphabet: string) => {
      const chars = alphabet.split('').join('|')
      return `((${chars})(${chars}))*`
    },
    parserCompatible: true,
    parameters: [
      {
        name: 'alphabet',
        placeholder: 'ab',
        description: 'Alphabet to use (e.g., ab)',
      },
    ],
  },
  {
    id: 'odd_length',
    name: 'Odd length strings',
    description: 'Matches all strings of odd length',
    category: 'length',
    buildRegex: (alphabet: string) => {
      const chars = alphabet.split('').join('|')
      return `(${chars})((${chars})(${chars}))*`
    },
    parserCompatible: true,
    parameters: [
      {
        name: 'alphabet',
        placeholder: 'ab',
        description: 'Alphabet to use (e.g., ab)',
      },
    ],
  },
  {
    id: 'exact_length',
    name: 'Exact length',
    description: 'Matches all strings of exactly N characters',
    category: 'length',
    buildRegex: (alphabet: string, length: string) => {
      const chars = alphabet.split('').join('|')
      const n = parseInt(length)
      if (n === 0) return 'λ'
      return `(${chars})`.repeat(n)
    },
    parserCompatible: true,
    parameters: [
      {
        name: 'alphabet',
        placeholder: 'ab',
        description: 'Alphabet to use (e.g., ab)',
      },
      {
        name: 'length',
        placeholder: '3',
        description: 'Exact length (e.g., 3)',
      },
    ],
  },

  // Negation patterns
  {
    id: 'not_starts_with',
    name: 'Does not start with',
    description: 'Matches strings that do not begin with a specific pattern',
    category: 'negation',
    buildRegex: (pattern: string, alphabet: string) => {
      const chars = alphabet.split('').filter(c => c !== pattern).join('|')
      if (!chars) return 'λ'
      return `((${chars})(a|b|c)*|λ)`
    },
    parserCompatible: true,
    parameters: [
      {
        name: 'pattern',
        placeholder: 'a',
        description: 'Pattern to avoid at start',
      },
      {
        name: 'alphabet',
        placeholder: 'abc',
        description: 'Full alphabet (e.g., abc)',
      },
    ],
  },
  {
    id: 'not_ends_with',
    name: 'Does not end with',
    description: 'Matches strings that do not end with a specific pattern',
    category: 'negation',
    buildRegex: (pattern: string, alphabet: string) => {
      const chars = alphabet.split('').filter(c => c !== pattern).join('|')
      if (!chars) return 'λ'
      return `((a|b|c)*(${chars})|λ)`
    },
    parserCompatible: true,
    parameters: [
      {
        name: 'pattern',
        placeholder: 'c',
        description: 'Pattern to avoid at end',
      },
      {
        name: 'alphabet',
        placeholder: 'abc',
        description: 'Full alphabet (e.g., abc)',
      },
    ],
  },
  {
    id: 'not_contains',
    name: 'Does not contain',
    description: 'Matches strings that do not contain a specific substring',
    category: 'negation',
    buildRegex: (pattern: string, alphabet: string) => {
      // For simple case: if pattern is single char, avoid it entirely
      if (pattern.length === 1) {
        const chars = alphabet.split('').filter(c => c !== pattern).join('|')
        if (!chars) return 'λ'
        return `(${chars})*`
      }
      // For multi-char patterns, this gets complex - provide simple alternation
      const chars = alphabet.split('').filter(c => !pattern.includes(c)).join('|')
      if (!chars) return 'λ'
      return `(${chars})*`
    },
    parserCompatible: true,
    parameters: [
      {
        name: 'pattern',
        placeholder: 'a',
        description: 'Pattern to avoid',
      },
      {
        name: 'alphabet',
        placeholder: 'abc',
        description: 'Full alphabet (e.g., abc)',
      },
    ],
  },

  // Counting patterns
  {
    id: 'exactly_n_occurrences',
    name: 'Exactly N occurrences',
    description: 'Matches strings with exactly N occurrences of a specific character',
    category: 'counting',
    buildRegex: (char: string, count: string, alphabet: string) => {
      const n = parseInt(count)
      const other = alphabet.split('').filter(c => c !== char).join('|')
      if (n === 0) {
        return other ? `(${other})*` : 'λ'
      }
      // Pattern: other* char other* char ... other* (n times char)
      const parts = []
      for (let i = 0; i < n; i++) {
        parts.push(other ? `(${other})*${char}` : char)
      }
      return parts.join('') + (other ? `(${other})*` : '')
    },
    parserCompatible: true,
    parameters: [
      {
        name: 'char',
        placeholder: 'a',
        description: 'Character to count',
      },
      {
        name: 'count',
        placeholder: '3',
        description: 'Exact count (e.g., 3)',
      },
      {
        name: 'alphabet',
        placeholder: 'ab',
        description: 'Full alphabet (e.g., ab)',
      },
    ],
  },
  {
    id: 'at_least_n_occurrences',
    name: 'At least N occurrences',
    description: 'Matches strings with at least N occurrences of a specific character',
    category: 'counting',
    buildRegex: (char: string, count: string, alphabet: string) => {
      const n = parseInt(count)
      const chars = alphabet.split('').join('|')
      const other = alphabet.split('').filter(c => c !== char).join('|')

      if (n === 0) {
        return `(${chars})*`
      }
      // Pattern: (any)* char (any)* char ... (any)* (n times char) (any)*
      const parts = []
      for (let i = 0; i < n; i++) {
        parts.push(other ? `(${other})*${char}` : `(${chars})*${char}`)
      }
      return parts.join('') + `(${chars})*`
    },
    parserCompatible: true,
    parameters: [
      {
        name: 'char',
        placeholder: 'a',
        description: 'Character to count',
      },
      {
        name: 'count',
        placeholder: '2',
        description: 'Minimum count (e.g., 2)',
      },
      {
        name: 'alphabet',
        placeholder: 'ab',
        description: 'Full alphabet (e.g., ab)',
      },
    ],
  },

  // Ordering patterns
  {
    id: 'no_x_before_y',
    name: 'No X before Y',
    description: 'Matches strings where character X never precedes character Y',
    category: 'ordering',
    buildRegex: (charX: string, charY: string, alphabet: string) => {
      const other = alphabet.split('').filter(c => c !== charX && c !== charY).join('|')
      // Pattern: either no Y appears, or all X's appear after all Y's
      // Strategy: (other|Y)* (other|X)*
      const beforeY = other ? `(${other}|${charY})*` : `${charY}*`
      const afterY = other ? `(${other}|${charX})*` : `${charX}*`
      return `${beforeY}${afterY}`
    },
    parserCompatible: true,
    parameters: [
      {
        name: 'charX',
        placeholder: 'a',
        description: 'Character that should not precede (X)',
      },
      {
        name: 'charY',
        placeholder: 'b',
        description: 'Character that should not follow (Y)',
      },
      {
        name: 'alphabet',
        placeholder: 'abc',
        description: 'Full alphabet (e.g., abc)',
      },
    ],
  },
  {
    id: 'all_x_before_y',
    name: 'All X before Y',
    description: 'Matches strings where all X\'s appear before any Y',
    category: 'ordering',
    buildRegex: (charX: string, charY: string, alphabet: string) => {
      const other = alphabet.split('').filter(c => c !== charX && c !== charY).join('|')
      // Pattern: (other|X)* (other|Y)*
      const withX = other ? `(${other}|${charX})*` : `${charX}*`
      const withY = other ? `(${other}|${charY})*` : `${charY}*`
      return `${withX}${withY}`
    },
    parserCompatible: true,
    parameters: [
      {
        name: 'charX',
        placeholder: 'a',
        description: 'Character that comes first (X)',
      },
      {
        name: 'charY',
        placeholder: 'b',
        description: 'Character that comes after (Y)',
      },
      {
        name: 'alphabet',
        placeholder: 'abc',
        description: 'Full alphabet (e.g., abc)',
      },
    ],
  },
]

export function getCategorizedTemplates() {
  const categories: Record<string, PatternTemplate[]> = {
    basic: [],
    position: [],
    repetition: [],
    character: [],
    combination: [],
    length: [],
    counting: [],
    negation: [],
    ordering: [],
  }

  patternTemplates.forEach((template) => {
    categories[template.category].push(template)
  })

  return categories
}

export function getTemplateById(id: string): PatternTemplate | undefined {
  return patternTemplates.find((t) => t.id === id)
}
