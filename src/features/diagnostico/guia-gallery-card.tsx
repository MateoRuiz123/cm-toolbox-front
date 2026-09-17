import type { MouseEvent } from 'react'
import type { GuiaDiagnostico, ItemDiagnostico, ReintentoItemState } from './api/types'
import { VeredictoBadge } from './veredicto-badge'
import { CopyButton } from '../../shared/ui/copy-button'

interface GuiaGalleryCardProps {
  guia: GuiaDiagnostico
  item: ItemDiagnostico
  selected: boolean
  reintentoState?: ReintentoItemState
  onToggleSelect: (selected: boolean) => void
  onReintentar: (codigoRemision: string) => void
  onOpenDetalle: () => void
}

/** Tarjeta compacta para la vista de cuadrícula según SIGO Droop. */
export const GuiaGalleryCard = ({
  guia,
  item,
  selected,
  reintentoState,
  onToggleSelect,
  onReintentar,
  onOpenDetalle,
}: GuiaGalleryCardProps) => {
  const fallidos = guia.checks.filter((check) => check.resultado === 'no_cumple').length
  const esNoOk = guia.veredicto !== 'OK'
  const isLoading = reintentoState?.status === 'loading'
  const isSuccess = reintentoState?.status === 'success'
  const isError = reintentoState?.status === 'error'

  const handleCardClick = () => {
    onOpenDetalle()
  }

  const handleCheckboxClick = (event: MouseEvent<HTMLInputElement>) => {
    event.stopPropagation()
  }

  const handleReintentarClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onReintentar(guia.codigo_remision)
  }

  return (
    <article
      onClick={handleCardClick}
      style={{ boxShadow: 'var(--shadow-1)' }}
      className={`surface group relative flex h-full cursor-pointer flex-col justify-between rounded-[var(--radius-2)] border p-4 sm:p-5 transition-[transform,box-shadow,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-[var(--color-primary)] ${
        selected ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' : 'border-[var(--border-default)]'
      }`}
    >
      <div>
        {/* Cabecera de la tarjeta */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={selected}
              onClick={handleCheckboxClick}
              onChange={(e) => onToggleSelect(e.target.checked)}
              aria-label={`Seleccionar remisión ${guia.codigo_remision}`}
              className="size-4 cursor-pointer rounded-[2px] border-[var(--border-default)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Remisión</p>
              <div className="flex items-center gap-1.5">
                <h3 className="font-mono text-sm font-bold tracking-tight text-[var(--text-body)] sm:text-base">
                  {guia.codigo_remision}
                </h3>
                <CopyButton text={guia.codigo_remision} />
              </div>
            </div>
          </div>
          <VeredictoBadge veredicto={guia.veredicto} />
        </div>

        {/* Origen y cuenta */}
        <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <span className="font-semibold">{item.origen === 'despacho' ? `Despacho ${item.codigo_despacho}` : 'Remisión suelta'}</span>
          {item.cuenta && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate" title={item.cuenta}>{item.cuenta}</span>
            </>
          )}
        </div>

        {/* Extracto del resumen */}
        <p
          className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)] group-hover:text-[var(--text-body)] transition-colors"
          title={guia.resumen}
        >
          {guia.resumen || 'Sin resumen registrado.'}
        </p>
      </div>

      {/* Pie con checks y botón de reintento */}
      <div className="mt-3.5 border-t border-[var(--border-default)] pt-3">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>
            {guia.checks.length === 0
              ? 'Sin checks'
              : fallidos > 0
                ? `${fallidos} no cumplen`
                : `${guia.checks.length} checks OK`}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenDetalle()
            }}
            className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)] hover:underline"
          >
            Detalle →
          </button>
        </div>

        {/* Botón individual de reintento si no es OK (Naranja Coordinadora) */}
        {esNoOk && (
          <div className="mt-2.5">
            <button
              type="button"
              disabled={isLoading}
              onClick={handleReintentarClick}
              className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                isSuccess
                  ? 'border border-[var(--state-success)]/40 bg-[var(--alert-success-bg)] text-[var(--state-success)]'
                  : isError
                    ? 'border border-[var(--state-error)]/40 bg-[var(--alert-error-bg)] text-[var(--state-error)]'
                    : 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] hover:bg-[var(--color-accent-hover)] shadow-sm'
              } disabled:cursor-wait disabled:opacity-60`}
            >
              {isLoading && (
                <span aria-hidden="true" className="size-3 animate-spin rounded-full border-2 border-current/30 border-t-current" />
              )}
              {isLoading ? (
                'Reintentando…'
              ) : isSuccess ? (
                <span className="inline-flex items-center gap-1.5">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor">
                    <path d="M5 13l4 4L19 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Enviada a migración</span>
                </span>
              ) : isError ? (
                'Reintentar (falló previo)'
              ) : (
                'Reintentar migración'
              )}
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
