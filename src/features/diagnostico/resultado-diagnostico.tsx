import { useId, useMemo, useState } from 'react'
import { reintentarMigracionGuia } from '../../shared/api/diagnostico-api'
import {
  guardarPreferenciaVista,
  obtenerPreferenciaVista,
  type ModoVista,
} from '../../shared/lib/ui-preferences'
import type {
  DiagnosticoOutput,
  GuiaDiagnostico,
  ItemDiagnostico,
  ReintentoItemState,
} from '../../shared/api/types'
import { VeredictoBadge } from '../../shared/ui/veredicto-badge'
import { CopyButton } from '../../shared/ui/copy-button'
import { AnimatedCounter } from '../../shared/ui/rare/animated-counter'
import { CheckRow } from './check-row'
import { GuiaDetalleModal } from './guia-detalle-modal'
import { GuiaGalleryCard } from './guia-gallery-card'

const idGuia = (itemIndex: number, guia: GuiaDiagnostico) => `${itemIndex}:${guia.codigo_remision}`

const etiquetaItem = (item: ItemDiagnostico) =>
  item.origen === 'despacho' ? `Despacho ${item.codigo_despacho}` : `Remisión ${item.codigo_remision}`

/** Abre por defecto guías con falla o resultado único en la vista lista. */
const guiasAbiertasPorDefecto = (data: DiagnosticoOutput): Set<string> => {
  const total = data.items.reduce((suma, item) => suma + item.guias.length, 0)
  return new Set(
    data.items.flatMap((item, itemIndex) =>
      item.guias
        .filter((guia) => total === 1 || guia.veredicto !== 'OK')
        .map((guia) => idGuia(itemIndex, guia)),
    ),
  )
}

const Chevron = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    className="size-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200 ease-out group-open:rotate-90"
  >
    <path d="m9 6 6 6-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

interface GuiaCardProps {
  guia: GuiaDiagnostico
  item: ItemDiagnostico
  open: boolean
  selected: boolean
  reintentoState?: ReintentoItemState
  onToggle: (open: boolean) => void
  onToggleSelect: (selected: boolean) => void
  onReintentar: (codigoRemision: string) => void
}

const GuiaCard = ({
  guia,
  open,
  selected,
  reintentoState,
  onToggle,
  onToggleSelect,
  onReintentar,
}: GuiaCardProps) => {
  const fallidos = guia.checks.filter((check) => check.resultado === 'no_cumple').length
  const resumenChecks =
    guia.checks.length === 0
      ? 'Sin checks'
      : fallidos > 0
        ? `${fallidos} de ${guia.checks.length} no cumplen`
        : `${guia.checks.length} checks cumplen`

  const esNoOk = guia.veredicto !== 'OK'
  const isLoading = reintentoState?.status === 'loading'
  const isSuccess = reintentoState?.status === 'success'
  const isError = reintentoState?.status === 'error'

  return (
    <details
      open={open}
      onToggle={(event) => onToggle(event.currentTarget.open)}
      style={{ boxShadow: 'var(--shadow-1)' }}
      className={`surface group overflow-hidden rounded-[var(--radius-2)] border transition-colors ${
        selected ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' : 'border-[var(--border-default)]'
      }`}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:gap-4 sm:px-5 sm:py-4 hover:bg-[var(--surface-sunken)]/40 transition-colors">
        <input
          type="checkbox"
          checked={selected}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onToggleSelect(e.target.checked)}
          aria-label={`Seleccionar remisión ${guia.codigo_remision}`}
          className="size-4 cursor-pointer rounded-[2px] border-[var(--border-default)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
        />
        <Chevron />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Remisión</span>
            <div className="flex items-center gap-1.5">
              <h3 className="font-mono text-sm font-bold tracking-tight text-[var(--text-body)] sm:text-base">
                {guia.codigo_remision}
              </h3>
              <CopyButton text={guia.codigo_remision} />
            </div>
          </div>
          {guia.resumen && (
            <p
              className="mt-0.5 line-clamp-1 text-xs text-[var(--text-muted)] group-hover:text-[var(--text-body)] transition-colors"
              title={guia.resumen}
            >
              {guia.resumen}
            </p>
          )}
        </div>

        {/* Botón individual de reintento en naranja Coordinadora */}
        {esNoOk && (
          <button
            type="button"
            disabled={isLoading}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onReintentar(guia.codigo_remision)
            }}
            className={`hidden cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors sm:flex ${
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
              <span className="inline-flex items-center gap-1">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor">
                  <path d="M5 13l4 4L19 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Enviada</span>
              </span>
            ) : (
              'Reintentar'
            )}
          </button>
        )}

        <span className="hidden shrink-0 text-xs text-[var(--text-muted)] md:inline">{resumenChecks}</span>
        <VeredictoBadge veredicto={guia.veredicto} />
      </summary>

      <div className="border-t border-[var(--border-default)] px-5 pb-5 sm:px-6 sm:pb-6 animate-accordion-content">
        <p className="pt-3 text-xs sm:text-sm leading-relaxed text-[var(--text-body)]">{guia.resumen}</p>

        {/* Botón de reintento en móvil */}
        {esNoOk && (
          <div className="mt-3 block sm:hidden">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onReintentar(guia.codigo_remision)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-accent-contrast)] hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              {isLoading && (
                <span aria-hidden="true" className="size-3 animate-spin rounded-full border-2 border-current/30 border-t-current" />
              )}
              {isLoading ? (
                'Reintentando…'
              ) : isSuccess ? (
                <span className="inline-flex items-center gap-1.5">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor">
                    <path d="M5 13l4 4L19 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Enviada a migración</span>
                </span>
              ) : (
                'Reintentar migración'
              )}
            </button>
          </div>
        )}

        {guia.solucion && guia.solucion.length > 0 && (
          <div className="mt-3 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4 text-xs leading-relaxed text-[var(--text-muted)]">
            <strong className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
              Solución recomendada
            </strong>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[var(--text-body)]">
              {guia.solucion.map((paso) => (
                <li key={paso}>{paso}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          {guia.checks.length > 0 ? (
            guia.checks.map((check) => <CheckRow key={check.id} check={check} />)
          ) : (
            <p className="border-t border-[var(--border-default)] pt-4 text-xs text-[var(--text-muted)]">
              No fue posible ejecutar los checks para esta guía.
            </p>
          )}
        </div>
      </div>
    </details>
  )
}

interface ResultadoDiagnosticoProps {
  data: DiagnosticoOutput
  onRediagnosticar?: () => void
}

/** Presenta el resultado del lote agrupado por ítem y guía según SIGO Droop. */
export const ResultadoDiagnostico = ({ data, onRediagnosticar }: ResultadoDiagnosticoProps) => {
  const searchInputId = useId()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ModoVista>(obtenerPreferenciaVista)
  const [abiertas, setAbiertas] = useState(() => guiasAbiertasPorDefecto(data))
  const [selectedCodigos, setSelectedCodigos] = useState<Set<string>>(new Set())
  const [reintentosState, setReintentosState] = useState<Record<string, ReintentoItemState>>({})
  const [batchLoading, setBatchLoading] = useState(false)
  const [modalGuia, setModalGuia] = useState<{ guia: GuiaDiagnostico; item: ItemDiagnostico } | null>(null)
  const [copiandoFallidas, setCopiandoFallidas] = useState(false)

  const handleViewChange = (mode: ModoVista) => {
    setViewMode(mode)
    guardarPreferenciaVista(mode)
  }

  // Filtrado reactivo en tiempo real por remisión o despacho
  const itemsFiltrados = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return data.items

    return data.items
      .map((item) => {
        const despachoCoincide =
          item.codigo_despacho !== undefined && String(item.codigo_despacho).toLowerCase().includes(query)
        if (despachoCoincide) return item

        const guiasCoincidentes = item.guias.filter((guia) =>
          guia.codigo_remision.toLowerCase().includes(query),
        )
        if (guiasCoincidentes.length === 0) return null
        return { ...item, guias: guiasCoincidentes }
      })
      .filter((item): item is ItemDiagnostico => item !== null)
  }, [data.items, searchQuery])

  const todasLasGuiasVisibles = useMemo(
    () => itemsFiltrados.flatMap((it) => it.guias),
    [itemsFiltrados],
  )
  const totalGuias = useMemo(() => data.items.reduce((suma, item) => suma + item.guias.length, 0), [data])
  const totalFiltradas = todasLasGuiasVisibles.length

  const alternarAcordeon = (id: string, open: boolean) =>
    setAbiertas((actuales) => {
      if (actuales.has(id) === open) return actuales
      const siguientes = new Set(actuales)
      if (open) siguientes.add(id)
      else siguientes.delete(id)
      return siguientes
    })

  const expandirTodo = () =>
    setAbiertas(new Set(itemsFiltrados.flatMap((item, itemIndex) => item.guias.map((guia) => idGuia(itemIndex, guia)))))

  const contraerTodo = () => setAbiertas(new Set())

  // Selección individual
  const toggleSelectGuia = (codigoRemision: string, isSelected: boolean) => {
    setSelectedCodigos((actuales) => {
      const siguientes = new Set(actuales)
      if (isSelected) siguientes.add(codigoRemision)
      else siguientes.delete(codigoRemision)
      return siguientes
    })
  }

  // Selección masiva
  const allVisibleSelected =
    totalFiltradas > 0 && todasLasGuiasVisibles.every((g) => selectedCodigos.has(g.codigo_remision))

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedCodigos(new Set())
    } else {
      setSelectedCodigos(new Set(todasLasGuiasVisibles.map((g) => g.codigo_remision)))
    }
  }

  const guiasFallidas = useMemo(
    () => todasLasGuiasVisibles.filter((g) => g.veredicto !== 'OK'),
    [todasLasGuiasVisibles],
  )

  const handleCopiarFallidas = async () => {
    if (guiasFallidas.length === 0) return
    const reporte = guiasFallidas
      .map(
        (g) =>
          `• Remisión: ${g.codigo_remision} | Veredicto: ${g.veredicto}\n  Resumen: ${g.resumen || 'Sin resumen'}`,
      )
      .join('\n\n')

    try {
      await navigator.clipboard.writeText(reporte)
      setCopiandoFallidas(true)
      globalThis.setTimeout(() => setCopiandoFallidas(false), 2000)
    } catch {
      // Ignorar fallo de portapapeles
    }
  }

  // Reintento individual
  const handleReintentarIndividual = async (codigoRemision: string) => {
    setReintentosState((prev) => ({
      ...prev,
      [codigoRemision]: { status: 'loading' },
    }))

    const resultado = await reintentarMigracionGuia(codigoRemision)

    setReintentosState((prev) => ({
      ...prev,
      [codigoRemision]: {
        status: resultado.success ? 'success' : 'error',
        error: resultado.message,
      },
    }))
  }

  // Reintento masivo en lotes concurrentes de 3
  const handleReintentarSeleccionadas = async () => {
    const codigosAProcesar = Array.from(selectedCodigos)
    if (codigosAProcesar.length === 0 || batchLoading) return

    setBatchLoading(true)

    setReintentosState((prev) => {
      const next = { ...prev }
      for (const cod of codigosAProcesar) {
        next[cod] = { status: 'loading' }
      }
      return next
    })

    const BATCH_SIZE = 3
    for (let i = 0; i < codigosAProcesar.length; i += BATCH_SIZE) {
      const lote = codigosAProcesar.slice(i, i + BATCH_SIZE)
      await Promise.all(
        lote.map(async (codigoRemision) => {
          const res = await reintentarMigracionGuia(codigoRemision)
          setReintentosState((prev) => ({
            ...prev,
            [codigoRemision]: {
              status: res.success ? 'success' : 'error',
              error: res.message,
            },
          }))
        }),
      )
    }

    setBatchLoading(false)
  }

  const exitoTotalCount = Object.values(reintentosState).filter((s) => s.status === 'success').length

  const stats = useMemo(() => {
    let total = 0
    let ok = 0
    let bloqueadas = 0
    let parciales = 0

    for (const item of data.items) {
      for (const g of item.guias) {
        total++
        if (g.veredicto === 'OK') ok++
        else if (g.veredicto === 'BLOQUEADA') bloqueadas++
        else parciales++
      }
    }
    return { total, ok, bloqueadas, parciales }
  }, [data])

  return (
    <section aria-live="polite" className="space-y-4 sm:space-y-5">
      {/* Título de la sección y veredicto general */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Resultado del Lote
          </span>
          <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-[var(--text-body)]">
            Diagnóstico Finalizado
          </h2>
        </div>
        <VeredictoBadge veredicto={data.veredicto} />
      </div>

      {/* Tarjetas de Estadísticas con Contadores Animados Rare UI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          style={{ boxShadow: 'var(--shadow-panel)' }}
          className="surface flex flex-col justify-between rounded-[var(--radius-2)] border border-[var(--border-default)] p-3.5"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Total Evaluadas
          </span>
          <div className="mt-1 flex items-baseline gap-1 text-2xl font-extrabold text-[var(--text-body)]">
            <AnimatedCounter value={stats.total} />
            <span className="text-xs font-normal text-[var(--text-muted)]">guías</span>
          </div>
        </div>

        <div
          style={{ boxShadow: 'var(--shadow-panel)' }}
          className="surface flex flex-col justify-between rounded-[var(--radius-2)] border border-[var(--state-success)]/30 bg-[var(--alert-success-bg)]/40 p-3.5"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--state-success)]">
            Conformes (OK)
          </span>
          <div className="mt-1 flex items-baseline gap-1 text-2xl font-extrabold text-[var(--state-success)]">
            <AnimatedCounter value={stats.ok} />
            <span className="text-xs font-normal opacity-80">listas</span>
          </div>
        </div>

        <div
          style={{ boxShadow: 'var(--shadow-panel)' }}
          className="surface flex flex-col justify-between rounded-[var(--radius-2)] border border-[var(--state-error)]/30 bg-[var(--alert-error-bg)]/40 p-3.5"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--state-error)]">
            Bloqueadas
          </span>
          <div className="mt-1 flex items-baseline gap-1 text-2xl font-extrabold text-[var(--state-error)]">
            <AnimatedCounter value={stats.bloqueadas} />
            <span className="text-xs font-normal opacity-80">fallos</span>
          </div>
        </div>

        <div
          style={{ boxShadow: 'var(--shadow-panel)' }}
          className="surface flex flex-col justify-between rounded-[var(--radius-2)] border border-[var(--state-warning)]/30 bg-[var(--alert-warning-bg)]/40 p-3.5"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--state-warning)]">
            Parciales / Obs.
          </span>
          <div className="mt-1 flex items-baseline gap-1 text-2xl font-extrabold text-[var(--state-warning)]">
            <AnimatedCounter value={stats.parciales} />
            <span className="text-xs font-normal opacity-80">atención</span>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda estilo SearchField y Alternador de Vista */}
      <div
        style={{ boxShadow: 'var(--shadow-panel)' }}
        className="surface flex flex-col gap-3 rounded-[var(--radius-2)] border border-[var(--border-default)] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-3.5"
      >
        {/* Barra de búsqueda (SearchField) */}
        <div className="relative flex-1">
          <label htmlFor={searchInputId} className="sr-only">
            Buscar por remisión o despacho
          </label>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="11" cy="11" r="7" strokeWidth="2" />
            <path d="m20 20-3.5-3.5" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            id={searchInputId}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por remisión o despacho…"
            className="h-10 w-full rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] py-2 pl-9 pr-9 text-xs sm:text-sm text-[var(--text-body)] placeholder:text-[var(--text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-xs text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-body)]"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor">
                <path d="M18 6 6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Alternador de Vista (Segmented Button) */}
        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
          <span className="text-xs text-[var(--text-muted)]">
            {searchQuery ? `${totalFiltradas} de ${totalGuias} guías` : `${totalGuias} guías`}
          </span>

          <div
            role="group"
            aria-label="Selector de vista"
            className="inline-flex rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-0.5"
          >
            <button
              type="button"
              onClick={() => handleViewChange('list')}
              aria-pressed={viewMode === 'list'}
              title="Vista de lista (acordeón)"
              className={`flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-1)] px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                viewMode === 'list'
                  ? 'bg-[var(--surface-card)] text-[var(--color-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-body)]'
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor">
                <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>Lista</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('grid')}
              aria-pressed={viewMode === 'grid'}
              title="Vista de cuadrícula"
              className={`flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-1)] px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[var(--surface-card)] text-[var(--color-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-body)]'
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor">
                <rect x="4" y="4" width="6" height="6" rx="1.5" strokeWidth="2" />
                <rect x="14" y="4" width="6" height="6" rx="1.5" strokeWidth="2" />
                <rect x="4" y="14" width="6" height="6" rx="1.5" strokeWidth="2" />
                <rect x="14" y="14" width="6" height="6" rx="1.5" strokeWidth="2" />
              </svg>
              <span>Cuadros</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Selección Masiva y Reintentos */}
      <div
        style={{ boxShadow: 'var(--shadow-panel)' }}
        className="surface flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-2)] border border-[var(--border-default)] px-4 py-2.5 text-xs"
      >
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAll}
              className="size-4 cursor-pointer rounded-[2px] border-[var(--border-default)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <span className="font-semibold text-[var(--text-body)]">
              {allVisibleSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </span>
          </label>
          <span className="text-[var(--text-muted)]">({selectedCodigos.size} seleccionadas)</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón copiar guías fallidas para soporte */}
          {guiasFallidas.length > 0 && (
            <button
              type="button"
              onClick={handleCopiarFallidas}
              title="Copia el reporte de texto de las guías con inconsistencias"
              className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-body)] transition-colors hover:bg-[var(--surface-sunken)]"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3 text-[var(--text-muted)]" fill="none" stroke="currentColor">
                <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2" />
              </svg>
              <span>{copiandoFallidas ? '¡Copiadas!' : `Copiar fallidas (${guiasFallidas.length})`}</span>
            </button>
          )}

          {/* Botón de reintento masivo en naranja Coordinadora */}
          <button
            type="button"
            disabled={selectedCodigos.size === 0 || batchLoading}
            onClick={handleReintentarSeleccionadas}
            className={`flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
              selectedCodigos.size === 0 || batchLoading
                ? 'border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-disabled)] opacity-50 cursor-not-allowed'
                : 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] hover:bg-[var(--color-accent-hover)] shadow-sm'
            }`}
          >
            {batchLoading && (
              <span aria-hidden="true" className="size-3 animate-spin rounded-full border-2 border-current/30 border-t-current" />
            )}
            {batchLoading ? 'Reintentando…' : `Reintentar seleccionadas (${selectedCodigos.size})`}
          </button>

          {/* Botón de re-diagnóstico si hubo reintentos exitosos */}
          {exitoTotalCount > 0 && onRediagnosticar && (
            <button
              type="button"
              onClick={onRediagnosticar}
              className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--state-success)]/40 bg-[var(--alert-success-bg)] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--state-success)] transition-colors hover:bg-[var(--state-success)]/15"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Re-diagnosticar lote ({exitoTotalCount} enviados)</span>
            </button>
          )}

          {/* En vista de lista: controles de expandir/contraer */}
          {viewMode === 'list' && totalFiltradas > 1 && (
            <div className="hidden items-center gap-1 border-l border-[var(--border-default)] pl-2 sm:flex">
              <button
                type="button"
                onClick={expandirTodo}
                className="cursor-pointer rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                Expandir
              </button>
              <button
                type="button"
                onClick={contraerTodo}
                className="cursor-pointer rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                Contraer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Estado vacío si no hay coincidencias de búsqueda */}
      {totalFiltradas === 0 && (
        <div
          style={{ boxShadow: 'var(--shadow-panel)' }}
          className="surface rounded-[var(--radius-2)] border border-[var(--border-default)] p-8 text-center"
        >
          <p className="text-sm font-bold text-[var(--text-body)]">No se encontraron coincidencias</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            No hay remisiones ni despachos que coincidan con “{searchQuery}”.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-3 cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] hover:bg-[var(--surface-sunken)] transition-colors"
          >
            Limpiar búsqueda
          </button>
        </div>
      )}

      {/* Renderizado de items según el modo de vista */}
      {viewMode === 'list' ? (
        <div className="space-y-5 animate-view-fade">
          {itemsFiltrados.map((item, itemIndex) => (
            <section key={`${item.origen}-${item.codigo_despacho ?? item.codigo_remision ?? itemIndex}`} className="space-y-2.5">
              <div className="flex items-center gap-2 px-1 text-xs text-[var(--text-muted)]">
                <span className="font-bold uppercase tracking-wider text-[var(--text-body)]">{etiquetaItem(item)}</span>
                {item.cuenta && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="truncate" title={item.cuenta}>{item.cuenta}</span>
                  </>
                )}
              </div>
              <div className="space-y-2.5">
                {item.guias.map((guia) => {
                  const id = idGuia(itemIndex, guia)
                  return (
                    <GuiaCard
                      key={id}
                      guia={guia}
                      item={item}
                      open={abiertas.has(id)}
                      selected={selectedCodigos.has(guia.codigo_remision)}
                      reintentoState={reintentosState[guia.codigo_remision]}
                      onToggle={(open) => alternarAcordeon(id, open)}
                      onToggleSelect={(sel) => toggleSelectGuia(guia.codigo_remision, sel)}
                      onReintentar={handleReintentarIndividual}
                    />
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        /* Vista de Cuadrícula (Galería) */
        <div className="space-y-6 animate-view-fade">
          {(() => {
            const despachos = itemsFiltrados.filter((it) => it.origen === 'despacho')
            const remisionesSueltas = itemsFiltrados
              .filter((it) => it.origen === 'remision')
              .flatMap((it) => it.guias.map((guia) => ({ guia, item: it })))

            return (
              <>
                {/* Despachos agrupados con su título */}
                {despachos.map((item, itemIndex) => (
                  <section
                    key={`despacho-${item.codigo_despacho ?? itemIndex}`}
                    className="space-y-2.5"
                  >
                    <div className="flex items-center gap-2 px-1 text-xs text-[var(--text-muted)]">
                      <span className="font-bold uppercase tracking-wider text-[var(--text-body)]">{etiquetaItem(item)}</span>
                      {item.cuenta && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate" title={item.cuenta}>{item.cuenta}</span>
                        </>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                      {item.guias.map((guia) => (
                        <GuiaGalleryCard
                          key={guia.codigo_remision}
                          guia={guia}
                          item={item}
                          selected={selectedCodigos.has(guia.codigo_remision)}
                          reintentoState={reintentosState[guia.codigo_remision]}
                          onToggleSelect={(sel) => toggleSelectGuia(guia.codigo_remision, sel)}
                          onReintentar={handleReintentarIndividual}
                          onOpenDetalle={() => setModalGuia({ guia, item })}
                        />
                      ))}
                    </div>
                  </section>
                ))}

                {/* Todas las remisiones sueltas en una sola cuadrícula uniforme */}
                {remisionesSueltas.length > 0 && (
                  <section className="space-y-2.5">
                    {despachos.length > 0 && (
                      <div className="flex items-center gap-2 px-1 text-xs text-[var(--text-muted)]">
                        <span className="font-bold uppercase tracking-wider text-[var(--text-body)]">Remisiones</span>
                        <span aria-hidden="true">·</span>
                        <span>{remisionesSueltas.length} guías</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                      {remisionesSueltas.map(({ guia, item }) => (
                        <GuiaGalleryCard
                          key={guia.codigo_remision}
                          guia={guia}
                          item={item}
                          selected={selectedCodigos.has(guia.codigo_remision)}
                          reintentoState={reintentosState[guia.codigo_remision]}
                          onToggleSelect={(sel) => toggleSelectGuia(guia.codigo_remision, sel)}
                          onReintentar={handleReintentarIndividual}
                          onOpenDetalle={() => setModalGuia({ guia, item })}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* Modal Dialog detallado al hacer clic en tarjeta de cuadrícula */}
      {modalGuia && (
        <GuiaDetalleModal
          guia={modalGuia.guia}
          item={modalGuia.item}
          reintentoState={reintentosState[modalGuia.guia.codigo_remision]}
          onReintentar={handleReintentarIndividual}
          onClose={() => setModalGuia(null)}
        />
      )}
    </section>
  )
}
