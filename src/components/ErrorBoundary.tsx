import { Component, ReactNode, ErrorInfo } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg text-text flex items-center justify-center p-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-surface/80 backdrop-blur-xl rounded-3xl shadow-lg border border-error/30 p-8 md:p-12">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-full bg-error/20">
                <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h1 className="text-3xl font-bold text-text-hi text-center mb-4">
                Something went wrong
              </h1>

              <p className="text-text-mid text-center mb-6">
                We encountered an unexpected error. This has been logged and we'll look into it.
              </p>

              {this.state.error && (
                <div className="bg-error/10 border border-error/30 rounded-xl p-4 mb-6">
                  <p className="text-sm font-mono text-error break-all">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="min-h-[44px] px-6 py-3 bg-brand text-on-brand rounded-xl font-semibold transition-all hover:bg-brand-hover active:scale-95"
                >
                  Reload Page
                </button>

                <Link
                  to="/"
                  className="min-h-[44px] px-6 py-3 bg-surface-raised hover:bg-surface-overlay border border-border hover:border-border-strong rounded-xl text-text-mid font-semibold transition-all active:scale-95 text-center flex items-center justify-center"
                >
                  Go Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
