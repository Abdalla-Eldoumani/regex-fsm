import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { LRUCache } from '../src/core/cache/LRUCache'
import { parseKey, thompsonKey, subsetKey, minimizeKey, layoutKey } from '../src/core/cache/keys'
import { RegexNode } from '../src/core/regex/ast'
import { NFA, DFA } from '../src/core/automata/types'

describe('LRUCache', () => {
  let cache: LRUCache<string, number>

  beforeEach(() => {
    cache = new LRUCache(3)
  })

  describe('basic operations', () => {
    it('should set and get values', () => {
      cache.set('a', 1)
      expect(cache.get('a')).toBe(1)
    })

    it('should return undefined for missing keys', () => {
      expect(cache.get('missing')).toBeUndefined()
    })

    it('should check if key exists', () => {
      cache.set('a', 1)
      expect(cache.has('a')).toBe(true)
      expect(cache.has('b')).toBe(false)
    })

    it('should delete keys', () => {
      cache.set('a', 1)
      expect(cache.delete('a')).toBe(true)
      expect(cache.get('a')).toBeUndefined()
    })

    it('should clear all entries', () => {
      cache.set('a', 1)
      cache.set('b', 2)
      cache.clear()
      expect(cache.size).toBe(0)
    })

    it('should report correct size', () => {
      expect(cache.size).toBe(0)
      cache.set('a', 1)
      expect(cache.size).toBe(1)
      cache.set('b', 2)
      expect(cache.size).toBe(2)
    })
  })

  describe('LRU eviction', () => {
    it('should evict oldest entry when over capacity', () => {
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)
      cache.set('d', 4) // should evict 'a'

      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBe(2)
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
    })

    it('should update position on get (LRU behavior)', () => {
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)
      cache.get('a') // access 'a', making it most recent
      cache.set('d', 4) // should evict 'b' (oldest now)

      expect(cache.get('a')).toBe(1)
      expect(cache.get('b')).toBeUndefined()
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
    })

    it('should update position on set of existing key', () => {
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)
      cache.set('a', 10) // update 'a', making it most recent
      cache.set('d', 4) // should evict 'b' (oldest now)

      expect(cache.get('a')).toBe(10)
      expect(cache.get('b')).toBeUndefined()
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
    })
  })

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      cache.set('a', 1)
      cache.set('b', 2)
      const json = cache.toJSON()
      expect(json).toEqual([['a', 1], ['b', 2]])
    })

    it('should deserialize from JSON', () => {
      const data: [string, number][] = [['x', 10], ['y', 20]]
      const restored = LRUCache.fromJSON(data, 5)
      expect(restored.get('x')).toBe(10)
      expect(restored.get('y')).toBe(20)
      expect(restored.size).toBe(2)
    })

    it('should preserve order during serialization', () => {
      cache.set('a', 1)
      cache.set('b', 2)
      cache.get('a') // access 'a'
      const json = cache.toJSON()
      // After accessing 'a', order should be: b, a
      expect(json).toEqual([['b', 2], ['a', 1]])
    })
  })
})

describe('Cache Keys', () => {
  describe('parseKey', () => {
    it('should generate deterministic key for regex', () => {
      expect(parseKey('a*b')).toBe('parse:a*b')
      expect(parseKey('(a|b)*')).toBe('parse:(a|b)*')
    })

    it('should generate different keys for different regex', () => {
      expect(parseKey('a*')).not.toBe(parseKey('b*'))
    })
  })

  describe('thompsonKey', () => {
    it('should generate deterministic key for AST', () => {
      const ast: RegexNode = { type: 'symbol', value: 'a' }
      const key1 = thompsonKey(ast)
      const key2 = thompsonKey(ast)
      expect(key1).toBe(key2)
    })

    it('should generate different keys for different AST', () => {
      const ast1: RegexNode = { type: 'symbol', value: 'a' }
      const ast2: RegexNode = { type: 'symbol', value: 'b' }
      expect(thompsonKey(ast1)).not.toBe(thompsonKey(ast2))
    })

    it('should handle complex AST', () => {
      const ast: RegexNode = {
        type: 'concat',
        left: { type: 'symbol', value: 'a' },
        right: { type: 'star', child: { type: 'symbol', value: 'b' } }
      }
      const key = thompsonKey(ast)
      expect(key).toContain('thompson:')
      expect(key).toContain('concat')
    })
  })

  describe('subsetKey', () => {
    const sampleNFA: NFA = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a'])
    }

    it('should generate deterministic key for NFA', () => {
      const key1 = subsetKey(sampleNFA)
      const key2 = subsetKey(sampleNFA)
      expect(key1).toBe(key2)
    })

    it('should include alphabet in key', () => {
      const withAlpha = subsetKey(sampleNFA, new Set(['a', 'b']))
      const withoutAlpha = subsetKey(sampleNFA)
      expect(withAlpha).not.toBe(withoutAlpha)
    })

    it('should generate same key for same alphabet regardless of order', () => {
      const key1 = subsetKey(sampleNFA, new Set(['a', 'b']))
      const key2 = subsetKey(sampleNFA, new Set(['b', 'a']))
      expect(key1).toBe(key2)
    })
  })

  describe('minimizeKey', () => {
    const sampleDFA: DFA = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a'])
    }

    it('should generate deterministic key for DFA', () => {
      const key1 = minimizeKey(sampleDFA)
      const key2 = minimizeKey(sampleDFA)
      expect(key1).toBe(key2)
    })

    it('should include naming preference in key', () => {
      const withLetters = minimizeKey(sampleDFA, true)
      const withNumbers = minimizeKey(sampleDFA, false)
      expect(withLetters).not.toBe(withNumbers)
    })
  })

  describe('layoutKey', () => {
    const sampleAutomaton: DFA = {
      states: [{ id: 'q0' }, { id: 'q1' }],
      transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }],
      startState: 'q0',
      acceptStates: ['q1'],
      alphabet: new Set(['a'])
    }

    it('should generate deterministic key', () => {
      const key1 = layoutKey(sampleAutomaton)
      const key2 = layoutKey(sampleAutomaton)
      expect(key1).toBe(key2)
    })

    it('should start with layout prefix', () => {
      const key = layoutKey(sampleAutomaton)
      expect(key).toMatch(/^layout:/)
    })
  })
})

describe('algorithmCache', () => {
  // Note: These tests would require mocking localStorage
  // For now we just verify the imports work
  it('should export algorithmCache', async () => {
    const { algorithmCache } = await import('../src/core/cache/algorithmCache')
    expect(algorithmCache).toBeDefined()
    expect(typeof algorithmCache.getParsed).toBe('function')
    expect(typeof algorithmCache.setParsed).toBe('function')
    expect(typeof algorithmCache.getNFA).toBe('function')
    expect(typeof algorithmCache.setNFA).toBe('function')
    expect(typeof algorithmCache.getDFA).toBe('function')
    expect(typeof algorithmCache.setDFA).toBe('function')
    expect(typeof algorithmCache.getMinimized).toBe('function')
    expect(typeof algorithmCache.setMinimized).toBe('function')
    expect(typeof algorithmCache.clear).toBe('function')
    expect(typeof algorithmCache.getStats).toBe('function')
  })
})

describe('cachedAlgorithms', () => {
  it('should export cached algorithms', async () => {
    const cached = await import('../src/core/cachedAlgorithms')
    expect(typeof cached.parse).toBe('function')
    expect(typeof cached.buildNFA).toBe('function')
    expect(typeof cached.nfaToDFA).toBe('function')
    expect(typeof cached.minimizeDFA).toBe('function')
    expect(typeof cached.clearCache).toBe('function')
    expect(typeof cached.getCacheStats).toBe('function')
  })

  it('should produce same results as original algorithms', async () => {
    const { parse, buildNFA, nfaToDFA } = await import('../src/core/cachedAlgorithms')
    const { parse: parseOriginal } = await import('../src/core/regex/parser')
    const { buildNFA: buildNFAOriginal } = await import('../src/core/algorithms/thompson')

    const regex = 'a*b'
    const cachedAst = parse(regex)
    const originalAst = parseOriginal(regex)

    // ASTs should be equivalent (deep equal)
    expect(JSON.stringify(cachedAst)).toBe(JSON.stringify(originalAst))

    const cachedNfa = buildNFA(cachedAst)
    const originalNfa = buildNFAOriginal(originalAst)

    // NFAs should have same structure
    expect(cachedNfa.states.length).toBe(originalNfa.states.length)
    expect(cachedNfa.transitions.length).toBe(originalNfa.transitions.length)
  })

  it('should return cached result on second call', async () => {
    const { parse, clearCache, getCacheStats } = await import('../src/core/cachedAlgorithms')

    clearCache()

    const regex = 'test123*'

    // First call
    parse(regex)
    const stats1 = getCacheStats()

    // Second call - should hit cache
    parse(regex)
    const stats2 = getCacheStats()

    // Cache size should not increase on second call
    expect(stats2.parse).toBe(stats1.parse)
  })
})
