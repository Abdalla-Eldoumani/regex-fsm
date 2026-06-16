import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  listSaved,
  saveCurrent,
  loadSaved,
  deleteSaved,
  SAVED_STORAGE_KEY,
  type SavedEntry,
} from './savedLibrary'
import { encodeShareState, SHARE_VERSION, type AutomatonShareDoc, type RegexShareDoc } from './shareCodec'
import { BOUNDS } from '@/core/automata/types'

// This suite is the proof that the saved-automata library round-trips a named
// automaton through localStorage (SHARE-04), re-validates every load against the
// Plan 01 decodeShareState gate (stored data is untrusted at rest), and -- the
// decisive departure from the two existing caches -- surfaces a TYPED FAILURE on a
// full store instead of swallowing the write, leaving the prior saved work intact.
// A corrupt or missing store fails soft to an empty library and never throws into
// render.

// The three localStorage keys the library MUST NOT collide with (the algorithm
// cache, the layout cache, and the notation mode). A save must leave each untouched.
const FOREIGN_KEYS = ['regexfsm_cache', 'regexfsm_layout_cache', 'regex-fsm:notation-mode'] as const

// A known-good automaton document: a 2-state machine with a self-loop, a parallel
// edge pair, and a lambda move -- the same fixture shape the codec suite proves
// round-trips losslessly, reused here as a stored payload.
const goodAutomaton: AutomatonShareDoc = {
  v: SHARE_VERSION,
  kind: 'automaton',
  states: [{ id: 'q0', label: 'start' }, { id: 'q1' }],
  alphabet: ['a', 'b'],
  transitions: [
    { from: 'q0', to: 'q0', symbol: 'a' },
    { from: 'q0', to: 'q1', symbol: 'a' },
    { from: 'q0', to: 'q1', symbol: 'b' },
    { from: 'q1', to: 'q0', symbol: null },
  ],
  start: 'q0',
  accept: ['q1'],
}

const goodRegex: RegexShareDoc = {
  v: SHARE_VERSION,
  kind: 'regex',
  src: '(a + b)*abb',
  alphabet: ['a', 'b'],
  options: {
    constructionMethod: 'thompson',
    shouldMinimize: true,
    useLetterNames: false,
    testString: 'aabb',
  },
}

// A DOMException-like error matching one of the three QuotaExceededError shapes a
// browser may throw. The name varies (the spec name, code 22, Firefox code 1014),
// so the library feature-detects all three; the suite proves each is honored.
function quotaError(shape: 'name' | 'code22' | 'code1014'): Error {
  if (shape === 'name') {
    const err = new Error('quota exceeded') as Error & { name: string }
    err.name = 'QuotaExceededError'
    return err
  }
  const code = shape === 'code22' ? 22 : 1014
  const err = new Error('quota exceeded') as Error & { code: number }
  err.code = code
  return err
}

describe('savedLibrary', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  describe('save / list / load / delete round-trip (SHARE-04)', () => {
    it('saves a named automaton and lists it with id, name, and savedAt', () => {
      const result = saveCurrent('my machine', goodAutomaton)
      expect(result.ok).toBe(true)

      const list = listSaved()
      expect(list).toHaveLength(1)
      expect(list[0].name).toBe('my machine')
      expect(typeof list[0].id).toBe('string')
      expect(list[0].id.length).toBeGreaterThan(0)
      expect(typeof list[0].savedAt).toBe('number')
    })

    it('returns the saved entry on a successful save', () => {
      const result = saveCurrent('one', goodAutomaton)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.entry.name).toBe('one')
        expect(listSaved().some((e) => e.id === result.entry.id)).toBe(true)
      }
    })

    it('lists most-recent first', () => {
      saveCurrent('first', goodAutomaton)
      saveCurrent('second', goodRegex)
      const list = listSaved()
      expect(list.map((e) => e.name)).toEqual(['second', 'first'])
    })

    it('loads the exact ShareState that was saved (automaton, deep-equal)', () => {
      const saved = saveCurrent('machine', goodAutomaton)
      expect(saved.ok).toBe(true)
      if (!saved.ok) return
      const loaded = loadSaved(saved.entry.id)
      expect(loaded).toEqual(goodAutomaton)
    })

    it('loads the exact ShareState that was saved (regex, deep-equal)', () => {
      const saved = saveCurrent('scratch', goodRegex)
      expect(saved.ok).toBe(true)
      if (!saved.ok) return
      const loaded = loadSaved(saved.entry.id)
      expect(loaded).toEqual(goodRegex)
    })

    it('returns null when loading an id that is not present', () => {
      saveCurrent('machine', goodAutomaton)
      expect(loadSaved('no-such-id')).toBeNull()
    })

    it('deletes an entry so a later list no longer contains it', () => {
      const a = saveCurrent('keep', goodAutomaton)
      const b = saveCurrent('drop', goodRegex)
      expect(a.ok && b.ok).toBe(true)
      if (!a.ok || !b.ok) return

      deleteSaved(b.entry.id)
      const list = listSaved()
      expect(list.some((e) => e.id === b.entry.id)).toBe(false)
      expect(list.some((e) => e.id === a.entry.id)).toBe(true)
      expect(loadSaved(b.entry.id)).toBeNull()
    })

    it('delete of an absent id is a no-op that leaves the list intact', () => {
      saveCurrent('only', goodAutomaton)
      deleteSaved('ghost')
      expect(listSaved()).toHaveLength(1)
    })
  })

  describe('validator on every load (untrusted at rest, SHARE-04 / T-12-11)', () => {
    it('returns null when a stored payload has been tampered to an invalid shape', () => {
      const saved = saveCurrent('machine', goodAutomaton)
      expect(saved.ok).toBe(true)
      if (!saved.ok) return

      // Tamper the stored payload directly: replace the encoded ShareState with the
      // encoding of an object the decodeShareState gate rejects (unknown kind).
      const raw = localStorage.getItem(SAVED_STORAGE_KEY)
      expect(raw).not.toBeNull()
      const store = JSON.parse(raw as string)
      store.entries[0].payload = encodeShareState({ v: SHARE_VERSION, kind: 'mystery' } as never)
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(store))

      expect(loadSaved(saved.entry.id)).toBeNull()
    })

    it('returns null when a stored payload is no longer a decodable token', () => {
      const saved = saveCurrent('machine', goodAutomaton)
      expect(saved.ok).toBe(true)
      if (!saved.ok) return

      const raw = localStorage.getItem(SAVED_STORAGE_KEY)
      const store = JSON.parse(raw as string)
      store.entries[0].payload = '@@@ not a valid encoded payload @@@'
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(store))

      expect(loadSaved(saved.entry.id)).toBeNull()
    })

    it('returns null when a stored payload would breach BOUNDS on restore', () => {
      const saved = saveCurrent('machine', goodAutomaton)
      expect(saved.ok).toBe(true)
      if (!saved.ok) return

      // A hand-edited payload with more than the 256-state cap must be rejected by
      // the validator's BOUNDS gate even though it is otherwise well-formed.
      const tooMany = {
        v: SHARE_VERSION,
        kind: 'automaton',
        states: Array.from({ length: BOUNDS.MAX_DFA_STATES + 1 }, (_, i) => ({ id: `q${i}` })),
        alphabet: ['a'],
        transitions: [],
        start: 'q0',
        accept: [],
      }
      const raw = localStorage.getItem(SAVED_STORAGE_KEY)
      const store = JSON.parse(raw as string)
      store.entries[0].payload = encodeShareState(tooMany as never)
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(store))

      expect(loadSaved(saved.entry.id)).toBeNull()
    })
  })

  describe('quota typed failure with intact prior list (SHARE-04 / T-12-13)', () => {
    it.each(['name', 'code22', 'code1014'] as const)(
      'returns a typed quota failure for a %s QuotaExceededError without throwing',
      (shape) => {
        // A prior save succeeds and is written before the stub is installed.
        const prior = saveCurrent('prior', goodAutomaton)
        expect(prior.ok).toBe(true)
        if (!prior.ok) return

        const spy = vi
          .spyOn(Storage.prototype, 'setItem')
          .mockImplementation(() => {
            throw quotaError(shape)
          })

        const result = saveCurrent('doomed', goodRegex)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.reason).toBe('quota')
        }

        // The setItem stub is removed so the store can be read back.
        spy.mockRestore()

        // The prior saved work is still intact and the failed entry was not added.
        const list = listSaved()
        expect(list).toHaveLength(1)
        expect(list[0].id).toBe(prior.entry.id)
        expect(list.some((e) => e.name === 'doomed')).toBe(false)
        expect(loadSaved(prior.entry.id)).toEqual(goodAutomaton)
      },
    )

    it('returns the typed unknown failure for a non-quota write error', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('something else went wrong')
      })

      const result = saveCurrent('doomed', goodAutomaton)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.reason).toBe('unknown')
      }

      spy.mockRestore()
      expect(listSaved()).toHaveLength(0)
    })
  })

  describe('corrupt or missing read fails soft to empty (SHARE-04 / T-12-12)', () => {
    it('lists an empty library when nothing has been stored', () => {
      expect(listSaved()).toEqual([])
    })

    it('lists an empty library (without throwing) when the store is non-JSON garbage', () => {
      localStorage.setItem(SAVED_STORAGE_KEY, 'this is not json {{{')
      expect(() => listSaved()).not.toThrow()
      expect(listSaved()).toEqual([])
    })

    it('lists an empty library when the stored version does not match', () => {
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify({ version: 999, entries: [] }))
      expect(listSaved()).toEqual([])
    })

    it('lists an empty library when the stored shape is valid JSON but wrong', () => {
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify({ totally: 'wrong' }))
      expect(listSaved()).toEqual([])
    })

    it('returns null (without throwing) from loadSaved on a corrupt store', () => {
      localStorage.setItem(SAVED_STORAGE_KEY, 'not json at all')
      expect(() => loadSaved('any-id')).not.toThrow()
      expect(loadSaved('any-id')).toBeNull()
    })
  })

  describe('key isolation (SHARE-04 / A5)', () => {
    it('does not write any of the three existing localStorage keys on save', () => {
      for (const key of FOREIGN_KEYS) {
        expect(localStorage.getItem(key)).toBeNull()
      }

      saveCurrent('machine', goodAutomaton)

      for (const key of FOREIGN_KEYS) {
        expect(localStorage.getItem(key)).toBeNull()
      }
      // The save landed under the dedicated key only.
      expect(localStorage.getItem(SAVED_STORAGE_KEY)).not.toBeNull()
    })

    it('leaves a pre-existing foreign key untouched after a save', () => {
      localStorage.setItem('regexfsm_cache', 'pretend-cache-blob')
      saveCurrent('machine', goodAutomaton)
      expect(localStorage.getItem('regexfsm_cache')).toBe('pretend-cache-blob')
    })
  })

  describe('SavedEntry shape', () => {
    it('exposes id, name, savedAt, and payload on each listed entry', () => {
      saveCurrent('machine', goodAutomaton)
      const entry: SavedEntry = listSaved()[0]
      expect(entry).toHaveProperty('id')
      expect(entry).toHaveProperty('name')
      expect(entry).toHaveProperty('savedAt')
      expect(entry).toHaveProperty('payload')
      expect(typeof entry.payload).toBe('string')
    })
  })
})
