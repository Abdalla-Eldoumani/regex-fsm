import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Redirect } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { WalkthroughProvider } from './components/walkthrough/WalkthroughProvider'
import './index.css'

const App = lazy(() => import('./components/App'))
const NotFound = lazy(() => import('./components/NotFound'))
const NotFoundGithub = lazy(() => import('./components/NotFoundGithub'))

// eslint-disable-next-line react-refresh/only-export-components
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-text-secondary">Loading...</p>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <WalkthroughProvider>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<App />} />
                <Route path="/github" element={<Redirect to={"https://github.com/Abdalla-Eldoumani/regex-fsm"} />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </WalkthroughProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
