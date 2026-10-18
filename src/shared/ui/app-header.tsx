import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./rare/notification-bell";
import { Link, useLocation } from "react-router";
import { useAuth } from "../auth/use-auth";
import { useAccess } from "../auth/access-context";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  sub_admin: "Sub-Admin",
  user: "Operador",
};

/**
 * Cabecera institucional con marca Coordinadora, navegación contextual y datos de sesión.
 * Barra de 64px con controles de usuario, rol efectivo y modo de color.
 */
export const AppHeader = () => {
  const { email, terminal, cerrarSesion } = useAuth();
  const { roleId, canManageApps, canManageUsers } = useAccess();
  const { pathname: path } = useLocation();
  const esHome = path === "/" || path === "/hub";
  const esAdmin = path.startsWith("/admin");
  const puedeAdministrar = canManageApps || canManageUsers;

  const obtenerTituloRuta = () => {
    if (path.startsWith("/diagnostico")) return "Diagnóstico de migración";
    if (path.startsWith("/logs")) return "Visor de Logs GKE";
    if (path.startsWith("/admin")) return "Administración de Accesos";
    if (path.startsWith("/privacidad")) return "Política de Privacidad";
    if (path.startsWith("/terminos")) return "Términos y Condiciones";
    if (path.startsWith("/contacto")) return "Contacto y Soporte";
    if (path.startsWith("/gracias")) return "Confirmación";
    return "Página";
  };

  return (
    <header
      style={{ boxShadow: "var(--shadow-1)" }}
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
              <span className="hidden sm:inline-block text-[var(--text-muted)]">
                /
              </span>
              <span className="font-bold tracking-tight text-[var(--text-body)] truncate">
                {obtenerTituloRuta()}
              </span>
            </div>
          ) : (
            <span className="font-bold tracking-tight text-[var(--text-body)] truncate">
              Toolbox de Apoyo
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
            <svg
              className="size-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Volver al portal</span>
          </Link>
        )}

        {puedeAdministrar && !esAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            title="Administrar usuarios, permisos y estado de aplicaciones"
          >
            <svg
              className="size-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span className="hidden sm:inline">Administración</span>
          </Link>
        )}

        {email && (
          <div className="hidden sm:flex flex-col items-end text-right">
            <div className="flex items-center gap-1.5">
              <span
                className="text-xs font-semibold text-[var(--text-body)] max-w-[180px] truncate"
                title={email}
              >
                {email}
              </span>
              <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
                {ROLE_LABELS[roleId] ?? roleId}
              </span>
            </div>
            {terminal ? (
              <span className="text-[11px] text-[var(--text-muted)]">
                Terminal:{" "}
                <strong className="text-[var(--color-primary)]">
                  {terminal}
                </strong>
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
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>

        <ThemeToggle />
      </div>
    </header>
  );
};
