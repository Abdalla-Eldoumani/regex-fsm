export interface WalkthroughStep {
  id: string
  targetSelector: string
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  category: 'ui' | 'algorithm'
  lectureRef?: string
}

export interface Walkthrough {
  id: string
  name: string
  description: string
  steps: WalkthroughStep[]
}

export interface WalkthroughState {
  active: boolean
  walkthroughId: string | null
  stepIndex: number
}
