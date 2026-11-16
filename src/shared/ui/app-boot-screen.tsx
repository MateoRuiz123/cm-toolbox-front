import { useMovimientoReducido } from "../lib/use-movimiento-reducido";

export interface AppBootScreenProps {
  readonly message?: string;
}

const BOOT_STEPS: readonly string[] = [
  "Autenticación corporativa SSO",
  "Perfil de permisos RBAC",
  "Catálogo de herramientas",
];

/**
 * Pantalla de arranque institucional mostrada mientras se inicializan Keycloak
 * y el perfil de permisos del usuario.
 */
export const AppBootScreen = ({
  message = "Verificando credenciales corporativas...",
}: AppBootScreenProps) => {
  const reducirMovimiento = useMovimientoReducido();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[var(--surface-app)] px-4 py-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,var(--color-primary-soft)_0%,transparent_55%)] opacity-80"
      />

      <div
        style={{ boxShadow: "var(--elevation-card)" }}
        className="relative w-full max-w-md rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-8 text-center"
      >
        <div className="mx-auto mb-5 flex items-center justify-center gap-3">
          <img
            src="/logo-coordinadora.png"
            alt="Coordinadora Mercantil S.A."
            className="h-9 w-auto object-contain"
          />
          <span className="rounded-full border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
            Toolbox
          </span>
        </div>

        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)]">
          <span
            aria-hidden="true"
            className={`size-6 rounded-full border-3 border-[var(--color-primary)]/25 border-t-[var(--color-primary)] ${
              reducirMovimiento ? "" : "animate-spin"
            }`}
          />
        </div>

        <h1 className="text-base font-bold tracking-tight text-[var(--text-body)]">
          Preparando tu espacio operativo
        </h1>
        <p className="mt-1.5 text-sm font-medium text-[var(--text-muted)]">
          {message}
        </p>

        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]">
          <div
            className={`h-full w-2/3 rounded-full bg-[var(--color-primary)] ${
              reducirMovimiento ? "" : "animate-pulse"
            }`}
          />
        </div>

        <ul className="mt-6 space-y-2 text-left text-xs text-[var(--text-muted)]">
          {BOOT_STEPS.map((step, index) => (
            <li
              key={step}
              className="flex items-center justify-between rounded-[var(--radius-2)] border border-[var(--border-default)]/70 bg-[var(--surface-sunken)] px-3 py-2"
            >
              <span>{step}</span>
              <span
                className={`size-2 rounded-full ${
                  index === 0
                    ? `bg-[var(--color-primary)] ${reducirMovimiento ? "" : "animate-ping"}`
                    : "bg-[var(--border-default)]"
                }`}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
