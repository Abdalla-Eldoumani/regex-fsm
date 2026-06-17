import { describe, it, expect, vi } from 'vitest'
import type { NavigateFunction } from 'react-router-dom'
import { buildNavigationCommands, buildGlobalCommands } from './commandRegistry'

// This suite pins the locked command-palette scope: the navigation builder emits
// exactly the eight main.tsx routes, each running navigate with its FIXED
// allow-list path (never an interpolated or user-provided string), and the global
// builder emits exactly the two genuinely-global actions (toggle notation, open
// the guided tour) and nothing else -- in particular no saved-store command.

// The eight allow-list paths from main.tsx, in route order.
const EXPECTED_PATHS = ['/', '/editor', '/multi', '/n2r', '/closure', '/pumping', '/challenges', '/simulate']

describe('buildNavigationCommands', () => {
  it('emits one command per allow-list route, in order', () => {
    const navigate = vi.fn() as unknown as NavigateFunction
    const commands = buildNavigationCommands(navigate)
    expect(commands).toHaveLength(EXPECTED_PATHS.length)
    expect(commands.every(c => c.id.startsWith('nav-'))).toBe(true)
  })

  it('runs navigate with the fixed path for each route', () => {
    const navigate = vi.fn() as unknown as NavigateFunction
    const commands = buildNavigationCommands(navigate)
    commands.forEach(command => command.run())
    const calledPaths = (navigate as unknown as ReturnType<typeof vi.fn>).mock.calls.map(args => args[0])
    expect(calledPaths).toEqual(EXPECTED_PATHS)
  })

  it('labels the NFA-to-Regex route with the course arrow glyph', () => {
    const navigate = vi.fn() as unknown as NavigateFunction
    const n2r = buildNavigationCommands(navigate).find(c => c.id === 'nav-n2r')
    expect(n2r?.label).toContain('→')
  })
})

describe('buildGlobalCommands', () => {
  it('emits exactly the two global actions and no store command', () => {
    const commands = buildGlobalCommands({ toggleNotation: () => {}, openTour: () => {} })
    expect(commands).toHaveLength(2)
    expect(commands.map(c => c.id).sort()).toEqual(['action-open-tour', 'action-toggle-notation'])
    // No navigation command leaks into the global set.
    expect(commands.some(c => c.id.startsWith('nav-'))).toBe(false)
  })

  it('runs toggleNotation and openTour from their commands', () => {
    const toggleNotation = vi.fn()
    const openTour = vi.fn()
    const commands = buildGlobalCommands({ toggleNotation, openTour })
    commands.find(c => c.id === 'action-toggle-notation')?.run()
    commands.find(c => c.id === 'action-open-tour')?.run()
    expect(toggleNotation).toHaveBeenCalledTimes(1)
    expect(openTour).toHaveBeenCalledTimes(1)
  })
})
