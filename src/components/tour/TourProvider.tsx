import type { JSX, ReactNode } from 'react'
import { TourContext, useTourState } from '@/hooks/useTour'
import { TourDialog } from './TourDialog'

// Provides the tour controller to the tree and renders the dialog as a SIBLING
// after children. Mounted once near the app root (above <Routes> in a later
// plan), this keeps the dialog outside any route element, so a route change from
// a route-linked Next re-renders only <Routes> and the dialog stays mounted on
// the same step across the navigation.
export function TourProvider({ children }: { children: ReactNode }): JSX.Element {
  const value = useTourState()
  return (
    <TourContext.Provider value={value}>
      {children}
      <TourDialog />
    </TourContext.Provider>
  )
}
