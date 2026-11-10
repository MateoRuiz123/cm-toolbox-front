import type { ReactNode } from "react";
import { Link } from "react-router";
import { SmoothTitleAccent } from "@/shared/ui/smoothui";
import { useAccess } from "./access-context";

interface AppAccessGuardProps {
  readonly appId: string;
  readonly children: ReactNode;
}

/**
 * Guard de autorización por ruta de herramienta (CA-F03, CA-F05, CA-F06).
 * Bloquea el acceso directo por URL si la app está en mantenimiento, desactivada o sin permiso 'view'.
 */
const AccessLoadingFallback = () => (
  <div
    className="flex min-h-[40vh] items-center justify-center bg-[var(--surface-app)] text-sm text-[var(--text-muted)]"
    aria-busy="true"
    aria-live="polite"
  >
    Cargando permisos…
  </div>
);

export const AppAccessGuard = ({ appId, children }: AppAccessGuardProps) => {
  const { apps, canAccessApp, loadingAccess } = useAccess();

  if (loadingAccess) {
    return <AccessLoadingFallback />;
  }

  const appInfo = apps.find((a) => a.id === appId);

  if (appInfo?.status !== "hidden" && canAccessApp(appId)) {
    return <>{children}</>;
  }
  const isMaintenance = appInfo?.status === "maintenance";

  const titulo = isMaintenance
    ? "Herramienta en mantenimiento operativo"
    : "Permiso requerido para esta herramienta";

  const descripcion = isMaintenance
    ? "Esta aplicación se encuentra temporalmente en mantenimiento por un administrador. Intenta más tarde."
    : "Tu cuenta no tiene habilitado el permiso de acceso para esta aplicación. Solicítalo a un administrador del portal.";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-4 py-12">
      <div
        style={{ boxShadow: "var(--shadow-1)" }}
        className="w-full rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-8 text-center"
      >
        <div
          className={`mx-auto mb-4 flex size-12 items-center justify-center rounded-full ${
            isMaintenance
              ? "bg-[var(--alert-warning-bg)] text-[var(--state-warning)]"
              : "bg-[var(--alert-error-bg)] text-[var(--state-error)]"
          }`}
        >
          <svg
            className="size-6"
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
        </div>

        <SmoothTitleAccent
          as="h1"
          className="mb-2 text-xl font-bold tracking-tight text-[var(--text-body)] sm:text-2xl"
          accessibleTitle={titulo}
          before={isMaintenance ? "Herramienta en " : "Permiso requerido para "}
          accent={
            isMaintenance ? "mantenimiento operativo" : "esta herramienta"
          }
          amplitude={3}
        />

        <p className="mb-6 text-sm leading-relaxed text-[var(--text-muted)]">
          {descripcion}
        </p>

        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-action)] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-[var(--color-action-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <span>Volver al portal</span>
        </Link>
      </div>
    </div>
  );
};
