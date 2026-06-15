import { createContext, ReactNode, useState, useEffect } from 'react'
import { NotationMode } from './glyphs'

export interface NotationContextValue {
  mode: NotationMode
  setMode: (m: NotationMode) => void
}

// Undefined sentinel so useNotation can distinguish "used outside provider"
// from a provider that legitimately resolved to the default value.
export const NotationContext = createContext<NotationContextValue | undefined>(undefined)

const STORAGE_KEY = 'regex-fsm:notation-mode'

function readStoredMode(): NotationMode {
  // Fail-soft: if localStorage is unavailable or the stored value is corrupt,
  // fall back to 'course' without throwing.
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'course' || raw === 'textbook') return raw
  } catch {
    // Private-browsing mode or SecurityError — ignore and default.
  }
  return 'course'
}

interface NotationProviderProps {
  children: ReactNode
}

export function NotationProvider({ children }: NotationProviderProps) {
  // Lazy initializer reads localStorage once on mount; never throws (fail-soft above).
  const [mode, setModeState] = useState<NotationMode>(readStoredMode)

  // Write back to localStorage whenever the user changes the mode.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // Ignore write failures (storage full, private mode, etc.).
    }
  }, [mode])

  const setMode = (m: NotationMode) => setModeState(m)

  return (
    <NotationContext.Provider value={{ mode, setMode }}>
      {children}
    </NotationContext.Provider>
  )
}
