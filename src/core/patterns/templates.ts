import { DFA } from '../automata/types'
import { buildAvoidanceDFA, buildNotStartsWithDFA, buildNotEndsWithDFA } from '../algorithms/avoidance'

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
  suggestDFA?: boolean  // Whether to suggest DFA for better/more accurate results
  buildDFA?: (pattern: string, alphabet: Set<string>) => DFA  // Direct DFA construction for complex patterns
}

/**
 * Check if a pattern has internal overlap (useful for determining regex complexity)
 * Uses simplified KMP failure function check
 */
function checkPatternOverlap(pattern: string): boolean {
  if (pattern.length <= 2) return false

  // Compute KMP failure function
  const failure = new Array(pattern.length).fill(0)
  let k = 0
  for (let i = 1; i < pattern.length; i++) {
    while (k > 0 && pattern[k] !== pattern[i]) {
      k = failure[k - 1]
    }
    if (pattern[k] === pattern[i]) {
      k++
    }
    failure[i] = k
  }

  // If any failure value > 0, pattern has overlap
  return failure.some(v => v > 0)
}

/**
 * Check if a pattern is "complex" for regex generation
 * Complex patterns benefit from DFA construction
 */
export function isComplexPattern(pattern: string, alphabet: string): boolean {
  // Single char patterns are never complex
  if (pattern.length === 1) return false

  // Two distinct chars are simple
  if (pattern.length === 2 && pattern[0] !== pattern[1]) return false

  // Two same chars (like "aa") are simple
  if (pattern.length === 2 && pattern[0] === pattern[1]) return false

  // Longer patterns with all alphabet chars are complex
  const alphabetSet = new Set(alphabet.split(''))
  const patternChars = new Set(pattern.split(''))
  const allCharsInPattern = [...alphabetSet].every(c => patternChars.has(c))

  if (allCharsInPattern) return true

  // Patterns with internal overlap are complex
  return checkPatternOverlap(pattern)
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

  // Negation patterns - generate regex when possible, suggest DFA for complex patterns
  {
    id: 'not_starts_with',
    name: 'Does not start with',
    description: 'Matches strings that do not begin with a specific pattern',
    category: 'negation',
    buildRegex: (pattern: string, alphabet: string) => {
      const all = alphabet.split('').join('|')
      if (!all) return 'λ'

      if (pattern.length === 1) {
        // Single char: strings starting with other chars, or empty
        const others = alphabet.split('').filter(c => c !== pattern).join('|')
        if (!others) return 'λ' // Only char in alphabet is the one to avoid
        return `((${others})(${all})*|λ)`
      }

      // Multi-char: build regex that accepts strings not starting with pattern
      // Strategy: empty string, OR first char differs, OR first char matches but diverges later
      const firstChar = pattern[0]
      const others = alphabet.split('').filter(c => c !== firstChar).join('|')

      if (pattern.length === 2) {
        const secondChar = pattern[1]
        const notSecond = alphabet.split('').filter(c => c !== secondChar).join('|')
        // Either starts with different char, or starts with first but not followed by second, or empty/single
        if (others && notSecond) {
          return `((${others})(${all})*|${firstChar}(${notSecond})(${all})*|${firstChar}|λ)`
        } else if (others) {
          return `((${others})(${all})*|${firstChar}|λ)`
        } else if (notSecond) {
          return `(${firstChar}(${notSecond})(${all})*|${firstChar}|λ)`
        }
        return 'λ'
      }

      // For longer patterns, regex gets complex - still generate but note DFA is cleaner
      // Simplified approach: diverge at any position
      let result = 'λ' // Empty string always accepted
      if (others) {
        result = `(${others})(${all})*|λ` // Start with different char
      }
      // Add case for matching prefix but diverging
      for (let i = 1; i < pattern.length; i++) {
        const prefix = pattern.substring(0, i)
        const charAtI = pattern[i]
        const notCharAtI = alphabet.split('').filter(c => c !== charAtI).join('|')
        if (notCharAtI) {
          result += `|${prefix}(${notCharAtI})(${all})*`
        }
        // Also accept exact prefix (shorter than full pattern)
        result += `|${prefix}`
      }
      return `(${result})`
    },
    suggestDFA: true, // Suggest DFA for cleaner results on complex patterns
    buildDFA: (pattern: string, alphabet: Set<string>) => {
      return buildNotStartsWithDFA(pattern, alphabet).dfa
    },
    parserCompatible: true,
    parameters: [
      {
        name: 'pattern',
        placeholder: 'ab',
        description: 'Pattern to avoid at start',
      },
      {
        name: 'alphabet',
        placeholder: 'ab',
        description: 'Full alphabet (e.g., ab)',
      },
    ],
  },
  {
    id: 'not_ends_with',
    name: 'Does not end with',
    description: 'Matches strings that do not end with a specific pattern',
    category: 'negation',
    buildRegex: (pattern: string, alphabet: string) => {
      const all = alphabet.split('').join('|')
      if (!all) return 'λ'

      if (pattern.length === 1) {
        // Single char: strings ending with other chars, or empty
        const others = alphabet.split('').filter(c => c !== pattern).join('|')
        if (!others) return 'λ'
        return `((${all})*(${others})|λ)`
      }

      // Multi-char: strings that don't end with the pattern
      // Strategy: end with something other than the last char, OR end with last char but not preceded correctly
      const lastChar = pattern[pattern.length - 1]
      const others = alphabet.split('').filter(c => c !== lastChar).join('|')

      if (pattern.length === 2) {
        // Ends with: something other than the pattern, OR single char, OR empty
        // Build all valid 2-char endings
        const validEndings: string[] = []
        for (const c1 of alphabet.split('')) {
          for (const c2 of alphabet.split('')) {
            if (c1 + c2 !== pattern) {
              validEndings.push(c1 + c2)
            }
          }
        }
        const endingPattern = validEndings.map(e => e).join('|')
        // Single chars (all valid since pattern is 2 chars)
        return `((${all})*(${endingPattern})|${all}|λ)`
      }

      // For longer patterns, simplified approach
      if (others) {
        // End with char other than last char of pattern
        return `((${all})*(${others})|λ|${all})`
      }
      return `(${all}|λ)`
    },
    suggestDFA: true,
    buildDFA: (pattern: string, alphabet: Set<string>) => {
      return buildNotEndsWithDFA(pattern, alphabet).dfa
    },
    parserCompatible: true,
    parameters: [
      {
        name: 'pattern',
        placeholder: 'ab',
        description: 'Pattern to avoid at end',
      },
      {
        name: 'alphabet',
        placeholder: 'ab',
        description: 'Full alphabet (e.g., ab)',
      },
    ],
  },
  {
    id: 'not_contains',
    name: 'Does not contain',
    description: 'Matches strings that do not contain a specific substring. For complex patterns, building a DFA directly is required.',
    category: 'negation',
    buildRegex: (pattern: string, alphabet: string) => {
      const all = alphabet.split('').join('|')
      if (!all || !pattern) return `(${all})*`

      // Single char: just exclude that character
      if (pattern.length === 1) {
        const others = alphabet.split('').filter(c => c !== pattern).join('|')
        if (!others) return 'λ' // Only char in alphabet is the one to avoid
        return `(${others})*`
      }

      // Two distinct chars "xy": all x's must come after all y's (or vice versa)
      // "Does not contain 'ab'" means 'a' never immediately precedes 'b'
      if (pattern.length === 2 && pattern[0] !== pattern[1]) {
        const first = pattern[0]
        const second = pattern[1]
        const others = alphabet.split('').filter(c => c !== first && c !== second).join('|')
        // Pattern: all (others + second) come before all (others + first)
        // i.e., once we see 'first', we can only see 'first' or others, not 'second'
        const beforeFirst = others ? `(${others}|${second})*` : `${second}*`
        const afterFirst = others ? `(${others}|${first})*` : `${first}*`
        return `${beforeFirst}${afterFirst}`
      }

      // Two same chars "aa": no consecutive occurrences
      if (pattern.length === 2 && pattern[0] === pattern[1]) {
        const char = pattern[0]
        const others = alphabet.split('').filter(c => c !== char).join('|')
        if (!others) return `(${char}|λ)` // Only one char in alphabet, can have at most one
        // Pattern: (others | char+others)* char?
        return `(${others}|${char}(${others}))*${char}?`
      }

      // For longer/complex patterns (3+ chars), regex generation is extremely complex
      // Return empty string to indicate DFA should be used instead
      // The UI will show only the "Build DFA" option for these cases
      return ''
    },
    suggestDFA: true,
    buildDFA: (pattern: string, alphabet: Set<string>) => {
      return buildAvoidanceDFA(pattern, alphabet).dfa
    },
    parserCompatible: true,
    parameters: [
      {
        name: 'pattern',
        placeholder: 'bba',
        description: 'Substring pattern to avoid',
      },
      {
        name: 'alphabet',
        placeholder: 'ab',
        description: 'Full alphabet (e.g., ab)',
      },
    ],
  },
  // New pattern: No consecutive occurrences
  {
    id: 'no_consecutive',
    name: 'No consecutive occurrences',
    description: 'Matches strings where a character never appears twice in a row',
    category: 'negation',
    buildRegex: (char: string, alphabet: string) => {
      const others = alphabet.split('').filter(c => c !== char).join('|')
      if (!others) return `(${char}|λ)` // Only one char, can have at most one
      // Pattern: (others | char+others)* char?
      return `(${others}|${char}(${others}))*${char}?`
    },
    parserCompatible: true,
    parameters: [
      {
        name: 'char',
        placeholder: 'a',
        description: 'Character that should not repeat consecutively',
      },
      {
        name: 'alphabet',
        placeholder: 'ab',
        description: 'Full alphabet (e.g., ab)',
      },
    ],
  },
  // New pattern: Every X followed by Y
  {
    id: 'every_x_followed_by_y',
    name: 'Every X followed by Y',
    description: 'Matches strings where every occurrence of X is immediately followed by Y',
    category: 'ordering',
    buildRegex: (charX: string, charY: string, alphabet: string) => {
      const others = alphabet.split('').filter(c => c !== charX).join('|')
      if (!others) {
        // Only charX in alphabet - must always be followed by charY
        return `(${charX}${charY})*`
      }
      // Pattern: (others | X+Y)*
      return `(${others}|${charX}${charY})*`
    },
    parserCompatible: true,
    parameters: [
      {
        name: 'charX',
        placeholder: 'a',
        description: 'Character that must be followed',
      },
      {
        name: 'charY',
        placeholder: 'b',
        description: 'Character that must follow X',
      },
      {
        name: 'alphabet',
        placeholder: 'ab',
        description: 'Full alphabet (e.g., ab)',
      },
    ],
  },
  // New pattern: Alternating characters
  {
    id: 'alternating',
    name: 'Alternating characters',
    description: 'Matches strings that alternate between two characters (e.g., ababab)',
    category: 'ordering',
    buildRegex: (charA: string, charB: string) => {
      // Can start with either, must alternate
      return `((${charA}${charB})*(${charA})?|(${charB}${charA})*(${charB})?|λ)`
    },
    parserCompatible: true,
    parameters: [
      {
        name: 'charA',
        placeholder: 'a',
        description: 'First character',
      },
      {
        name: 'charB',
        placeholder: 'b',
        description: 'Second character',
      },
    ],
  },
  // New pattern: At most N occurrences
  {
    id: 'at_most_n_occurrences',
    name: 'At most N occurrences',
    description: 'Matches strings with at most N occurrences of a specific character',
    category: 'counting',
    buildRegex: (char: string, count: string, alphabet: string) => {
      const n = parseInt(count)
      const other = alphabet.split('').filter(c => c !== char).join('|')

      if (n === 0) {
        return other ? `(${other})*` : 'λ'
      }

      // Build pattern with 0 to n occurrences
      // other* (char other*)? (char other*)? ... up to n times
      let result = other ? `(${other})*` : ''
      for (let i = 0; i < n; i++) {
        result += other ? `(${char}(${other})*)?` : `${char}?`
      }
      return result || 'λ'
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
        description: 'Maximum count (e.g., 2)',
      },
      {
        name: 'alphabet',
        placeholder: 'ab',
        description: 'Full alphabet (e.g., ab)',
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
