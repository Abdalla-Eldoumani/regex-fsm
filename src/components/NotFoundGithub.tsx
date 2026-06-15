import { Link } from 'react-router-dom'

function NotFoundGithub() {
  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at center, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          opacity: 0.3
        }}></div>
        {/* Ambient glows — reduced-motion reset in index.css collapses these */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-brand/20 rounded-full mix-blend-screen filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-brand-pressed/20 rounded-full mix-blend-screen filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="bg-surface/80 backdrop-blur-xl rounded-3xl shadow-lg border border-border p-12 md:p-16 text-center">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-brand via-brand-hover to-brand-pressed blur-3xl opacity-30 animate-pulse"></div>
            <h1 className="text-9xl md:text-[12rem] font-black font-mono bg-gradient-to-r from-brand via-brand-hover to-brand-pressed bg-clip-text text-transparent relative drop-shadow-2xl">
              404
            </h1>
          </div>

          <div className="space-y-6 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-hi">
              Repository Not Public Yet
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-brand to-transparent mx-auto"></div>
            <p className="text-lg text-text-mid max-w-2xl mx-auto leading-relaxed">
              The GitHub repository for RegexFSM is currently in private development.
              We're working hard to polish it before making it open source.
            </p>
          </div>

          <div className="bg-brand-tint border border-brand/30 rounded-2xl p-6 mb-12 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-tint flex items-center justify-center">
                <svg className="w-6 h-6 text-brand-hover" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left flex-1">
                <h3 className="text-xl font-bold text-text-hi mb-2">Stay Updated</h3>
                <p className="text-text-mid">
                  Follow us on LinkedIn to be notified when the repository goes public!
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-12">
            <p className="text-sm font-semibold text-text-low uppercase tracking-wider">
              Connect with us to stay Updated
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://www.linkedin.com/in/abdallaeldoumani/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center gap-3 min-h-[44px] px-6 py-3 bg-brand text-on-brand rounded-xl font-semibold transition-all hover:bg-brand-hover active:scale-95"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span>Abdalla ElDoumani</span>
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>

              <a
                href="https://www.linkedin.com/in/ibrahim-ahmed-7748a6242/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center gap-3 min-h-[44px] px-6 py-3 bg-surface-raised hover:bg-surface-overlay border border-border hover:border-border-strong text-text-mid hover:text-text-hi rounded-xl font-semibold transition-all active:scale-95"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span>Ibrahim Ahmed</span>
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-2 min-h-[44px] px-8 py-3 bg-surface-raised hover:bg-surface-overlay border border-border hover:border-border-strong rounded-xl text-text-mid hover:text-text-hi font-medium transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Home</span>
          </Link>

          <div className="mt-12 flex justify-center items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-brand-hover animate-pulse" style={{ animationDelay: '0.3s' }}></div>
            <div className="w-2 h-2 rounded-full bg-brand-pressed animate-pulse" style={{ animationDelay: '0.6s' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFoundGithub
