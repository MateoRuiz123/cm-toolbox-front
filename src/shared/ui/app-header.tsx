import { ThemeToggle } from './theme-toggle'
import { NotificationBell } from './rare/notification-bell'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/use-auth'

/**
 * Cabecera institucional con marca Coordinadora, navegación contextual y datos de sesión.
 * Barra de 64px con controles de usuario y modo de color.
 */
export const AppHeader = () => {
  const { email, terminal, cerrarSesion } = useAuth()
  const { pathname: path } = useLocation()
  const esHome = path === '/' || path === '/hub'

  const obtenerTituloRuta = () => {
    if (path.startsWith('/diagnostico')) return 'Diagnóstico de migración'
    if (path.startsWith('/privacidad')) return 'Política de Privacidad'
    if (path.startsWith('/terminos')) return 'Términos y Condiciones'
    if (path.startsWith('/contacto')) return 'Contacto y Soporte'
    if (path.startsWith('/gracias')) return 'Confirmación'
    return 'Página'
  }

  return (
    <header
      style={{ boxShadow: 'var(--shadow-1)' }}
      className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[var(--border-default)] bg-[var(--surface-header)] px-4 sm:px-8"
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <Link
          to="/"
          className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          title="Ir al portal de aplicaciones"
        >
          <img
            src="/logo-coordinadora.png"
            alt="Logotipo oficial de Coordinadora Mercantil"
            className="h-6 w-auto object-contain shrink-0 dark:brightness-0 dark:invert"
          />
        </Link>

        <div className="h-4 w-px bg-[var(--border-default)] shrink-0 hidden sm:block" />

        <div className="flex items-center gap-2 min-w-0 text-xs sm:text-sm">
          {!esHome ? (
            <div className="flex items-center gap-2 truncate">
              <Link
                to="/"
                className="hidden sm:inline-block font-medium text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors truncate"
              >
                Portal
              </Link>
              <span className="hidden sm:inline-block text-[var(--text-muted)]">/</span>
              <span className="font-bold tracking-tight text-[var(--text-body)] truncate">
                {obtenerTituloRuta()}
              </span>
            </div>
          ) : (
            <span className="font-bold tracking-tight text-[var(--text-body)] truncate">
              Toolbox de Apoyo (API Internos)
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {!esHome && (
          <Link
            to="/"
            className="hidden md:flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-body)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--color-primary)]"
            title="Volver a la lista de aplicaciones"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Volver al portal</span>
          </Link>
        )}

        {email && (
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-xs font-semibold text-[var(--text-body)] max-w-[200px] truncate" title={email}>
              {email}
            </span>
            {terminal ? (
              <span className="text-[11px] text-[var(--text-muted)]">
                Terminal: <strong className="text-[var(--color-primary)]">{terminal}</strong>
              </span>
            ) : (
              <span className="text-[11px] text-[var(--text-muted)]">
                Coordinadora Mercantil
              </span>
            )}
          </div>
        )}

        <NotificationBell
          count={0}
          size={36}
          title="Notificaciones operativas"
        />

        <button
          type="button"
          onClick={cerrarSesion}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="flex size-9 items-center justify-center rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--state-error)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>

        <ThemeToggle />
      </div>
    </header>
  )
}
