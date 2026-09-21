import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ScrambleHover } from '@/shared/ui/smoothui/scramble-hover'
import { WaveText } from '@/shared/ui/smoothui/wave-text'

type HeadingTag = 'h1' | 'h2' | 'h3'

export interface SmoothTitleAccentProps {
  readonly as?: HeadingTag
  readonly className?: string
  readonly accessibleTitle: string
  readonly before?: string
  readonly accent: string
  readonly after?: string
  readonly amplitude?: number
  readonly accentClassName?: string
}

export const SmoothTitleAccent = ({
  as: Tag = 'h1',
  className,
  accessibleTitle,
  before = '',
  accent,
  after = '',
  amplitude = 3,
  accentClassName = 'text-[var(--color-primary)]',
}: SmoothTitleAccentProps) => {
  return (
    <Tag className={className}>
      <span className="sr-only">{accessibleTitle}</span>
      <span aria-hidden className="inline">
        {before}
        <WaveText amplitude={amplitude} className={accentClassName}>
          {accent}
        </WaveText>
        {after}
      </span>
    </Tag>
  )
}

export interface SmoothLinkScrambleProps {
  readonly to: string
  readonly className?: string
  readonly accessibleLabel: string
  readonly before?: string
  readonly scrambleText: string
  readonly trailing?: ReactNode
}

export const SmoothLinkScramble = ({
  to,
  className,
  accessibleLabel,
  before = '',
  scrambleText,
  trailing,
}: SmoothLinkScrambleProps) => {
  return (
    <Link to={to} className={className}>
      <span className="sr-only">{accessibleLabel}</span>
      <span aria-hidden className="inline-flex items-center gap-1">
        {before}
        <ScrambleHover>{scrambleText}</ScrambleHover>
      </span>
      {trailing}
    </Link>
  )
}
