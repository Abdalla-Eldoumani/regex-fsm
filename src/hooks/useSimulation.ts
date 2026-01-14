import { useState, useEffect, useCallback } from 'react'
import { Automaton } from '@/core/automata/types'
import { simulateNFA, simulateDFA, SimulationResult } from '@/core/algorithms/simulate'

interface UseSimulationOptions {
  automaton: Automaton | null
  input: string
  mode: 'nfa' | 'dfa'
}

export function useSimulation({ automaton, input, mode }: UseSimulationOptions) {
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(1000)

  useEffect(() => {
    if (!automaton || input === null || input === undefined) {
      setResult(null)
      setCurrentStep(0)
      setIsRunning(false)
      return
    }

    try {
      const simResult = mode === 'nfa'
        ? simulateNFA(automaton, input)
        : simulateDFA(automaton, input)

      setResult(simResult)
      setCurrentStep(0)
      setIsRunning(false)
    } catch {
      setResult(null)
      setCurrentStep(0)
    }
  }, [automaton, input, mode])

  useEffect(() => {
    if (!isRunning || !result) return

    const canContinue = currentStep < result.steps.length - 1
    if (!canContinue) {
      setIsRunning(false)
      return
    }

    const timer = setTimeout(() => {
      setCurrentStep(prev => prev + 1)
    }, speed)

    return () => clearTimeout(timer)
  }, [isRunning, currentStep, result, speed])

  const stepForward = useCallback(() => {
    if (!result) return
    setCurrentStep(prev => Math.min(prev + 1, result.steps.length - 1))
  }, [result])

  const stepBack = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  const reset = useCallback(() => {
    setCurrentStep(0)
    setIsRunning(false)
  }, [])

  const play = useCallback(() => {
    if (!result || currentStep >= result.steps.length - 1) return
    setIsRunning(true)
  }, [result, currentStep])

  const pause = useCallback(() => {
    setIsRunning(false)
  }, [])

  const complete = useCallback(() => {
    if (!result) return
    setCurrentStep(result.steps.length - 1)
    setIsRunning(false)
  }, [result])

  const currentStepData = result?.steps[currentStep] || null
  const canStep = result ? currentStep < result.steps.length - 1 : false
  const canReset = currentStep > 0

  return {
    result,
    currentStep,
    currentStepData,
    isRunning,
    canStep,
    canReset,
    speed,
    setSpeed,
    stepForward,
    stepBack,
    reset,
    play,
    pause,
    complete,
  }
}
