'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const STORAGE_KEY = 'snowflake-quiz-theme'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'system'
  }
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

// Empty subscribe function for useSyncExternalStore
const emptySubscribe = (): (() => void) => {
  return () => {
    /* noop */
  }
}

// Use useSyncExternalStore to properly detect hydration
function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

export function ThemeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const isHydrated = useHydrated()

  // Use lazy initialization for theme state
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return 'system'
    }
    return getStoredTheme()
  })

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }
    const stored = getStoredTheme()
    return stored === 'system' ? getSystemTheme() : stored
  })

  // Update resolved theme based on theme setting
  useEffect(() => {
    if (!isHydrated) {
      return
    }

    const updateResolvedTheme = (): void => {
      const resolved = theme === 'system' ? getSystemTheme() : theme
      setResolvedTheme(resolved)

      // Update document class
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(resolved)
    }

    updateResolvedTheme()

    // Listen for system theme changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (): void => {
        updateResolvedTheme()
      }
      mediaQuery.addEventListener('change', handler)
      return () => {
        mediaQuery.removeEventListener('change', handler)
      }
    }
    return undefined
  }, [theme, isHydrated])

  const setTheme = useCallback((newTheme: Theme): void => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
  }, [])

  const toggleTheme = useCallback((): void => {
    setThemeState((current) => {
      const next = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  const contextValue = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  )

  // Prevent flash of wrong theme by not rendering until hydrated
  // The anti-flash script in the layout handles initial theme
  if (!isHydrated) {
    return <>{children}</>
  }

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
}

// Default values for SSR/SSG when context is not available
const defaultThemeContext: ThemeContextType = {
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {
    /* noop */
  },
  toggleTheme: () => {
    /* noop */
  },
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  // During SSR/SSG, return defaults instead of throwing
  if (context === undefined) {
    return defaultThemeContext
  }
  return context
}
