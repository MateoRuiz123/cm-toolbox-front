import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type {
  AsignarEquipoDespachoInput,
  GuiaDiagnostico,
  ItemDiagnostico,
  ReintentoItemState,
} from './api/types'
import { VeredictoBadge } from './veredicto-badge'
import { CopyButton } from '../../shared/ui/copy-button'
import { CheckRow } from './check-row'

interface GuiaDetalleModalProps {
  guia: GuiaDiagnostico
  item: ItemDiagnostico
  canRemigrate?: boolean
  canEditDespachoTesting?: boolean
  reintentoState?: ReintentoItemState
  onReintentar?: (codigoRemision: string) => void | Promise<void>
  onAsignarEquipoDespacho?: (input: AsignarEquipoDespachoInput) => Promise<void>
  onRediagnosticar?: () => void
  onClose: () => void
}

/** Modal dialog estructurado según el componente Dialog de SIGO Droop. */
export const GuiaDetalleModal = ({
  guia,
  item,
  canRemigrate = true,
  canEditDespachoTesting = false,
  reintentoState,
  onReintentar,
  onAsignarEquipoDespacho,
  onRediagnosticar,
  onClose,
}: GuiaDetalleModalProps) => {
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const equipoInputId = useId()
  const recibidorInputId = useId()
  const movilInputId = useId()

  const [equipo, setEquipo] = useState(item.equipo ?? '')
  const [recibidor, setRecibidor] = useState(
    item.recibidor !== null && item.recibidor !== undefined ? String(item.recibidor) : '',
  )
  const [movil, setMovil] = useState(item.movil ?? '')
  const [guardandoEquipo, setGuardandoEquipo] = useState(false)
  const [errorEquipo, setErrorEquipo] = useState<string | null>(null)
  const [exitoEquipo, setExitoEquipo] = useState<string | null>(null)

  useEffect(() => {
    setEquipo(item.equipo ?? '')
    setRecibidor(
      item.recibidor !== null && item.recibidor !== undefined ? String(item.recibidor) : '',
    )
    setMovil(item.movil ?? '')
    setErrorEquipo(null)
    setExitoEquipo(null)
  }, [item.codigo_despacho, item.id_cliente, item.equipo, item.recibidor, item.movil])

  // Scroll lock en el body
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  // Autoenfoque al abrir y trampa de foco (Escape / Tab)
  useEffect(() => {
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const fallidos = guia.checks.filter((check) => check.resultado === 'no_cumple').length
  const esNoOk = guia.veredicto !== 'OK'
  const isLoading = reintentoState?.status === 'loading'
  const isSuccess = reintentoState?.status === 'success'
  const isError = reintentoState?.status === 'error'
  const tieneDespacho = item.codigo_despacho !== undefined && item.codigo_despacho > 0
  const puedeEditarDespacho =
    canEditDespachoTesting &&
    canRemigrate &&
    Boolean(onAsignarEquipoDespacho) &&
    Boolean(item.id_cliente) &&
    tieneDespacho

  const handleGuardarEquipo = async (e: FormEvent, reintentarLuego: boolean) => {
    e.preventDefault()
    if (!puedeEditarDespacho || !onAsignarEquipoDespacho || !item.id_cliente || !item.codigo_despacho) {
      return
    }
    const equipoTrim = equipo.trim()
    const recibidorNum = Number(recibidor.trim())
    if (!equipoTrim) {
      setErrorEquipo('Ingresa un código de equipo válido.')
      return
    }
    if (!Number.isInteger(recibidorNum) || recibidorNum <= 0) {
      setErrorEquipo('El recibidor debe ser un número entero positivo.')
      return
    }

    setGuardandoEquipo(true)
    setErrorEquipo(null)
    setExitoEquipo(null)
    let guardado = false
    try {
      await onAsignarEquipoDespacho({
        id_cliente: item.id_cliente,
        codigo_despacho: item.codigo_despacho,
        equipo: equipoTrim,
        recibidor: recibidorNum,
        movil: movil.trim() || null,
      })
      guardado = true
      setExitoEquipo('Equipo, recibidor y móvil guardados en agw_despachos.')
    } catch (err) {
      setErrorEquipo(
        err instanceof Error ? err.message : 'No fue posible actualizar el despacho.',
      )
    } finally {
      setGuardandoEquipo(false)
    }

    // El reintento se dispara sin bloquear el formulario: su estado se muestra en reintentoState.
    if (guardado && reintentarLuego && onReintentar) {
      void onReintentar(guia.codigo_remision)
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-guia-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 animate-modal-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
    >
      <section
        ref={dialogRef}
        style={{ boxShadow: 'var(--shadow-24)' }}
        className="surface flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-2)] border border-[var(--border-default)] animate-modal-dialog"
      >
        {/* Cabecera del modal (Title bar gris de diálogo) */}
        <header className="flex items-start justify-between border-b border-[var(--border-default)] bg-[var(--surface-sunken)] p-4 sm:px-6 sm:py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {tieneDespacho && item.codigo_despacho !== undefined ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-body)]">
                  <span>Despacho {item.codigo_despacho}</span>
                  <CopyButton text={String(item.codigo_despacho)} />
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Remisión suelta
                </span>
              )}
              {item.cuenta && (
                <>
                  <span aria-hidden="true" className="text-[var(--text-muted)]">
                    ·
                  </span>
                  <span className="text-xs text-[var(--text-muted)]" title={item.cuenta}>
                    {item.cuenta}
                  </span>
                </>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <h2 id="modal-guia-title" className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-body)]">
                {guia.codigo_remision}
              </h2>
              <CopyButton text={guia.codigo_remision} className="size-6" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <VeredictoBadge veredicto={guia.veredicto} />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Cerrar detalle"
              className="grid size-8 cursor-pointer place-items-center rounded-[var(--radius-1)] text-[var(--text-muted)] hover:bg-[var(--border-default)]/30 hover:text-[var(--text-body)] transition-colors"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor">
                <path d="M18 6 6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </header>

        {/* Cuerpo con scroll */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Resumen */}
          <section className="rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4 text-xs sm:text-sm leading-relaxed">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Diagnóstico / Resumen
            </p>
            <p className="mt-1 text-[var(--text-body)]">{guia.resumen || 'Sin resumen registrado.'}</p>
          </section>

          {/* Asignación de equipo, recibidor y móvil en agw_despachos (solo ambiente testing) */}
          {puedeEditarDespacho && (
            <form
              onSubmit={(e) => void handleGuardarEquipo(e, true)}
              className="rounded-[var(--radius-2)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/35 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
                    Asignar equipo en agw_despachos
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Solo ambiente Testing &bull; Despacho {item.codigo_despacho} (CI {item.id_cliente})
                  </p>
                </div>
                <span className="rounded-[var(--radius-pill)] border border-[var(--color-primary)]/35 bg-[var(--surface-card)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
                  Testing
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor={equipoInputId}
                    className="block text-[11px] font-bold text-[var(--text-body)]"
                  >
                    Equipo *
                  </label>
                  <input
                    id={equipoInputId}
                    type="text"
                    value={equipo}
                    onChange={(e) => setEquipo(e.target.value)}
                    placeholder="Ej. E001"
                    disabled={guardandoEquipo}
                    className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 font-mono text-xs text-[var(--text-body)] focus:border-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  />
                </div>
                <div>
                  <label
                    htmlFor={recibidorInputId}
                    className="block text-[11px] font-bold text-[var(--text-body)]"
                  >
                    Recibidor *
                  </label>
                  <input
                    id={recibidorInputId}
                    type="number"
                    min={1}
                    step={1}
                    value={recibidor}
                    onChange={(e) => setRecibidor(e.target.value)}
                    placeholder="Ej. 1234"
                    disabled={guardandoEquipo}
                    className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 font-mono text-xs text-[var(--text-body)] focus:border-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  />
                </div>
                <div>
                  <label
                    htmlFor={movilInputId}
                    className="block text-[11px] font-bold text-[var(--text-body)]"
                  >
                    Móvil
                  </label>
                  <input
                    id={movilInputId}
                    type="text"
                    value={movil}
                    onChange={(e) => setMovil(e.target.value)}
                    placeholder="Opcional"
                    disabled={guardandoEquipo}
                    className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 font-mono text-xs text-[var(--text-body)] focus:border-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  />
                </div>
              </div>

              {errorEquipo && (
                <p
                  role="alert"
                  className="rounded-[var(--radius-1)] border border-[var(--state-error)]/30 bg-[var(--alert-error-bg)] px-3 py-2 text-xs text-[var(--state-error)]"
                >
                  {errorEquipo}
                </p>
              )}
              {exitoEquipo && (
                <p
                  role="status"
                  className="rounded-[var(--radius-1)] border border-[var(--state-success)]/30 bg-[var(--alert-success-bg)] px-3 py-2 text-xs text-[var(--state-success)]"
                >
                  {exitoEquipo}
                </p>
              )}
              {isLoading && (
                <p
                  role="status"
                  className="flex items-center gap-2 rounded-[var(--radius-1)] border border-[var(--color-primary)]/30 bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--text-body)]"
                >
                  <span
                    aria-hidden="true"
                    className="size-3 shrink-0 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]"
                  />
                  Reintentando migración… puede tardar hasta 30 segundos.
                </p>
              )}
              {isSuccess && (
                <div
                  role="status"
                  className="space-y-2 rounded-[var(--radius-1)] border border-[var(--state-success)]/30 bg-[var(--alert-success-bg)] px-3 py-2 text-xs text-[var(--state-success)]"
                >
                  <p>
                    {reintentoState?.error ||
                      'Solicitud de migración enviada correctamente. Re-diagnostica para confirmar el nuevo estado.'}
                  </p>
                  {onRediagnosticar && (
                    <button
                      type="button"
                      onClick={onRediagnosticar}
                      className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--state-success)]/40 bg-[var(--surface-card)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--state-success)] transition hover:bg-[var(--state-success)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      Cerrar y re-diagnosticar
                    </button>
                  )}
                </div>
              )}
              {isError && (
                <p
                  role="alert"
                  className="rounded-[var(--radius-1)] border border-[var(--state-error)]/30 bg-[var(--alert-error-bg)] px-3 py-2 text-xs text-[var(--state-error)]"
                >
                  {reintentoState?.error || 'No fue posible forzar la migración.'}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={guardandoEquipo || isLoading}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-accent-contrast)] shadow-xs transition hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:cursor-wait disabled:opacity-60"
                >
                  {guardandoEquipo
                    ? 'Guardando…'
                    : isLoading
                      ? 'Reintentando…'
                      : 'Guardar y reintentar migración'}
                </button>
                <button
                  type="button"
                  disabled={guardandoEquipo || isLoading}
                  onClick={(e) => void handleGuardarEquipo(e, false)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:cursor-wait disabled:opacity-60"
                >
                  Solo guardar
                </button>
              </div>
            </form>
          )}

          {/* Soluciones si existen */}
          {guia.solucion && guia.solucion.length > 0 && (
            <section className="rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4 text-xs">
              <p className="font-bold uppercase tracking-wider text-[var(--color-primary)]">Pasos sugeridos de solución:</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[var(--text-body)]">
                {guia.solucion.map((paso) => (
                  <li key={paso}>{paso}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Checks de validación */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-body)]">Validación de Checks</h3>
              <span className="text-xs text-[var(--text-muted)]">
                {guia.checks.length === 0
                  ? 'Sin checks'
                  : fallidos > 0
                    ? `${fallidos} de ${guia.checks.length} no cumplen`
                    : `${guia.checks.length} checks cumplen`}
              </span>
            </div>
            <div className="rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4">
              {guia.checks.length > 0 ? (
                guia.checks.map((check) => <CheckRow key={check.id} check={check} />)
              ) : (
                <p className="py-4 text-xs text-[var(--text-muted)]">
                  No fue posible ejecutar los checks para esta guía.
                </p>
              )}
            </div>
          </section>

          {/* Mensajes de feedback de reintento */}
          {isSuccess && !puedeEditarDespacho && (
            <div className="rounded-[var(--radius-1)] border border-[var(--state-success)]/30 bg-[var(--alert-success-bg)] p-3 text-xs leading-relaxed text-[var(--state-success)]">
              Solicitud de migración enviada a la cola. Los cambios pueden tardar unos segundos en procesarse.
            </div>
          )}
          {isError && !puedeEditarDespacho && (
            <div className="rounded-[var(--radius-1)] border border-[var(--state-error)]/30 bg-[var(--alert-error-bg)] p-3 text-xs leading-relaxed text-[var(--state-error)]">
              {reintentoState?.error || 'No fue posible forzar la migración.'}
            </div>
          )}
        </div>

        {/* Pie con barra de acciones (Gris barra) */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-default)] bg-[var(--surface-bar)] p-3.5 sm:px-6">
          <div>
            {esNoOk && onReintentar && (
              <button
                type="button"
                onClick={() => onReintentar(guia.codigo_remision)}
                disabled={isLoading || !canRemigrate}
                title={
                  !canRemigrate
                    ? 'Tu perfil tiene acceso de solo lectura. No tienes permiso para re-encolar guías.'
                    : undefined
                }
                className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-accent-contrast)] shadow-sm transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading && (
                  <span aria-hidden="true" className="size-3 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                )}
                {isLoading
                  ? 'Reintentando…'
                  : isSuccess
                    ? 'Reintentar nuevamente'
                    : 'Reintentar migración'}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--text-body)] transition hover:bg-[var(--surface-sunken)]"
          >
            Cerrar
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  )
}
