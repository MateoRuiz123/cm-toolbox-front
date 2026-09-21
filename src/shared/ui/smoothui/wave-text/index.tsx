import { motion, useReducedMotion } from 'motion/react'

export interface WaveTextProps {
  amplitude?: number
  children: string
  className?: string
  duration?: number
  staggerDelay?: number
}

export const WaveText = ({
  children,
  amplitude = 8,
  duration = 1.2,
  staggerDelay = 0.05,
  className = '',
}: WaveTextProps) => {
  const shouldReduceMotion = useReducedMotion()

  return (
    <span className={className}>
      {children.split('').map((char, index) => (
        <motion.span
          key={`${index}-${char}`}
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
                  repeat: Number.POSITIVE_INFINITY,
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
