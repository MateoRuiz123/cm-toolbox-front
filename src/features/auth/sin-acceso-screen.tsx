import { SmoothTitleAccent } from '@/shared/ui/smoothui'
import { ThemeToggle } from '../../shared/ui/theme-toggle'
import { env } from '../../shared/lib/env'

interface SinAccesoScreenProps {
  email?: string
  onCerrarSesion: () => void
  onReintentar?: () => void
}

export const SinAccesoScreen = ({
  email,
  onCerrarSesion,
  onReintentar,
}: SinAccesoScreenProps) => {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[var(--surface-app)] p-4">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div
        style={{ boxShadow: 'var(--shadow-24)' }}
        className="w-full max-w-[var(--card-max-narrow)] rounded-[var(--radius-3)] bg-[var(--surface-card)] p-8 sm:p-10 text-center"
      >
        <div className="flex justify-center mb-6">
          <img
            src="/logo-coordinadora.png"
            alt="Logotipo de Coordinadora Mercantil - Acceso restringido"
            className="max-w-[220px] w-full h-auto object-contain dark:brightness-0 dark:invert"
          />
        </div>

        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--alert-error-bg)] text-[var(--state-error)]">
          <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <SmoothTitleAccent
          as="h1"
          className="text-xl sm:text-2xl font-bold text-[var(--text-body)] tracking-tight mb-2"
          accessibleTitle="Acceso no autorizado"
          before="Acceso no "
          accent="autorizado"
          amplitude={3}
        />

        <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">
          El token de Keycloak no contiene una identidad de correo corporativo válida.
        </p>

        {email && (
          <div className="mb-4 rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-3 text-xs text-[var(--text-muted)] text-left">
            <div className="flex justify-between items-center mb-1">
              <span>Usuario identificado:</span>
              <span className="font-mono font-semibold text-[var(--text-body)]">{email}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span>Ambiente:</span>
              <span className="font-mono text-[var(--text-muted)]">{env.keycloakEnv}</span>
            </div>
          </div>
        )}

        <p className="text-xs text-[var(--text-muted)] mb-6 leading-relaxed">
          Inicia sesión con una cuenta de correo corporativo válida (@coordinadora.com).
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          {onReintentar && (
            <button
              type="button"
              onClick={onReintentar}
              className="flex-1 flex items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer uppercase tracking-wider"
            >
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reintentar</span>
            </button>
          )}

          <button
            type="button"
            onClick={onCerrarSesion}
            className="flex-1 flex items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-5 py-2.5 text-xs font-semibold text-[var(--text-body)] shadow-xs transition-all hover:bg-[var(--surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer uppercase tracking-wider"
          >
            <svg className="size-3.5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Cambiar cuenta</span>
          </button>
        </div>
      </div>
    </div>
  )
}
