// Tour data model. A lesson is plain data (not a DOM probe): it carries the
// prose, optional course route, optional preset, and optional lecture reference.
// A learning path is an ordered list of lessons. The tour state is the live
// controller shape (open flag, which path, which step).

export interface Lesson {
  id: string
  title: string
  // Learner-facing copy in course notation. Use \n to separate paragraphs;
  // symbolic fragments are rendered font-mono by the dialog, so write them as
  // plain text the component styles.
  body: string
  // One of the eight app routes when the lesson lands the learner on a tool
  // view; omit for a concept-only step that stays on the current view.
  route?: string
  // Optional initial selection carried to the target view as a query value.
  preset?: string
  // Course lecture reference preserved from the salvaged legacy steps.
  lectureRef?: string
}

export interface LearningPath {
  id: string
  name: string
  description: string
  // Ordered; drives the bottom-sheet step by step.
  lessons: Lesson[]
}

export interface TourState {
  isOpen: boolean
  pathId: string | null
  stepIndex: number
}

// The eight valid navigation targets. A lesson route must be one of these so
// the controller can never navigate off-origin or to an unknown path; the data
// test asserts membership against this single source.
export const VALID_TOUR_ROUTES = [
  '/',
  '/editor',
  '/multi',
  '/n2r',
  '/closure',
  '/pumping',
  '/challenges',
  '/simulate',
] as const

export type TourRoute = (typeof VALID_TOUR_ROUTES)[number]
