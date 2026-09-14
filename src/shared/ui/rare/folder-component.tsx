import { useState } from 'react'
import type { ComponentProps } from 'react'
import { motion } from 'motion/react'
import { cn } from '../../lib/utils'

const themes = {
  blue: {
    backFill: '#0066cc',
    backInsetColor: '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.35 0',
    backInsetShadow: 'inset 0 0 6px 2px rgba(255,255,255,0.35)',
    flapFill: '#0052a3',
    flapFillOpacity: 0.85,
    flapStroke: '#3385d6',
    flapInsetColor: '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.15 0',
    cardFill: '#ffffff',
    cardStroke: '#e0e0e0',
    cardLineFill: '#90caf9',
    cardInsetColor: '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0',
  },
  orange: {
    backFill: '#eb5d2c',
    backInsetColor: '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.35 0',
    backInsetShadow: 'inset 0 0 6px 2px rgba(255,255,255,0.35)',
    flapFill: '#bc4a23',
    flapFillOpacity: 0.85,
    flapStroke: '#ef7d56',
    flapInsetColor: '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.15 0',
    cardFill: '#ffffff',
    cardStroke: '#e0e0e0',
    cardLineFill: '#ef7d56',
    cardInsetColor: '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0',
  },
  dark: {
    backFill: '#1b263b',
    backInsetColor: '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.37 0',
    backInsetShadow: 'inset 0 0 6px 2px rgba(255,255,255,0.37)',
    flapFill: '#0d1b2a',
    flapFillOpacity: 0.85,
    flapStroke: '#2b3d5b',
    flapInsetColor: '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0',
    cardFill: '#242d3d',
    cardStroke: '#3a4a63',
    cardLineFill: '#0066cc',
    cardInsetColor: '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.15 0',
  },
} as const

const sizeScales = {
  sm: 0.5,
  md: 0.75,
  lg: 1,
} as const

export type FolderComponentProps = Omit<ComponentProps<'div'>, 'color'> & {
  color?: keyof typeof themes
  size?: keyof typeof sizeScales
}

const BASE_WIDTH = 321
const BASE_HEIGHT = 270

const FLAP_PATH =
  'M0 25C0 11.1929 11.1929 0 25 0H136.084C143.044 0 149.689 2.90139 154.42 8.00608L178.08 33.5343C182.811 38.639 189.456 41.5404 196.416 41.5404H296C309.807 41.5404 321 52.7333 321 66.5404V216C321 229.807 309.807 241 296 241H25C11.1929 241 0 229.807 0 216V25Z'

export const FolderComponent = ({
  color = 'blue',
  size = 'md',
  className,
  ...props
}: FolderComponentProps) => {
  const theme = themes[color] ?? themes.blue
  const scale = sizeScales[size]
  const [isHovered, setIsHovered] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div
      data-slot="folder"
      className={cn('relative flex items-center justify-center select-none', className)}
      {...props}
    >
      <div
        className="relative cursor-pointer select-none"
        style={{
          width: BASE_WIDTH * scale,
          height: BASE_HEIGHT * scale,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          setIsOpen(false)
        }}
        onClick={() => setIsOpen((o) => !o)}
      >
        <div
          className="absolute top-1/2 left-1/2"
          style={{
            width: BASE_WIDTH,
            height: BASE_HEIGHT,
            transform: `translate(-50%, -50%) scale(${scale})`,
            perspective: 800 * scale,
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              style={{
                width: BASE_WIDTH,
                height: BASE_HEIGHT,
                borderRadius: 25,
                backgroundColor: theme.backFill,
                boxShadow: theme.backInsetShadow,
              }}
            />
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <motion.div
              className="absolute"
              animate={{
                y: isOpen ? -130 : isHovered ? -30 : -10,
                x: isOpen ? 60 : 35,
                rotate: isOpen ? 16 : isHovered ? 12 : 8,
              }}
              transition={{
                type: 'spring',
                stiffness: 120,
                damping: 13,
                delay: isOpen ? 0.08 : 0.05,
              }}
            >
              <Card id={1} theme={theme} />
            </motion.div>
            <motion.div
              className="absolute"
              animate={{
                y: isOpen ? -145 : isHovered ? -35 : -18,
                x: isOpen ? 0 : 2,
                rotate: isOpen ? -3 : isHovered ? -1 : 2,
              }}
              transition={{
                type: 'spring',
                stiffness: 120,
                damping: 13,
                delay: isOpen ? 0.04 : 0.02,
              }}
            >
              <Card id={2} theme={theme} />
            </motion.div>
            <motion.div
              className="absolute"
              animate={{
                y: isOpen ? -135 : isHovered ? -40 : -20,
                x: isOpen ? -55 : -35,
                rotate: isOpen ? -12 : isHovered ? -8 : -4,
              }}
              transition={{
                type: 'spring',
                stiffness: 120,
                damping: 13,
                delay: 0,
              }}
            >
              <Card id={3} theme={theme} />
            </motion.div>
          </div>

          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-4"
            style={{
              transformOrigin: 'bottom center',
              transformStyle: 'preserve-3d',
              width: 321,
              height: 241,
            }}
            animate={{
              rotateX: isOpen ? -45 : isHovered ? -25 : 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 120,
              damping: 14,
            }}
          >
            <svg
              width="321"
              height="241"
              viewBox="0 0 321 241"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d={FLAP_PATH}
                fill={theme.flapFill}
                fillOpacity={theme.flapFillOpacity}
              />
              <path
                d="M25 0.5H136.084C142.905 0.5 149.417 3.3431 154.054 8.3457L177.713 33.874C182.539 39.0808 189.317 42.04 196.416 42.04H296C309.531 42.04 320.5 53.0092 320.5 66.54V216C320.5 229.531 309.531 240.5 296 240.5H25C11.469 240.5 0.5 229.531 0.5 216V25C0.5 11.469 11.469 0.5 25 0.5Z"
                stroke={theme.flapStroke}
              />
            </svg>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

type Theme = (typeof themes)[keyof typeof themes]

const Card = ({ id: _id, theme }: { id: number; theme: Theme }) => {
  return (
    <div
      style={{
        width: 140,
        height: 180,
        backgroundColor: theme.cardFill,
        borderColor: theme.cardStroke,
      }}
      className="rounded-xl border p-3 shadow-md flex flex-col justify-between"
    >
      <div className="space-y-2">
        <div
          style={{ backgroundColor: theme.cardLineFill }}
          className="h-2 w-12 rounded-full"
        />
        <div
          style={{ backgroundColor: theme.cardLineFill }}
          className="h-1.5 w-full rounded-full opacity-60"
        />
        <div
          style={{ backgroundColor: theme.cardLineFill }}
          className="h-1.5 w-3/4 rounded-full opacity-40"
        />
      </div>
      <div className="flex items-center justify-between border-t border-[var(--border-default)] pt-2">
        <div className="size-3 rounded-full bg-[var(--color-primary)] opacity-80" />
        <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          CM
        </span>
      </div>
    </div>
  )
}
