export interface PatternTemplate {
  id: string
  name: string
  description: string
  category: 'basic' | 'position' | 'repetition' | 'character' | 'combination'
  buildRegex: (...args: string[]) => string
  parameters: {
    name: string
    placeholder: string
    description: string
  }[]
}

export const patternTemplates: PatternTemplate[] = [
  {
    id: 'starts_with',
    name: 'Starts with',
    description: 'Matches strings that begin with a specific pattern',
    category: 'position',
    buildRegex: (pattern: string) => `${pattern}.*`,
    parameters: [
      {
        name: 'pattern',
        placeholder: 'abc',
        description: 'The pattern the string must start with',
      },
    ],
  },
  {
    id: 'ends_with',
    name: 'Ends with',
    description: 'Matches strings that end with a specific pattern',
    category: 'position',
    buildRegex: (pattern: string) => `.*${pattern}`,
    parameters: [
      {
        name: 'pattern',
        placeholder: 'xyz',
        description: 'The pattern the string must end with',
      },
    ],
  },
  {
    id: 'contains',
    name: 'Contains',
    description: 'Matches strings that contain a specific pattern anywhere',
    category: 'position',
    buildRegex: (pattern: string) => `.*${pattern}.*`,
    parameters: [
      {
        name: 'pattern',
        placeholder: 'abc',
        description: 'The pattern the string must contain',
      },
    ],
  },
  {
    id: 'exactly',
    name: 'Exactly',
    description: 'Matches strings that are exactly the specified pattern',
    category: 'basic',
    buildRegex: (pattern: string) => pattern,
    parameters: [
      {
        name: 'pattern',
        placeholder: 'abc',
        description: 'The exact pattern to match',
      },
    ],
  },
  {
    id: 'alternation',
    name: 'Either/Or',
    description: 'Matches strings containing either pattern A or pattern B',
    category: 'combination',
    buildRegex: (patternA: string, patternB: string) => `(${patternA}|${patternB})`,
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
    parameters: [
      {
        name: 'chars',
        placeholder: 'abc',
        description: 'Characters to match (e.g., abc)',
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
  }

  patternTemplates.forEach((template) => {
    categories[template.category].push(template)
  })

  return categories
}

export function getTemplateById(id: string): PatternTemplate | undefined {
  return patternTemplates.find((t) => t.id === id)
}
