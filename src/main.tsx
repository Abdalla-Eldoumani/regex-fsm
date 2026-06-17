/* eslint-disable react-refresh/only-export-components -- app entry point: Fast Refresh of exports is moot here; the lazy() route consts and LoadingFallback are not refreshable components */
import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { TourProvider } from './components/tour'
// Fonts before ./index.css so the @font-face rules register before tokens apply.
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/hanken-grotesk'
import '@fontsource-variable/jetbrains-mono'
import './index.css'

const App = lazy(() => import('./components/App'))
const NotFound = lazy(() => import('./components/NotFound'))
const GithubRedirect = lazy(() => import('./components/GithubRedirect'))
const EditorView = lazy(() => import('./components/editor/EditorView').then(m => ({ default: m.EditorView })))
const MultiView = lazy(() => import('./components/multiview/MultiView'))
const NfaToRegexView = lazy(() => import('./components/n2r/NfaToRegexView'))
const ClosureView = lazy(() => import('./components/closure/ClosureView'))
const PumpingView = lazy(() => import('./components/pumping/PumpingView'))
const ChallengesView = lazy(() => import('./components/challenges/ChallengesView'))
const SimulationView = lazy(() => import('./components/simulation/SimulationView'))

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-text-mid">Loading...</p>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <TourProvider>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<App />} />
                <Route path="/editor" element={<EditorView />} />
                <Route path="/multi" element={<MultiView />} />
                <Route path="/n2r" element={<NfaToRegexView />} />
                <Route path="/closure" element={<ClosureView />} />
                <Route path="/pumping" element={<PumpingView />} />
                <Route path="/challenges" element={<ChallengesView />} />
                <Route path="/simulate" element={<SimulationView />} />
                <Route path="/github" element={<GithubRedirect />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </TourProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
