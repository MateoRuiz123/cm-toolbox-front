import { useState } from 'react'
import { motion } from 'motion/react'
import { useMovimientoReducido } from '@/shared/lib/use-movimiento-reducido'

export interface WaveTextProps {
  amplitude?: number
  children: string
  className?: string
  duration?: number
  staggerDelay?: number
  /** Repeticiones tras la primera onda. Finito por defecto para no distraer la visión periférica. */
  repeat?: number
  /** Repite la onda al pasar el cursor. */
  replayOnHover?: boolean
}

export const WaveText = ({
  children,
  amplitude = 8,
  duration = 1.2,
  staggerDelay = 0.05,
  className = '',
  repeat = 1,
  replayOnHover = true,
}: WaveTextProps) => {
  const shouldReduceMotion = useMovimientoReducido()
  const [ciclo, setCiclo] = useState(0)

  const handleMouseEnter = () => {
    if (!replayOnHover || shouldReduceMotion) return
    setCiclo((actual) => actual + 1)
  }

  return (
    <span className={className} onMouseEnter={handleMouseEnter}>
      {children.split('').map((char, index) => (
        <motion.span
          key={`${ciclo}-${index}-${char}`}
          animate={
            shouldReduceMotion
              ? { y: 0 }
              : { y: [0, -amplitude, 0, amplitude * 0.5, 0] }
          }
          style={{
            display: 'inline-block',
            willChange: shouldReduceMotion ? undefined : 'transform',
          }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  delay: index * staggerDelay,
                  duration,
                  ease: [0.37, 0, 0.63, 1],
                  repeat: ciclo > 0 ? 0 : repeat,
                  times: [0, 0.25, 0.5, 0.75, 1],
                }
          }
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  )
}
