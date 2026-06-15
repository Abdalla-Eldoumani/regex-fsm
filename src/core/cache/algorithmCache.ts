import { LRUCache } from './LRUCache'
import { RegexNode } from '../regex/ast'
import { NFA, DFA } from '../automata/types'
import { parseKey, thompsonKey, subsetKey, minimizeKey } from './keys'

// MinimizationResult type defined locally (minimize.ts may not exist)
interface MinimizationResult {
  dfa: DFA
  stateMapping: Map<string, string>
  mergedStates: Map<string, string[]>
  description: string
}

// Cache version for invalidation on app updates.
// Bumped to 1.1.0 when `+` between operands was corrected to parse as union:
// the same regex string now builds a different (correct) automaton, so automata
// cached under the old misparse must be discarded by the version mismatch.
const CACHE_VERSION = '1.1.0'
const STORAGE_KEY = 'regexfsm_cache'

interface CacheState {
  version: string
  parse: [string, RegexNode][]
  thompson: [string, SerializedNFA][]
  subset: [string, SerializedDFA][]
  minimize: [string, SerializedMinResult][]
}

// Serializable versions of automata (Set -> array)
interface SerializedNFA {
  states: { id: string; label?: string }[]
  transitions: { from: string; to: string; symbol: string | null }[]
  startState: string
  acceptStates: string[]
  alphabet: string[]
}

interface SerializedDFA {
  states: { id: string; label?: string }[]
  transitions: { from: string; to: string; symbol: string | null }[]
  startState: string
  acceptStates: string[]
  alphabet: string[]
}

interface SerializedMinResult {
  dfa: SerializedDFA
  stateMapping: [string, string][]
  mergedStates: [string, string[]][]
  description: string
}

function serializeNFA(nfa: NFA): SerializedNFA {
  return {
    ...nfa,
    alphabet: [...nfa.alphabet]
  }
}

function deserializeNFA(data: SerializedNFA): NFA {
  return {
    ...data,
    alphabet: new Set(data.alphabet)
  }
}

function serializeDFA(dfa: DFA): SerializedDFA {
  return {
    ...dfa,
    alphabet: [...dfa.alphabet]
  }
}

function deserializeDFA(data: SerializedDFA): DFA {
  return {
    ...data,
    alphabet: new Set(data.alphabet)
  }
}

function serializeMinResult(result: MinimizationResult): SerializedMinResult {
  return {
    dfa: serializeDFA(result.dfa),
    stateMapping: [...result.stateMapping.entries()],
    mergedStates: [...result.mergedStates.entries()],
    description: result.description
  }
}

function deserializeMinResult(data: SerializedMinResult): MinimizationResult {
  return {
    dfa: deserializeDFA(data.dfa),
    stateMapping: new Map(data.stateMapping),
    mergedStates: new Map(data.mergedStates),
    description: data.description
  }
}

class AlgorithmCache {
  private parseCache: LRUCache<string, RegexNode>
  private thompsonCache: LRUCache<string, NFA>
  private subsetCache: LRUCache<string, DFA>
  private minimizeCache: LRUCache<string, MinimizationResult>
  private initialized = false
  private dirty = false
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this.parseCache = new LRUCache(50)
    this.thompsonCache = new LRUCache(50)
    this.subsetCache = new LRUCache(30) // Smaller - DFAs can be large
    this.minimizeCache = new LRUCache(30)
  }

  private scheduleSave(): void {
    if (this.saveTimer) return
    this.dirty = true
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      if (this.dirty) {
        this.saveToStorage()
      }
    }, 5000)
  }

  private init(): void {
    if (this.initialized) return
    this.initialized = true
    this.loadFromStorage()
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return

      const data: CacheState = JSON.parse(stored)

      // Version check - clear if outdated
      if (data.version !== CACHE_VERSION) {
        localStorage.removeItem(STORAGE_KEY)
        return
      }

      // Restore caches
      for (const [key, value] of data.parse) {
        this.parseCache.set(key, value)
      }
      for (const [key, value] of data.thompson) {
        this.thompsonCache.set(key, deserializeNFA(value))
      }
      for (const [key, value] of data.subset) {
        this.subsetCache.set(key, deserializeDFA(value))
      }
      for (const [key, value] of data.minimize) {
        this.minimizeCache.set(key, deserializeMinResult(value))
      }
    } catch {
      // Gracefully handle corrupted cache
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  saveToStorage(): void {
    this.dirty = false
    try {
      const data: CacheState = {
        version: CACHE_VERSION,
        parse: this.parseCache.toJSON(),
        thompson: this.thompsonCache.toJSON().map(([k, v]) => [k, serializeNFA(v)]),
        subset: this.subsetCache.toJSON().map(([k, v]) => [k, serializeDFA(v)]),
        minimize: this.minimizeCache.toJSON().map(([k, v]) => [k, serializeMinResult(v)])
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Storage full or other error - silently fail
    }
  }

  // Parse cache
  getParsed(regex: string): RegexNode | undefined {
    this.init()
    return this.parseCache.get(parseKey(regex))
  }

  setParsed(regex: string, ast: RegexNode): void {
    this.init()
    this.parseCache.set(parseKey(regex), ast)
    this.scheduleSave()
  }

  // Thompson cache
  getNFA(ast: RegexNode): NFA | undefined {
    this.init()
    return this.thompsonCache.get(thompsonKey(ast))
  }

  setNFA(ast: RegexNode, nfa: NFA): void {
    this.init()
    this.thompsonCache.set(thompsonKey(ast), nfa)
    this.scheduleSave()
  }

  // Subset cache
  getDFA(nfa: NFA, alphabet?: Set<string>): DFA | undefined {
    this.init()
    return this.subsetCache.get(subsetKey(nfa, alphabet))
  }

  setDFA(nfa: NFA, alphabet: Set<string> | undefined, dfa: DFA): void {
    this.init()
    this.subsetCache.set(subsetKey(nfa, alphabet), dfa)
    this.scheduleSave()
  }

  // Minimize cache
  getMinimized(dfa: DFA, useLetterNames: boolean): MinimizationResult | undefined {
    this.init()
    return this.minimizeCache.get(minimizeKey(dfa, useLetterNames))
  }

  setMinimized(dfa: DFA, useLetterNames: boolean, result: MinimizationResult): void {
    this.init()
    this.minimizeCache.set(minimizeKey(dfa, useLetterNames), result)
    this.scheduleSave()
  }

  // Clear all caches
  clear(): void {
    this.parseCache.clear()
    this.thompsonCache.clear()
    this.subsetCache.clear()
    this.minimizeCache.clear()
    localStorage.removeItem(STORAGE_KEY)
  }

  // Get cache statistics
  getStats(): { parse: number; thompson: number; subset: number; minimize: number } {
    this.init()
    return {
      parse: this.parseCache.size,
      thompson: this.thompsonCache.size,
      subset: this.subsetCache.size,
      minimize: this.minimizeCache.size
    }
  }
}

// Singleton instance
export const algorithmCache = new AlgorithmCache()

// Save on page unload (debounced saves handle the rest)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    algorithmCache.saveToStorage()
  })
}
