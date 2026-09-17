import { Link } from '../../shared/router/router-context'
import { FolderComponent } from './folder-component'

interface AppCardProps {
  readonly titulo: string
  readonly descripcion: string
  readonly ruta?: string
  readonly estado: 'disponible' | 'proximamente'
  readonly tags: readonly string[]
  readonly icono: 'diagnostico' | 'pubsub' | 'auditoria'
}

const renderIcono = (tipo: AppCardProps['icono']) => {
  if (tipo === 'diagnostico') {
    return (
      <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    )
  }

  if (tipo === 'pubsub') {
    return (
      <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  }

  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

const AppCard = ({ titulo, descripcion, ruta, estado, tags, icono }: AppCardProps) => {
  const disponible = estado === 'disponible' && Boolean(ruta)

  return (
    <div
      style={{ boxShadow: 'var(--shadow-1)' }}
      className={`surface group relative flex flex-col justify-between rounded-[var(--radius-3)] border p-6 transition-all duration-200 ${
        disponible
          ? 'border-[var(--border-default)] hover:-translate-y-1 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-4)]'
          : 'border-[var(--border-default)] opacity-75 border-dashed bg-[var(--surface-sunken)]/50'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div
            className={`grid size-12 place-items-center rounded-[var(--radius-2)] ${
              disponible
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'bg-[var(--border-default)] text-[var(--text-muted)]'
            }`}
          >
            {renderIcono(icono)}
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
              disponible
                ? 'border border-[var(--state-success)]/30 bg-[var(--alert-success-bg)] text-[var(--state-success)]'
                : 'border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-muted)]'
            }`}
          >
            {disponible ? 'Disponible' : 'Próximamente'}
          </span>
        </div>

        <h3 className="text-lg font-bold text-[var(--text-body)] tracking-tight mb-2 group-hover:text-[var(--color-primary)] transition-colors">
          {titulo}
        </h3>
        <p className="text-sm leading-relaxed text-[var(--text-muted)] mb-5">
          {descripcion}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-6">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-[var(--border-default)]">
        {disponible && ruta ? (
          <Link
            href={ruta}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <span>Abrir herramienta</span>
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-disabled)] cursor-not-allowed"
          >
            <span>En construcción</span>
          </button>
        )}
      </div>
    </div>
  )
}

export const HubPage = () => {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6 sm:p-10 shadow-xs">
        <div className="max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-1 text-xs font-medium text-[var(--text-muted)] mb-3">
            <span className="size-2 rounded-full bg-[var(--state-success)]" />
            <span>Ecosistema de Migración CM</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-body)] mb-3">
            Portal de Aplicaciones de Apoyo
          </h1>
          <p className="text-sm sm:text-base leading-relaxed text-[var(--text-muted)] mb-6">
            Herramientas operativas y utilitarios para diagnóstico, supervisión y soporte técnico en la migración de guías y despachos entre AGW y CM.
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <Link
              href="/diagnostico"
              className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-[var(--color-primary-hover)]"
            >
              <span>Abrir Diagnóstico</span>
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <Link
              href="/contacto"
              className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-body)] transition hover:bg-[var(--border-default)]"
            >
              <span>Contacto y Soporte</span>
            </Link>
          </div>
        </div>

        <div className="hidden md:flex shrink-0 items-center justify-center py-4">
          <FolderComponent size="sm" color="blue" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AppCard
          titulo="Diagnóstico de Migración"
          descripcion="Auditoría integral y trazabilidad de remisiones y despachos en el flujo hacia CM. Permite evaluar checks y reintentar guías."
          ruta="/diagnostico"
          estado="disponible"
          tags={['Remisiones', 'Despachos', 'Re-migración']}
          icono="diagnostico"
        />

        <AppCard
          titulo="Monitoreo Pub/Sub"
          descripcion="Supervisión de tópicos, reintentos de mensajes y consumo de eventos en suscriptores de migración."
          estado="proximamente"
          tags={['Suscripciones', 'Colas', 'Reintentos']}
          icono="pubsub"
        />

        <AppCard
          titulo="Auditoría de Facturación"
          descripcion="Validación de coherencia en remesas facturadas frente a registros maestros de despachos."
          estado="proximamente"
          tags={['Facturas', 'Consistencia', 'Auditoría']}
          icono="auditoria"
        />
      </div>
    </div>
  )
}
