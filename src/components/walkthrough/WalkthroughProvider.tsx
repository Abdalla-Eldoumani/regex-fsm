import { ReactNode } from 'react'
import { WalkthroughContext, useWalkthroughState } from '@/hooks/useWalkthrough'
import { WalkthroughOverlay } from './WalkthroughOverlay'
import { WalkthroughTooltip } from './WalkthroughTooltip'

interface WalkthroughProviderProps {
  children: ReactNode
}

export function WalkthroughProvider({ children }: WalkthroughProviderProps) {
  const contextValue = useWalkthroughState()

  return (
    <WalkthroughContext.Provider value={contextValue}>
      {children}
      {contextValue.state.active && contextValue.currentStep && (
        <>
          <WalkthroughOverlay targetSelector={contextValue.currentStep.targetSelector} />
          <WalkthroughTooltip />
        </>
      )}
    </WalkthroughContext.Provider>
  )
}
