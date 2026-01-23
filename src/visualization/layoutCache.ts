import { Automaton } from '@/core/automata/types'
import { layoutKey } from '@/core/cache'

interface NodePosition {
  x: number
  y: number
}

interface LayoutCacheEntry {
  positions: Record<string, NodePosition>
  timestamp: number
}

const STORAGE_KEY = 'regexfsm_layout_cache'
const MAX_ENTRIES = 50
const EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

class LayoutCache {
  private cache: Map<string, LayoutCacheEntry>
  private initialized = false

  constructor() {
    this.cache = new Map()
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

      const data: [string, LayoutCacheEntry][] = JSON.parse(stored)
      const now = Date.now()

      // Filter out expired entries
      for (const [key, entry] of data) {
        if (now - entry.timestamp < EXPIRY_MS) {
          this.cache.set(key, entry)
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  private saveToStorage(): void {
    try {
      // Evict if over capacity
      if (this.cache.size > MAX_ENTRIES) {
        const entries = Array.from(this.cache.entries())
          .sort((a, b) => b[1].timestamp - a[1].timestamp)
          .slice(0, MAX_ENTRIES)
        this.cache = new Map(entries)
      }

      const data = Array.from(this.cache.entries())
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Storage full - silently fail
    }
  }

  /**
   * Get cached positions for an automaton.
   */
  getPositions(automaton: Automaton): Record<string, NodePosition> | undefined {
    this.init()
    const key = layoutKey(automaton)
    const entry = this.cache.get(key)

    if (!entry) return undefined

    // Check expiry
    if (Date.now() - entry.timestamp > EXPIRY_MS) {
      this.cache.delete(key)
      return undefined
    }

    // Update timestamp (LRU behavior)
    entry.timestamp = Date.now()
    return entry.positions
  }

  /**
   * Save positions for an automaton.
   */
  setPositions(automaton: Automaton, positions: Record<string, NodePosition>): void {
    this.init()
    const key = layoutKey(automaton)
    this.cache.set(key, {
      positions,
      timestamp: Date.now()
    })
    this.saveToStorage()
  }

  /**
   * Check if positions exist for an automaton.
   */
  hasPositions(automaton: Automaton): boolean {
    this.init()
    const key = layoutKey(automaton)
    const entry = this.cache.get(key)
    if (!entry) return false

    // Check expiry
    if (Date.now() - entry.timestamp > EXPIRY_MS) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Clear all cached layouts.
   */
  clear(): void {
    this.cache.clear()
    localStorage.removeItem(STORAGE_KEY)
  }

  /**
   * Get cache size.
   */
  get size(): number {
    this.init()
    return this.cache.size
  }
}

export const layoutCache = new LayoutCache()
