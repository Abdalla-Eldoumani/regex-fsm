/**
 * Generic LRU (Least Recently Used) Cache with configurable max size.
 * Evicts oldest entries when capacity is exceeded.
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>
  private maxSize: number

  constructor(maxSize = 50) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined

    // Move to end (most recently used)
    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    // Delete existing entry to update position
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest entry (first in map)
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }

  entries(): IterableIterator<[K, V]> {
    return this.cache.entries()
  }

  toJSON(): [K, V][] {
    return Array.from(this.cache.entries())
  }

  static fromJSON<K, V>(data: [K, V][], maxSize = 50): LRUCache<K, V> {
    const cache = new LRUCache<K, V>(maxSize)
    for (const [key, value] of data) {
      cache.set(key, value)
    }
    return cache
  }
}
