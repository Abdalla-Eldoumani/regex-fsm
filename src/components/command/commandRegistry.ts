import type { NavigateFunction } from 'react-router-dom'

// The command palette registry: pure data plus two builders, no React and no
// DOM, so it is unit-testable on its own. A command is an id, a learner-facing
// label, optional extra filter keywords, and a run thunk. The palette wraps each
// run so it also closes the palette; the builders here only describe the action.
export interface Command {
  id: string
  // Learner-facing label. May carry course glyphs (the NFA-to-Regex arrow).
  label: string
  // Extra filter terms, space-separated, matched as data alongside the label.
  keywords?: string
  run: () => void
}

// The eight navigation targets, in main.tsx route order. The path is the fixed
// allow-list string, never interpolated from user input, so a command can only
// ever navigate to a known in-app route. The arrow in the NFA-to-Regex label is
// the course glyph used by the header nav (U+2192).
const NAVIGATION_TARGETS: { id: string; path: string; label: string; keywords: string }[] = [
  { id: 'nav-home', path: '/', label: 'Home', keywords: 'go nav route home regex thompson start landing' },
  { id: 'nav-editor', path: '/editor', label: 'Editor', keywords: 'go nav route editor build automaton states transitions draw' },
  { id: 'nav-multi', path: '/multi', label: 'Multi-View', keywords: 'go nav route multi view nfa dfa minimized compare side' },
  { id: 'nav-n2r', path: '/n2r', label: 'NFA → Regex', keywords: 'go nav route nfa regex elimination gnfa convert state removal' },
  { id: 'nav-closure', path: '/closure', label: 'Closure', keywords: 'go nav route closure union intersection complement star concatenation' },
  { id: 'nav-pumping', path: '/pumping', label: 'Pumping', keywords: 'go nav route pumping lemma game nonregular proof adversary' },
  { id: 'nav-challenges', path: '/challenges', label: 'Challenges', keywords: 'go nav route challenges exercises build practice grade' },
  { id: 'nav-simulate', path: '/simulate', label: 'Simulate', keywords: 'go nav route simulate run trace input tape step accept reject' },
]

// One navigation command per allow-list route. Each run navigates the fixed
// path; navigate is never called with a user-provided string.
export function buildNavigationCommands(navigate: NavigateFunction): Command[] {
  return NAVIGATION_TARGETS.map(target => ({
    id: target.id,
    label: target.label,
    keywords: target.keywords,
    run: () => navigate(target.path),
  }))
}

// The two genuinely-global actions, per the locked phase scope: flip the
// notation mode and open the guided tour. The saved-automata store is NOT a
// global command -- it is App-local (its dialog renders only on Home) and is
// reached by navigating Home, so it is deliberately omitted here.
export function buildGlobalCommands(deps: {
  toggleNotation: () => void
  openTour: () => void
}): Command[] {
  return [
    {
      id: 'action-toggle-notation',
      label: 'Toggle notation (course / textbook)',
      keywords: 'theme notation course textbook epsilon lambda union plus pipe glyph switch',
      run: deps.toggleNotation,
    },
    {
      id: 'action-open-tour',
      label: 'Open the guided tour',
      keywords: 'tour walkthrough lesson guide course path help intro onboarding',
      run: deps.openTour,
    },
  ]
}
