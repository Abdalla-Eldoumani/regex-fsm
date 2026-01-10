import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex items-center justify-center relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at center, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          opacity: 0.3
        }}></div>
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-error rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-primary rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="bg-surface/80 backdrop-blur-xl rounded-3xl shadow-hard border border-border p-12 md:p-16 text-center">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-error via-primary to-accent blur-3xl opacity-30 animate-pulse"></div>
            <h1 className="text-9xl md:text-[12rem] font-black font-mono bg-gradient-to-r from-error via-primary to-accent bg-clip-text text-transparent relative drop-shadow-2xl">
              404
            </h1>
          </div>

          <div className="space-y-6 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
              Page Not Found
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-error to-transparent mx-auto"></div>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          <div className="bg-error/10 border border-error/30 rounded-2xl p-6 mb-12 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-error/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="text-left flex-1">
                <h3 className="text-xl font-bold text-text-primary mb-2">Lost in the automaton?</h3>
                <p className="text-text-secondary">
                  Don't worry! You can navigate back to the home page and continue exploring regular expressions.
                </p>
              </div>
            </div>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-primary-hover rounded-xl text-background font-semibold transition-all hover:scale-105 hover:shadow-glow-primary active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Go to Home</span>
          </Link>

          <div className="mt-12 flex justify-center items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-error animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.3s' }}></div>
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" style={{ animationDelay: '0.6s' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound
