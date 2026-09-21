import { Link } from 'react-router'

export const NotFoundPage = () => {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center px-4 py-12 text-center sm:px-6">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-card)] px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] shadow-2xs">
        <span className="size-2 rounded-full bg-[var(--state-error)]" />
        <span>Error 404 &bull; Recurso no encontrado</span>
      </div>

      <h1 className="text-4xl font-extrabold tracking-tight text-[var(--text-body)] sm:text-6xl mb-3">
        404
      </h1>

      <h2 className="text-lg sm:text-xl font-bold text-[var(--text-body)] mb-2">
        La página solicitada no está disponible
      </h2>

      <p className="max-w-md text-sm text-[var(--text-muted)] leading-relaxed mb-8">
        El enlace puede estar roto, haber cambiado de ruta o requerir permisos adicionales dentro del ecosistema de Coordinadora Mercantil.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Ir al Portal Principal</span>
        </Link>

        <Link
          to="/diagnostico"
          className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-body)] transition hover:bg-[var(--border-default)]"
        >
          <span>Ir a Diagnóstico</span>
        </Link>
      </div>

      <div className="mt-10 border-t border-[var(--border-default)] pt-6 text-xs text-[var(--text-muted)]">
        ¿Crees que se trata de un error del sistema?{' '}
        <Link to="/contacto" className="font-semibold text-[var(--color-primary)] underline hover:text-[var(--color-primary-hover)]">
          Contacta al equipo de TI
        </Link>
      </div>
    </div>
  )
}
