import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { safeStorage } from '../shared/lib/safe-storage'
import { ThemeContext, type Theme } from './theme-context'

const getInitialTheme = (): Theme => {
  const savedTheme = safeStorage.getItem('theme')
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Sincroniza y expone el tema visual de la aplicación. */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    safeStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'

    // View Transitions API: fundido suave de texturas acelerado por GPU sin recalcular filtros
    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => void
    }

    if (!doc.startViewTransition || globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTheme(nextTheme)
      return
    }

    doc.startViewTransition(() => {
      flushSync(() => {
        setTheme(nextTheme)
      })
    })
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
    }),
    [theme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
