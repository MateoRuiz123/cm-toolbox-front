import { useEffect, useRef, useState } from 'react'
import { useMovimientoReducido } from '@/shared/lib/use-movimiento-reducido'

export interface ScrambleHoverProps {
  children: string
  className?: string
  duration?: number
  speed?: number
}

const CHARACTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=<>?'.split(
    '',
  )

const scrambleText = (original: string) =>
  original
    .split('')
    .map((char) =>
      char === ' ' ? ' ' : CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)],
    )
    .join('')

/** Efecto scramble en hover; usa `span` para poder componer dentro de `Link`. */
export const ScrambleHover = ({
  children,
  duration = 600,
  speed = 30,
  className = '',
}: ScrambleHoverProps) => {
  const [display, setDisplay] = useState(children)
  const shouldReduceMotion = useMovimientoReducido()
  const [isHoverDevice, setIsHoverDevice] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }
    const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
    setIsHoverDevice(hoverQuery.matches)

    const handleHoverChange = (event: MediaQueryListEvent) => {
      setIsHoverDevice(event.matches)
    }

    hoverQuery.addEventListener('change', handleHoverChange)
    return () => hoverQuery.removeEventListener('change', handleHoverChange)
  }, [])

  const handleMouseEnter = () => {
    if (shouldReduceMotion || !isHoverDevice) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    intervalRef.current = setInterval(() => {
      setDisplay(() => scrambleText(children))
    }, speed)
    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setDisplay(children)
    }, duration)
  }

  const handleMouseLeave = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setDisplay(children)
  }

  return (
    <span
      className={className}
      onMouseEnter={isHoverDevice ? handleMouseEnter : undefined}
      onMouseLeave={handleMouseLeave}
      aria-hidden="true"
    >
      {display}
    </span>
  )
}

