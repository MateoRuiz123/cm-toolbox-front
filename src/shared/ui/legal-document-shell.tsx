import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { SmoothTitleAccent } from '@/shared/ui/smooth-title-accent'

export interface LegalDocumentShellProps {
  readonly badge: ReactNode
  readonly accessibleTitle: string
  readonly before?: string
  readonly accent: string
  readonly after?: string
  readonly subtitle: ReactNode
  readonly children: ReactNode
}

export const LegalDocumentShell = ({
  badge,
  accessibleTitle,
  before = '',
  accent,
  after = '',
  subtitle,
  children,
}: LegalDocumentShellProps) => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] hover:underline"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Volver al portal</span>
        </Link>
      </div>

      <header className="mb-8 border-b border-[var(--border-default)] pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1 text-xs font-medium text-[var(--text-muted)] shadow-2xs mb-3">
          {badge}
        </div>
        <SmoothTitleAccent
          as="h1"
          className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-body)] mb-2"
          accessibleTitle={accessibleTitle}
          before={before}
          accent={accent}
          after={after}
          amplitude={3}
        />
        <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>
      </header>

      <article className="space-y-6 text-sm leading-relaxed text-[var(--text-body)]">
        {children}
      </article>
    </div>
  )
}
