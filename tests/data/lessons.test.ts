import { describe, it, expect } from 'vitest'
import { coursePath, tourPaths } from '@/data/lessons'
import { lessons } from '@/data/lessons/lessons'
import { VALID_TOUR_ROUTES } from '@/types/tour'

describe('course-sequence lesson data', () => {
  describe('content', () => {
    it('every lesson has a non-empty title and body', () => {
      for (const lesson of coursePath.lessons) {
        expect(lesson.title.trim().length).toBeGreaterThan(0)
        expect(lesson.body.trim().length).toBeGreaterThan(0)
      }
    })

    it('every lesson id is unique', () => {
      const ids = coursePath.lessons.map(l => l.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('routes', () => {
    it('every present route is one of the eight valid app routes', () => {
      const valid = new Set<string>(VALID_TOUR_ROUTES)
      for (const lesson of coursePath.lessons) {
        if (lesson.route !== undefined) {
          expect(valid.has(lesson.route)).toBe(true)
        }
      }
    })

    it('carries at least the seven route-linked lessons', () => {
      const routed = coursePath.lessons.filter(l => l.route !== undefined)
      expect(routed.length).toBeGreaterThanOrEqual(7)
    })
  })

  describe('course order', () => {
    it('steps the lecture sequence: / -> /multi -> /n2r -> /closure -> /pumping', () => {
      // Pull the route progression and assert the construction milestones appear
      // in the relative order the course teaches them. The home route covers
      // regex, Thompson, and λ-closure, so it precedes the first /multi step.
      const routeOrder = coursePath.lessons
        .map(l => l.route)
        .filter((r): r is string => r !== undefined)
      const expectedOrder = ['/', '/multi', '/n2r', '/closure', '/pumping']
      const firstIndices = expectedOrder.map(route => routeOrder.indexOf(route))
      for (const idx of firstIndices) {
        expect(idx).toBeGreaterThanOrEqual(0)
      }
      const sorted = [...firstIndices].sort((a, b) => a - b)
      expect(firstIndices).toEqual(sorted)
    })

    it('orders the lesson ids regex -> thompson -> lambda-closure -> subset -> minimize -> nfa-to-regex -> closure -> pumping', () => {
      expect(coursePath.lessons.map(l => l.id)).toEqual([
        'regex',
        'thompson',
        'lambda-closure',
        'subset',
        'minimize',
        'nfa-to-regex',
        'closure',
        'pumping',
      ])
    })
  })

  describe('lecture references', () => {
    it('keeps the expected refs on Thompson, λ-closure, and subset', () => {
      const refById = new Map(coursePath.lessons.map(l => [l.id, l.lectureRef]))
      expect(refById.get('thompson')).toBe('Definition 4.3')
      expect(refById.get('lambda-closure')).toBe('Definition 4.5')
      expect(refById.get('subset')).toBe('Theorem 4.2')
    })

    it('every lecture reference that is present is non-empty', () => {
      for (const lesson of coursePath.lessons) {
        if (lesson.lectureRef !== undefined) {
          expect(lesson.lectureRef.trim().length).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('legacy-shape guard', () => {
    it('no lesson object carries a targetSelector key', () => {
      for (const lesson of coursePath.lessons) {
        expect(Object.prototype.hasOwnProperty.call(lesson, 'targetSelector')).toBe(false)
      }
    })
  })

  describe('course notation', () => {
    it('uses λ, +, Σ, and ∅ across the lesson prose', () => {
      const allBodies = coursePath.lessons.map(l => l.body).join('\n')
      expect(allBodies).toContain('λ')
      expect(allBodies).toContain('+')
      expect(allBodies).toContain('Σ')
      expect(allBodies).toContain('∅')
    })

    it('contains no em dash (U+2014) in any learner-facing string', () => {
      const emDash = String.fromCharCode(0x2014)
      for (const lesson of coursePath.lessons) {
        const strings = [lesson.title, lesson.body, lesson.lectureRef ?? '']
        for (const s of strings) {
          expect(s.includes(emDash)).toBe(false)
        }
      }
      expect(coursePath.name.includes(emDash)).toBe(false)
      expect(coursePath.description.includes(emDash)).toBe(false)
    })
  })

  describe('paths record', () => {
    it('resolves the course path by id', () => {
      expect(tourPaths['course']).toBe(coursePath)
    })

    it('exports the same lessons array the path uses', () => {
      expect(coursePath.lessons).toBe(lessons)
    })
  })
})
