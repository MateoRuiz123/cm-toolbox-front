import { useState } from "react";
import { Link } from "react-router";
import { SmoothTitleAccent } from "@/shared/ui/smoothui";
import { useTheme } from "../../app/theme-context";
import { useAccess } from "../../shared/auth/access-context";
import type { ModoHubLayout } from "../../shared/lib/ui-preferences";

const HUB_LAYOUT_OPCIONES: readonly {
  readonly id: ModoHubLayout;
  readonly nombre: string;
  readonly detalle: string;
}[] = [
  {
    id: "ps5",
    nombre: "Vista inmersiva (Principal)",
    detalle:
      "Fondo ambiental reactivo por herramienta, detalle destacado en pantalla y carrusel inferior interactivo.",
  },
  {
    id: "bento",
    nombre: "Cuadrícula Bento clásica",
    detalle:
      "Cuadrícula modular personalizable con fondo ambiental reactivo y editor de tamaños.",
  },
];

/** Página de apariencia. La preferencia vive en el navegador, no en el catálogo de apps. */
export const ConfiguracionPage = () => {
  const {
    descanso,
    toggleDescanso,
    movimientoReducido,
    setMovimientoReducido,
    hubLayout = "ps5",
    setHubLayout,
  } = useTheme();
  const { showWelcomeLanding = true, updateWelcomeLandingPreference } =
    useAccess();
  const [savingWelcome, setSavingWelcome] = useState(false);
  const descansoActivo = descanso === "calido";

  const handleToggleWelcome = async () => {
    setSavingWelcome(true);
    try {
      await updateWelcomeLandingPreference?.(!showWelcomeLanding);
    } finally {
      setSavingWelcome(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <SmoothTitleAccent
        as="h1"
        className="text-2xl font-bold tracking-tight text-[var(--text-body)] sm:text-3xl"
        accessibleTitle="Apariencia del toolbox"
        before="Apariencia del "
        accent="toolbox"
        amplitude={3}
      />
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
        Personaliza la comodidad visual, la experiencia del Hub y la pantalla de
        bienvenida. El modo claro u oscuro se alterna desde el encabezado.
      </p>

      <section aria-labelledby="comodidad-titulo" className="mt-8">
        <h2
          id="comodidad-titulo"
          className="text-lg font-bold text-[var(--text-body)]"
        >
          Comodidad visual para uso prolongado
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-muted)]">
          Para turnos largos. Lleva fondos y textos a tonos papel y ámbar que
          deslumbran menos. Funciona en modo claro y oscuro.
        </p>

        <div className="surface mt-5 flex flex-col gap-5 rounded-[var(--radius-3)] border border-[var(--border-default)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span
              id="descanso-label"
              className="block text-sm font-medium text-[var(--text-body)]"
            >
              Descanso visual (tono cálido)
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-[var(--text-muted)]">
              Mantiene el contraste AA y los colores de estado. Solo cambia
              superficies, bordes y texto.
            </span>
            <span aria-hidden="true" className="mt-4 flex gap-2">
              <span
                className="block h-10 w-16 rounded-[var(--radius-1)] border border-[#e0e0e0] bg-[#fcfbf9]"
                title="Normal"
              />
              <span
                className="block h-10 w-16 rounded-[var(--radius-1)] border border-[#dcd5c7] bg-[#f3efe6]"
                title="Cálido"
              />
              <span
                className="block h-10 w-16 rounded-[var(--radius-1)] border border-[#332e28] bg-[#23201c]"
                title="Cálido oscuro"
              />
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={descansoActivo}
            aria-labelledby="descanso-label"
            onClick={toggleDescanso}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
              descansoActivo
                ? "border-[var(--color-action)] bg-[var(--color-action)]"
                : "border-[var(--border-default)] bg-[var(--surface-sunken)]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block size-5 rounded-full bg-[var(--surface-card)] shadow transition-transform duration-200 ease-out ${
                descansoActivo ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="surface mt-4 flex flex-col gap-5 rounded-[var(--radius-3)] border border-[var(--border-default)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span
              id="movimiento-label"
              className="block text-sm font-medium text-[var(--text-body)]"
            >
              Reducir movimiento
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-[var(--text-muted)]">
              Detiene ondas, fundidos y transiciones de la aplicación. Si el
              sistema operativo ya lo pide, permanece activo.
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={movimientoReducido}
            aria-labelledby="movimiento-label"
            onClick={() => setMovimientoReducido(!movimientoReducido)}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
              movimientoReducido
                ? "border-[var(--color-action)] bg-[var(--color-action)]"
                : "border-[var(--border-default)] bg-[var(--surface-sunken)]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block size-5 rounded-full bg-[var(--surface-card)] shadow ${
                movimientoReducido ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </section>

      <section aria-labelledby="hub-layout-titulo" className="mt-12">
        <h2
          id="hub-layout-titulo"
          className="text-lg font-bold text-[var(--text-body)]"
        >
          Experiencia del Hub de aplicaciones
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-muted)]">
          Elige cómo se presenta el portal principal. Puedes mantener la vista
          inmersiva con carrusel inferior o cambiar a la cuadrícula Bento clásica.
        </p>

        <div
          role="radiogroup"
          aria-label="Disposición del Hub"
          className="mt-5 grid gap-4 sm:grid-cols-2"
        >
          {HUB_LAYOUT_OPCIONES.map((opcion) => {
            const activo = hubLayout === opcion.id;
            return (
              <button
                key={opcion.id}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => setHubLayout?.(opcion.id)}
                className={`flex cursor-pointer flex-col justify-between rounded-[var(--radius-3)] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                  activo
                    ? "border-[var(--border-focus)] bg-[var(--surface-card)]"
                    : "border-[var(--border-default)] bg-[var(--surface-card)] hover:bg-[var(--surface-sunken)]"
                }`}
              >
                <div>
                  <span className="block text-sm font-semibold text-[var(--text-body)]">
                    {opcion.nombre}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-[var(--text-muted)]">
                    {opcion.detalle}
                  </span>
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-primary)]">
                  <span>{activo ? "Activo actualmente" : "Seleccionar vista"}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="surface mt-5 flex flex-col gap-5 rounded-[var(--radius-3)] border border-[var(--border-default)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span
              id="welcome-pref-label"
              className="block text-sm font-medium text-[var(--text-body)]"
            >
              Mostrar pantalla de bienvenida al iniciar sesión
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-[var(--text-muted)]">
              Se guarda por usuario. Al activarla, verás la bienvenida animada
              COORDINADORA después del inicio de sesión.
            </span>
            <Link
              to="/bienvenida"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              <span>Ver pantalla de bienvenida</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          <button
            type="button"
            role="switch"
            disabled={savingWelcome}
            aria-checked={showWelcomeLanding}
            aria-labelledby="welcome-pref-label"
            onClick={() => void handleToggleWelcome()}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:opacity-60 ${
              showWelcomeLanding
                ? "border-[var(--color-action)] bg-[var(--color-action)]"
                : "border-[var(--border-default)] bg-[var(--surface-sunken)]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block size-5 rounded-full bg-[var(--surface-card)] shadow transition-transform duration-200 ease-out ${
                showWelcomeLanding ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </section>
    </div>
  );
};
