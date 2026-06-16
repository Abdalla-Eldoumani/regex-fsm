import type { LearningPath } from '@/types/tour'
import { lessons } from './lessons'

// The single course-sequence path. Lessons run in lecture order: regex ->
// Thompson NFA -> λ-closure -> subset DFA -> minimization -> NFA-to-regex ->
// closure -> pumping. This one path satisfies TOUR-03.
export const coursePath: LearningPath = {
  id: 'course',
  name: 'Course sequence',
  description: 'Step through the constructions in the order the course teaches them.',
  lessons,
}

// Paths keyed by id so the launcher and controller resolve a path by id.
export const tourPaths: Record<string, LearningPath> = {
  [coursePath.id]: coursePath,
}
