import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Lesson, LearningPath, TourState } from '@/types/tour'
import { tourPaths } from '@/data/lessons'

interface TourContextValue {
  state: TourState
  // The path currently being toured, resolved from state.pathId.
  currentPath: LearningPath | null
  // The lesson at the current step, or null when the tour is closed.
  currentLesson: Lesson | null
  totalSteps: number
  // The launcher registers its own ref here so focus restores there on close.
  triggerRef: RefObject<HTMLElement | null>
  open: (pathId: string) => void
  close: () => void
  next: () => void
  prev: () => void
  // Navigate to the current lesson's route without leaving the step (the
  // "Open this view" action).
  openCurrentView: () => void
}

const noop = () => {}

const defaultState: TourState = {
  isOpen: false,
  pathId: null,
  stepIndex: 0,
}

export const TourContext = createContext<TourContextValue>({
  state: defaultState,
  currentPath: null,
  currentLesson: null,
  totalSteps: 0,
  triggerRef: { current: null },
  open: noop,
  close: noop,
  next: noop,
  prev: noop,
  openCurrentView: noop,
})

// Build the route a lesson navigates to, carrying an optional preset as a query
// value. The route is an internal allow-list value from the lesson data, never
// user input, so navigation cannot target an off-origin path.
function lessonHref(lesson: Lesson): string {
  if (!lesson.route) return ''
  return lesson.preset
    ? `${lesson.route}?preset=${encodeURIComponent(lesson.preset)}`
    : lesson.route
}

// The tour state controller. In-memory only: re-opening resumes the last step
// within the session (stepIndex is not reset on close), with no storage.
export function useTourState(): TourContextValue {
  const navigate = useNavigate()
  const [state, setState] = useState<TourState>(defaultState)
  const triggerRef = useRef<HTMLElement | null>(null)

  const currentPath = state.pathId ? tourPaths[state.pathId] ?? null : null
  const totalSteps = currentPath?.lessons.length ?? 0

  const open = useCallback((pathId: string) => {
    setState(prev => {
      // Resume the last step when re-opening the same path; start at 0 otherwise.
      const resumeIndex = prev.pathId === pathId ? prev.stepIndex : 0
      return { isOpen: true, pathId, stepIndex: resumeIndex }
    })
  }, [])

  const close = useCallback(() => {
    // Keep pathId and stepIndex so the next open resumes where the learner left.
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const next = useCallback(() => {
    setState(prev => {
      const path = prev.pathId ? tourPaths[prev.pathId] : undefined
      if (!path) return prev
      const nextIndex = prev.stepIndex + 1
      // Past the last lesson, Next finishes the tour.
      if (nextIndex >= path.lessons.length) {
        return { ...prev, isOpen: false }
      }
      const lesson = path.lessons[nextIndex]
      // Navigate first so the target view begins mounting, then advance.
      const href = lessonHref(lesson)
      if (href) navigate(href)
      return { ...prev, stepIndex: nextIndex }
    })
  }, [navigate])

  const prev = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      stepIndex: Math.max(0, prevState.stepIndex - 1),
    }))
  }, [])

  const openCurrentView = useCallback(() => {
    const path = state.pathId ? tourPaths[state.pathId] : undefined
    const lesson = path?.lessons[state.stepIndex]
    if (!lesson) return
    const href = lessonHref(lesson)
    if (href) navigate(href)
  }, [navigate, state.pathId, state.stepIndex])

  const currentLesson =
    state.isOpen && currentPath
      ? currentPath.lessons[state.stepIndex] ?? null
      : null

  return useMemo(
    () => ({
      state,
      currentPath,
      currentLesson,
      totalSteps,
      triggerRef,
      open,
      close,
      next,
      prev,
      openCurrentView,
    }),
    [state, currentPath, currentLesson, totalSteps, open, close, next, prev, openCurrentView]
  )
}

export function useTour(): TourContextValue {
  return useContext(TourContext)
}
