import type { Veredicto } from '../api/types'

interface VeredictoStyle {
  bg: string
  fg: string
  border: string
}

const VEREDICTO_STYLES: Record<Veredicto, VeredictoStyle> = {
  OK: {
    bg: 'var(--alert-success-bg)',
    fg: 'var(--state-success)',
    border: 'color-mix(in srgb, var(--state-success) 30%, transparent)',
  },
  PARCIAL: {
    bg: 'var(--alert-warning-bg)',
    fg: 'var(--state-warning)',
    border: 'color-mix(in srgb, var(--state-warning) 30%, transparent)',
  },
  BLOQUEADA: {
    bg: 'var(--alert-error-bg)',
    fg: 'var(--state-error)',
    border: 'color-mix(in srgb, var(--state-error) 30%, transparent)',
  },
  NO_MIGRADA: {
    bg: 'var(--gris-panel)',
    fg: 'var(--text-muted)',
    border: 'var(--border-default)',
  },
  NO_ENCONTRADA: {
    bg: 'rgba(123, 31, 162, 0.08)',
    fg: '#7b1fa2',
    border: 'rgba(123, 31, 162, 0.25)',
  },
}

/** Identifica visualmente el veredicto con la especificación Chip de SIGO Droop. */
export const VeredictoBadge = ({ veredicto }: { veredicto: Veredicto }) => {
  const style = VEREDICTO_STYLES[veredicto] ?? VEREDICTO_STYLES.NO_MIGRADA

  return (
    <span
      className="inline-flex h-6 shrink-0 select-none items-center gap-1.5 rounded-[16px] border px-2.5 text-[11px] font-bold uppercase tracking-wider"
      style={{
        backgroundColor: style.bg,
        color: style.fg,
        borderColor: style.border,
      }}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {veredicto.replaceAll('_', ' ')}
    </span>
  )
}
