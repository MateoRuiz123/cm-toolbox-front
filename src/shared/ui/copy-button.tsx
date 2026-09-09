import { useState, useRef, useEffect, type MouseEvent } from 'react'

interface CopyButtonProps {
  readonly text: string
  readonly label?: string
  readonly className?: string
}

/** Botón accesible para copiar texto al portapapeles con feedback visual temporal. */
export const CopyButton = ({ text, label, className = '' }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleCopy = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        setCopied(false)
      }, 1500)
    } catch {
      // Fallback si no hay permisos de portapapeles
    }
  }

  const ariaLabel = label ?? `Copiar remisión ${text}`
  const tooltip = copied ? '¡Copiado al portapapeles!' : ariaLabel

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={ariaLabel}
      title={tooltip}
      className={`inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:ring-1 focus-visible:ring-[var(--accent)] ${className}`}
    >
      {copied ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-3.5 text-[var(--ok)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      )}
    </button>
  )
}
