import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { RouterContext } from './router-context-base'
import { useRouter } from './use-router'

export type { RouterContextValue } from './router-context-base'

export interface RouterProviderProps {
  readonly children: ReactNode
  readonly initialPath?: string
}

export const RouterProvider = ({ children, initialPath }: RouterProviderProps) => {
  const [path, setPath] = useState<string>(() => {
    if (initialPath) return initialPath
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/'
    }
    return '/'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handlePopState = () => {
      setPath(window.location.pathname || '/')
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const navigate = (to: string, replace = false) => {
    if (typeof window !== 'undefined') {
      if (replace) {
        window.history.replaceState(null, '', to)
      } else {
        window.history.pushState(null, '', to)
      }
    }
    setPath(to)
  }

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  )
}

export interface LinkProps {
  readonly href: string
  readonly className?: string
  readonly children: ReactNode
  readonly title?: string
  readonly 'aria-label'?: string
}

export const Link = ({ href, className, children, title, 'aria-label': ariaLabel }: LinkProps) => {
  const { navigate } = useRouter()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return
    }

    event.preventDefault()
    navigate(href)
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className={className}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  )
}
