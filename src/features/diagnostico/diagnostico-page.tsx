import { useRef, useState, type FormEvent } from 'react'
import { diagnosticarMigracion } from '../../shared/api/diagnostico-api'
import type { DiagnosticoOutput } from '../../shared/api/types'
import { parseDespachos, splitCodigos } from '../../shared/lib/split-codigos'
import { JsonModal } from '../../shared/ui/json-modal'
import { DiagnosticoSkeleton } from './diagnostico-skeleton'
import { ResultadoDiagnostico } from './resultado-diagnostico'

/** Pantalla principal de consulta de diagnósticos de migración bajo el sistema SIGO Droop. */
export const DiagnosticoPage = () => {
  const [remisionesRaw, setRemisionesRaw] = useState('')
  const [despachosRaw, setDespachosRaw] = useState('')
  const [data, setData] = useState<DiagnosticoOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showJson, setShowJson] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

  const ejecutarConsulta = async (remisionesTexto: string, despachosTexto: string) => {
    setError(null)
    const codigosRemision = splitCodigos(remisionesTexto)
    const despachos = parseDespachos(despachosTexto)

    if (despachos.error) {
      setError(despachos.error)
      return
    }
    if (codigosRemision.length === 0 && despachos.values.length === 0) {
      setError('Ingresa al menos una remisión o un despacho.')
      return
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)
    try {
      const result = await diagnosticarMigracion(
        {
          codigos_remision: codigosRemision,
          codigos_despacho: despachos.values,
        },
        controller.signal,
      )
      setData(result)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Ocurrió un error inesperado.')
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleCancelar = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  const handleLimpiarFormulario = () => {
    setRemisionesRaw('')
    setDespachosRaw('')
    setError(null)
  }

  const tieneContenido = remisionesRaw.trim().length > 0 || despachosRaw.trim().length > 0

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void ejecutarConsulta(remisionesRaw, despachosRaw)
  }

  const handleRediagnosticar = () => {
    void ejecutarConsulta(remisionesRaw, despachosRaw)
  }

  return (
    <div className="mx-auto w-full max-w-[1680px] px-4 pb-20 pt-6 sm:px-8 sm:pt-8">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[400px_1fr] xl:grid-cols-[440px_1fr]">
        {/* Columna Izquierda: Parámetros de consulta (Panel lateral sticky en desktop) */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
          <header className="pb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
              Panel de Consulta
            </span>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-[var(--text-body)] sm:text-2xl">
              Diagnóstico de migración (api internos)
            </h1>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              Verifica el estado técnico, consistencia y posibles bloqueos de guías entre AGW y CM.
            </p>
          </header>

          <form
            onSubmit={handleSubmit}
            style={{ boxShadow: 'var(--shadow-panel)' }}
            className="surface rounded-[var(--radius-2)] border border-[var(--border-default)] p-5 sm:p-6"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Parámetros de Entrada
              </span>
              {tieneContenido && !loading && (
                <button
                  type="button"
                  onClick={handleLimpiarFormulario}
                  className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] hover:underline transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className="mt-4 space-y-4">
              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-body)]">Remisiones</span>
                  <span className="text-[11px] text-[var(--text-muted)]">Por coma o línea</span>
                </div>
                <textarea
                  value={remisionesRaw}
                  onChange={(event) => setRemisionesRaw(event.target.value)}
                  placeholder={'20018012531\n20018012532'}
                  rows={5}
                  className="mt-1.5 w-full resize-y rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3.5 py-2.5 font-mono text-xs sm:text-sm text-[var(--text-body)] placeholder:text-[var(--text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </label>

              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-body)]">Despachos</span>
                  <span className="text-[11px] text-[var(--text-muted)]">Solo números enteros</span>
                </div>
                <textarea
                  value={despachosRaw}
                  onChange={(event) => setDespachosRaw(event.target.value)}
                  placeholder={'56727471\n56727472'}
                  rows={4}
                  className="mt-1.5 w-full resize-y rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3.5 py-2.5 font-mono text-xs sm:text-sm text-[var(--text-body)] placeholder:text-[var(--text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </label>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-1)] border border-[var(--state-error)]/30 bg-[var(--alert-error-bg)] p-3 text-xs leading-relaxed text-[var(--alert-error-fg)]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="mt-0.5 size-4 shrink-0 text-[var(--state-error)]"
                  fill="none"
                  stroke="currentColor"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" />
                  <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <div>{error}</div>
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-primary-contrast)] shadow-sm transition hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
              >
                {loading && (
                  <span
                    aria-hidden="true"
                    className="size-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current"
                  />
                )}
                {loading ? 'Consultando…' : 'Diagnosticar'}
              </button>

              {loading && (
                <button
                  type="button"
                  onClick={handleCancelar}
                  className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-body)] transition hover:bg-[var(--surface-bar)]"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <p className="px-1 text-center text-xs text-[var(--text-muted)] lg:text-left">
            El diagnóstico es una operación de consulta no destructiva en tiempo real.
          </p>
        </aside>

        {/* Columna Derecha: Panel de Resultados o Estado inicial */}
        <section className="min-w-0">
          {loading && <DiagnosticoSkeleton />}

          {data && !loading && (
            <>
              <ResultadoDiagnostico data={data} onRediagnosticar={handleRediagnosticar} />
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setShowJson(true)}
                  className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--color-primary)] bg-transparent px-5 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)]"
                >
                  Ver respuesta JSON completa
                </button>
              </div>
            </>
          )}

          {!data && !loading && (
            <div
              style={{ boxShadow: 'var(--shadow-panel)' }}
              className="surface flex flex-col items-center justify-center rounded-[var(--radius-2)] border border-[var(--border-default)] p-8 text-center sm:p-14"
            >
              <div className="flex size-14 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] sm:size-16">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-7 sm:size-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <path d="M11 8v6M8 11h6" />
                </svg>
              </div>

              <h2 className="mt-5 text-lg font-bold text-[var(--text-body)] sm:text-xl">
                Listo para diagnosticar
              </h2>

              <p className="mt-2 max-w-md text-xs sm:text-sm leading-relaxed text-[var(--text-muted)]">
                Ingresa una o varias remisiones o números de despacho en el panel lateral y presiona{' '}
                <strong className="font-semibold text-[var(--text-body)]">Diagnosticar</strong> para verificar el estado de migración, inconsistencias o bloqueos.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-[var(--text-muted)]">
                <span className="rounded-[16px] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-1 font-semibold">
                  Múltiples remisiones
                </span>
                <span className="rounded-[16px] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-1 font-semibold">
                  Despachos completos
                </span>
                <span className="rounded-[16px] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-1 font-semibold">
                  Reintento con 1 clic
                </span>
              </div>
            </div>
          )}
        </section>
      </div>

      {showJson && data && <JsonModal data={data} onClose={() => setShowJson(false)} />}
    </div>
  )
}
