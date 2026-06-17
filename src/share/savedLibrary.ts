import {
  decodeShareState,
  encodeShareState,
  type ShareState,
} from './shareCodec'

// The saved-automata library persists NAMED automata in localStorage under one
// dedicated, versioned key. It reuses the share codec as its payload format and
// its validator: each entry stores the same encoded ShareState the URL surface
// carries, so there is ONE serialized form and ONE validator across share links
// and saved entries (Plan 01 owns both).
//
// Two invariants set this module apart from the two existing cache singletons
// (algorithmCache, layoutCache):
//
//   1. Stored data is UNTRUSTED AT REST. localStorage can be hand-edited or
//      corrupted, so every load re-runs decodeShareState (the Plan 01 fail-closed
//      gate: schema, BOUNDS, referential integrity). A tampered entry returns
//      null, never a partial object, never a throw.
//
//   2. A failed write is the USER'S SAVED WORK, not a regenerable cache. The two
//      caches swallow a setItem failure in an empty `catch {}` -- acceptable for a
//      cache that can be rebuilt, WRONG here. This module detects a full store and
//      returns a typed failure the UI surfaces, and the prior saved entries stay
//      intact because the persisted store is only ever replaced on a successful
//      write.

// One dedicated key. It must not collide with the three keys already in use:
// regexfsm_cache (algorithmCache), regexfsm_layout_cache (layoutCache), and
// regex-fsm:notation-mode (NotationContext). Verified distinct in 12-RESEARCH.
export const SAVED_STORAGE_KEY = 'regexfsm_saved_automata'

// Bump to invalidate the store when the entry schema changes. A version mismatch
// fails soft to an empty library on read (mirrors the cache version check), so a
// future change cannot surface a stale entry shape as if it were current.
const SAVED_VERSION = 1

// One saved automaton. payload is the encoded ShareState string (the same wire
// format the share hash carries), so loadSaved hands it straight to
// decodeShareState -- one validator, one format, no second best-effort path.
export interface SavedEntry {
  id: string
  name: string
  savedAt: number
  payload: string
}

// The persisted record: a version plus the entries, most-recent first.
interface SavedStore {
  version: number
  entries: SavedEntry[]
}

// A discriminated result for a save. Success carries the new entry; a failure
// carries a typed reason the UI maps to a notice. 'quota' is a full store
// (delete a saved automaton to free space); 'unknown' is any other write error.
export type SaveResult =
  | { ok: true; entry: SavedEntry }
  | { ok: false; reason: 'quota' | 'unknown' }

// Fail-soft read of the whole store. Mirrors NotationContext.readStoredMode: a
// missing key, corrupt JSON, a version mismatch, or a shape that is not the
// expected record all resolve to an empty library WITHOUT throwing into a caller.
// This is the read half of invariant 1 -- a corrupt store can never crash render.
function readStore(): SavedStore {
  const empty: SavedStore = { version: SAVED_VERSION, entries: [] }
  try {
    const raw = localStorage.getItem(SAVED_STORAGE_KEY)
    if (raw === null) return empty

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return empty

    const store = parsed as Record<string, unknown>
    if (store.version !== SAVED_VERSION) return empty
    if (!Array.isArray(store.entries)) return empty

    // Keep only structurally well-formed entries. A single malformed entry must
    // not discard the rest, and the payload string is re-validated later on load,
    // never trusted here.
    const entries: SavedEntry[] = []
    for (const e of store.entries) {
      if (typeof e !== 'object' || e === null) continue
      const er = e as Record<string, unknown>
      if (
        typeof er.id === 'string' &&
        typeof er.name === 'string' &&
        typeof er.savedAt === 'number' &&
        typeof er.payload === 'string'
      ) {
        entries.push({ id: er.id, name: er.name, savedAt: er.savedAt, payload: er.payload })
      }
    }
    return { version: SAVED_VERSION, entries }
  } catch {
    // Private-browsing SecurityError, corrupt JSON, or an unavailable store --
    // fall back to an empty library, exactly like the fail-soft read precedents.
    return empty
  }
}

// Feature-detect a full-storage error across browsers. The spec name is
// 'QuotaExceededError'; legacy paths report code 22, and Firefox reports code
// 1014. The name alone is not reliable, so all three signals are checked.
function isQuotaExceeded(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const e = err as { name?: unknown; code?: unknown }
  return e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014
}

// A stable id for a new entry. crypto.randomUUID is available in the supported
// runtimes; the timestamp-plus-random fallback keeps id generation from ever
// throwing if it is absent, so a save is never blocked by a missing primitive.
function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// List saved automata, most-recent first. Fail-soft empty on a corrupt or missing
// store. Entries are already stored most-recent first (saveCurrent prepends), so
// the stored order is returned as-is.
export function listSaved(): SavedEntry[] {
  return readStore().entries
}

// Save the current state under a name. Builds the next list from the last good
// read and prepends the new entry (most-recent first), then attempts a single
// write. On a write failure the persisted store is UNCHANGED -- the new list was
// never committed -- so the prior saved entries remain intact and the failed
// entry is not added. This is the write half of invariant 2.
export function saveCurrent(name: string, state: ShareState): SaveResult {
  const entry: SavedEntry = {
    id: newId(),
    name,
    savedAt: Date.now(),
    // Store the encoded ShareState so loadSaved validates it through the same
    // decodeShareState gate the URL surface uses (one validator, one format).
    payload: encodeShareState(state),
  }

  const next: SavedStore = {
    version: SAVED_VERSION,
    entries: [entry, ...readStore().entries],
  }

  try {
    localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(next))
    return { ok: true, entry }
  } catch (err) {
    // The explicit departure from algorithmCache/layoutCache: a write failure is
    // NOT swallowed. A full store returns a typed 'quota' failure the UI surfaces;
    // any other write error returns 'unknown'. Either way the store was not
    // rewritten, so the user's prior saves are untouched.
    return { ok: false, reason: isQuotaExceeded(err) ? 'quota' : 'unknown' }
  }
}

// Load a saved automaton by id. Reads the store fail-soft, finds the entry, and
// re-runs the Plan 01 validator on its stored payload. Returns the validated
// ShareState, or null on a miss or a payload the validator rejects. Never throws
// into a caller -- a tampered or corrupt entry is null, not a crash (invariant 1).
export function loadSaved(id: string): ShareState | null {
  const entry = readStore().entries.find((e) => e.id === id)
  if (!entry) return null
  return decodeShareState(entry.payload)
}

// Delete a saved automaton by id and rewrite the store. Fail-soft: a write failure
// (a full or unavailable store) leaves the prior store in place rather than
// throwing. Deleting an absent id is a no-op.
export function deleteSaved(id: string): void {
  const store = readStore()
  const entries = store.entries.filter((e) => e.id !== id)
  if (entries.length === store.entries.length) return
  try {
    localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify({ version: SAVED_VERSION, entries }))
  } catch {
    // A delete that cannot persist leaves the prior list in place. The user can
    // retry; a thrown error here would be a worse outcome than a stale list.
  }
}
