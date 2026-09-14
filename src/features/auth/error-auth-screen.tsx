import { useState } from 'react'
import { ThemeToggle } from '../../shared/ui/theme-toggle'
import type { DetalleErrorAuth } from '../../shared/auth/types'

interface ErrorAuthScreenProps {
  error: DetalleErrorAuth
  onReintentar: () => void
  onVolverAlLogin: () => void
}

export const ErrorAuthScreen = ({
  error,
  onReintentar,
  onVolverAlLogin,
}: ErrorAuthScreenProps) => {
  const [detalleVisible, setDetalleVisible] = useState(false)

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[var(--surface-app)] p-4">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div
        style={{ boxShadow: 'var(--shadow-24)' }}
        className="w-full max-w-[var(--card-max-confirm)] rounded-[var(--radius-3)] bg-[var(--surface-card)] p-8 sm:p-10"
      >
        <div className="flex justify-center mb-6">
          <img
            src="/logo-coordinadora.png"
            alt="Logotipo de Coordinadora Mercantil - Error de autenticación"
            className="max-w-[220px] w-full h-auto object-contain dark:brightness-0 dark:invert"
          />
        </div>

        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--alert-warning-bg)] text-[var(--state-warning)]">
          <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 className="text-center text-xl sm:text-2xl font-bold text-[var(--text-body)] tracking-tight mb-2">
          {error.titulo}
        </h1>

        <p className="text-center text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
          {error.descripcion}
        </p>

        <div className="mb-6 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Cómo resolverlo
          </p>
          <ul className="flex flex-col gap-2">
            {error.sugerencias.map((sugerencia) => (
              <li
                key={sugerencia}
                className="flex items-start gap-2 text-sm text-[var(--text-body)] leading-relaxed"
              >
                <svg className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{sugerencia}</span>
              </li>
            ))}
          </ul>
        </div>

        {error.detalleTecnico && (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setDetalleVisible((visible) => !visible)}
              aria-expanded={detalleVisible}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-body)] cursor-pointer"
            >
              <svg
                className={`size-3.5 transition-transform duration-200 ${detalleVisible ? 'rotate-90' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              <span>{detalleVisible ? 'Ocultar' : 'Ver'} detalle técnico</span>
            </button>

            {detalleVisible && (
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-3 text-xs text-[var(--text-muted)]">
                {error.detalleTecnico}
              </pre>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onReintentar}
            className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 cursor-pointer uppercase tracking-wider"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reintentar</span>
          </button>

          <button
            type="button"
            onClick={onVolverAlLogin}
            className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-6 py-3 text-sm font-semibold text-[var(--text-body)] shadow-xs transition-all hover:bg-[var(--surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer uppercase tracking-wider"
          >
            <span>Iniciar sesión de nuevo</span>
          </button>
        </div>
      </div>
    </div>
  )
}
