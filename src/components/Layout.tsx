import { memo, useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { WalkthroughToggle } from './walkthrough/WalkthroughToggle'
import { NotationProvider } from '@/notation/NotationContext'
import { NotationToggle } from '@/notation/NotationToggle'

const Layout = memo(function Layout() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <NotationProvider>
    <div className="min-h-screen bg-bg text-text">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at center, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          opacity: 0.3
        }}></div>
      </div>

      <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-border shadow-md relative">
        <div className="absolute inset-0 bg-gradient-to-r from-brand/10 via-transparent to-brand-pressed/10 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <Link to="/" className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-gradient-to-br from-brand to-brand-pressed flex items-center justify-center shadow-lg ring-2 ring-brand/30 transition-all hover:ring-brand/60 hover:scale-105 cursor-pointer">
              <span className="text-on-brand font-mono font-bold text-xl drop-shadow-md">R</span>
            </Link>
            <div>
              <h1 className="text-lg lg:text-xl font-display font-bold text-text-hi tracking-tight">
                RegexFSM
              </h1>
            </div>
          </div>
          {/* tablet (md) compresses to text-xs + gap-0.5 to fit six links + controls in 768px; lg restores text-sm + gap-3 */}
          <div className="hidden md:flex items-center gap-0.5 lg:gap-3">
             {/* tagline pill -- decorative, only worth showing when there is room */}
             <span className="hidden lg:inline-flex text-sm font-medium text-text-mid bg-surface-raised px-3 py-1.5 rounded-full border border-border">
               Visualizing Regular Expressions
             </span>
             {/* Editor nav link -- min-h/min-w for 44px touch target; px-1 at md, px-3 at lg */}
             <NavLink
               to="/editor"
               className={({ isActive }) =>
                 'min-h-[44px] min-w-[44px] flex items-center px-1 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors ' +
                 (isActive
                   ? 'bg-brand-tint text-brand-hover border border-brand/30'
                   : 'text-text-mid hover:text-text-hi hover:bg-surface-raised border border-transparent')
               }
             >
               Editor
             </NavLink>
             {/* Multi-View nav link */}
             <NavLink
               to="/multi"
               className={({ isActive }) =>
                 'min-h-[44px] min-w-[44px] flex items-center px-1 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors ' +
                 (isActive
                   ? 'bg-brand-tint text-brand-hover border border-brand/30'
                   : 'text-text-mid hover:text-text-hi hover:bg-surface-raised border border-transparent')
               }
             >
               Multi-View
             </NavLink>
             {/* NFA to Regex nav link */}
             <NavLink
               to="/n2r"
               className={({ isActive }) =>
                 'min-h-[44px] min-w-[44px] flex items-center px-1 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors ' +
                 (isActive
                   ? 'bg-brand-tint text-brand-hover border border-brand/30'
                   : 'text-text-mid hover:text-text-hi hover:bg-surface-raised border border-transparent')
               }
             >
               NFA&#x2192;Regex
             </NavLink>
             {/* Closure constructions nav link */}
             <NavLink
               to="/closure"
               className={({ isActive }) =>
                 'min-h-[44px] min-w-[44px] flex items-center px-1 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors ' +
                 (isActive
                   ? 'bg-brand-tint text-brand-hover border border-brand/30'
                   : 'text-text-mid hover:text-text-hi hover:bg-surface-raised border border-transparent')
               }
             >
               Closure
             </NavLink>
             {/* Pumping lemma game nav link */}
             <NavLink
               to="/pumping"
               className={({ isActive }) =>
                 'min-h-[44px] min-w-[44px] flex items-center px-1 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors ' +
                 (isActive
                   ? 'bg-brand-tint text-brand-hover border border-brand/30'
                   : 'text-text-mid hover:text-text-hi hover:bg-surface-raised border border-transparent')
               }
             >
               Pumping
             </NavLink>
             {/* Construction challenges nav link */}
             <NavLink
               to="/challenges"
               className={({ isActive }) =>
                 'min-h-[44px] min-w-[44px] flex items-center px-1 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors ' +
                 (isActive
                   ? 'bg-brand-tint text-brand-hover border border-brand/30'
                   : 'text-text-mid hover:text-text-hi hover:bg-surface-raised border border-transparent')
               }
             >
               Challenges
             </NavLink>
             <NotationToggle />
             <WalkthroughToggle />
             <a
               href="/github"
               className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-low hover:text-brand-hover transition-all hover:scale-110 active:scale-95"
             >
               <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                 <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
               </svg>
             </a>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
    </NotationProvider>
  )
})

export default Layout
