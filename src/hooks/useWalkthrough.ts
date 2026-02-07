import { createContext, useContext, useState, useCallback } from 'react'
import { WalkthroughState, Walkthrough, WalkthroughStep } from '@/types/walkthrough'

interface WalkthroughContextValue {
  state: WalkthroughState
  currentWalkthrough: Walkthrough | null
  currentStep: WalkthroughStep | null
  totalSteps: number
  start: (walkthrough: Walkthrough) => void
  next: () => void
  prev: () => void
  skip: () => void
  goToStep: (idx: number) => void
}

const defaultState: WalkthroughState = {
  active: false,
  walkthroughId: null,
  stepIndex: 0,
}

export const WalkthroughContext = createContext<WalkthroughContextValue>({
  state: defaultState,
  currentWalkthrough: null,
  currentStep: null,
  totalSteps: 0,
  start: () => {},
  next: () => {},
  prev: () => {},
  skip: () => {},
  goToStep: () => {},
})

export function useWalkthroughState() {
  const [state, setState] = useState<WalkthroughState>(defaultState)
  const [walkthrough, setWalkthrough] = useState<Walkthrough | null>(null)

  const start = useCallback((wt: Walkthrough) => {
    setWalkthrough(wt)
    setState({ active: true, walkthroughId: wt.id, stepIndex: 0 })
  }, [])

  const next = useCallback(() => {
    setState(prev => {
      if (!walkthrough || prev.stepIndex >= walkthrough.steps.length - 1) {
        return { active: false, walkthroughId: null, stepIndex: 0 }
      }
      return { ...prev, stepIndex: prev.stepIndex + 1 }
    })
  }, [walkthrough])

  const prev = useCallback(() => {
    setState(prev => ({
      ...prev,
      stepIndex: Math.max(0, prev.stepIndex - 1),
    }))
  }, [])

  const skip = useCallback(() => {
    setState(defaultState)
    setWalkthrough(null)
  }, [])

  const goToStep = useCallback((idx: number) => {
    setState(prev => ({
      ...prev,
      stepIndex: Math.max(0, Math.min(idx, (walkthrough?.steps.length ?? 1) - 1)),
    }))
  }, [walkthrough])

  const currentStep = walkthrough && state.active
    ? walkthrough.steps[state.stepIndex] ?? null
    : null

  return {
    state,
    currentWalkthrough: state.active ? walkthrough : null,
    currentStep,
    totalSteps: walkthrough?.steps.length ?? 0,
    start,
    next,
    prev,
    skip,
    goToStep,
  }
}

export function useWalkthrough() {
  return useContext(WalkthroughContext)
}
