import { useCallback, useEffect, useRef, useState } from "react";
import { useAccess } from "../../shared/auth/access-context";
import { useMovimientoReducido } from "../../shared/lib/use-movimiento-reducido";
import { usePageTitle } from "../../shared/lib/use-page-title";
import { useTransitionNavigate } from "../../shared/lib/use-transition-navigate";
import { startVolumetricWord } from "./volumetric-word-renderer";

interface WelcomeLandingPageProps {
  readonly onContinue?: () => void;
  readonly standalone?: boolean;
}

const WelcomeGateTitle = () => {
  usePageTitle("/bienvenida");
  return null;
};

const DEV_BYPASS_EMAIL = "dev.local@coordinadora.com";
const NON_PERSONAL_NAME_PATTERN =
  /^(desarrollador|developer|dev|usuario|operador|admin|administrador|super|test|local)$/i;

/**
 * Construye el saludo de bienvenida tomando únicamente el primer nombre de pila.
 * Evita mostrar sufijos de rol entre paréntesis o placeholders de sesión local de desarrollo.
 */
export const resolveWelcomeGreeting = (
  displayName?: string | null,
  email?: string | null,
): string => {
  if (email?.trim().toLowerCase() === DEV_BYPASS_EMAIL) {
    return "Hola";
  }

  const withoutRoleSuffix = (displayName ?? "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim();

  if (!withoutRoleSuffix || withoutRoleSuffix.includes("@")) {
    return "Hola";
  }

  const firstWord = withoutRoleSuffix.split(/\s+/)[0]?.trim() ?? "";
  if (!firstWord || NON_PERSONAL_NAME_PATTERN.test(firstWord)) {
    return "Hola";
  }

  return `Hola, ${firstWord}`;
};

/**
 * Pantalla de bienvenida post-login con luz volumétrica WebGL2 sobre la palabra COORDINADORA,
 * control persistente por usuario "Volver a mostrar: Sí / No" y acceso al portal.
 */
export const WelcomeLandingPage = ({
  onContinue,
  standalone = false,
}: WelcomeLandingPageProps) => {
  const navigate = useTransitionNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wordSlotRef = useRef<HTMLDivElement | null>(null);
  const {
    profile,
    showWelcomeLanding = true,
    updateWelcomeLandingPreference,
  } = useAccess();
  const movimientoReducido = useMovimientoReducido();

  const [webglSupported, setWebglSupported] = useState(true);
  const [savingPreference, setSavingPreference] = useState(false);

  const greetingText = resolveWelcomeGreeting(
    profile?.displayName,
    profile?.email,
  );

  const handleEnterPortal = useCallback(() => {
    if (onContinue) {
      onContinue();
      return;
    }
    navigate("/");
  }, [onContinue, navigate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = startVolumetricWord(canvas, "COORDINADORA", {
      reducedMotion: movimientoReducido,
      anchorElement: wordSlotRef.current,
    });
    setWebglSupported(controller.isWebGL2Supported);
    return () => {
      controller.cleanup();
    };
  }, [movimientoReducido]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "button" || tag === "a" || tag === "input") return;
      handleEnterPortal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleEnterPortal]);

  const handleSelectPreference = async (nextShow: boolean) => {
    setSavingPreference(true);
    try {
      await updateWelcomeLandingPreference?.(nextShow);
    } finally {
      setSavingPreference(false);
    }
  };

  return (
    <div
      data-testid="welcome-landing-page"
      className="relative flex min-h-dvh w-full flex-col overflow-x-hidden overflow-y-auto bg-[var(--surface-app)] text-[var(--text-body)]"
      style={{
        paddingTop: "max(0.875rem, env(safe-area-inset-top, 0px))",
        paddingRight: "max(1.25rem, env(safe-area-inset-right, 0px))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
        paddingLeft: "max(1.25rem, env(safe-area-inset-left, 0px))",
      }}
    >
      {!standalone && <WelcomeGateTitle />}
      <h1 className="sr-only">Coordinadora — Bienvenida al Portal Toolbox</h1>

      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* Encabezado corporativo + control "Volver a mostrar: Sí / No" */}
      <header className="relative z-10 mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 py-1 sm:px-2 sm:py-2">
        <div className="flex items-center gap-3">
          <img
            src="/logo-coordinadora.png"
            alt="Logotipo oficial de Coordinadora Mercantil"
            className="h-6 w-auto object-contain dark:brightness-0 dark:invert"
          />
          <span className="hidden rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)]/90 px-3 py-1 text-[11px] font-semibold tracking-wider text-[var(--text-muted)] backdrop-blur-md sm:inline-flex">
            Portal de Apoyo TI
          </span>
        </div>

        <div className="flex items-center gap-2.5 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)]/90 px-3 py-1.5 shadow-xs backdrop-blur-md">
          <span
            id="welcome-repeat-label"
            className="text-xs font-medium text-[var(--text-body)]"
          >
            Volver a mostrar
          </span>
          <div
            role="group"
            aria-labelledby="welcome-repeat-label"
            className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-0.5"
          >
            <button
              type="button"
              disabled={savingPreference}
              aria-pressed={showWelcomeLanding}
              onClick={() => void handleSelectPreference(true)}
              className={`cursor-pointer rounded-[var(--radius-pill)] px-3 py-1 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                showWelcomeLanding
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-contrast)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-body)]"
              }`}
            >
              Sí
            </button>
            <button
              type="button"
              disabled={savingPreference}
              aria-pressed={!showWelcomeLanding}
              onClick={() => void handleSelectPreference(false)}
              className={`cursor-pointer rounded-[var(--radius-pill)] px-3 py-1 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                !showWelcomeLanding
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-contrast)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-body)]"
              }`}
            >
              No
            </button>
          </div>
        </div>
      </header>

      {/* Bloque central agrupado: saludo + palabra volumétrica + CTA */}
      <div className="relative z-10 mx-auto my-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-2 py-2 [@media(min-height:540px)]:gap-4 [@media(min-height:540px)]:py-4 sm:gap-6 sm:py-6">
        <section
          aria-label="Saludo de bienvenida"
          className="pointer-events-none mx-auto flex max-w-xl flex-col items-center text-center"
        >
          <p className="text-lg font-bold tracking-tight text-[var(--text-body)] sm:text-2xl">
            {greetingText}
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-[var(--text-body)]/85 [@media(min-height:540px)]:mt-1 sm:text-base">
            Tus herramientas de soporte y diagnóstico, en un solo lugar.
          </p>
        </section>

        {/* Ancla vertical donde se centra el shader COORDINADORA o el respaldo sin WebGL2 */}
        <div
          ref={wordSlotRef}
          aria-hidden="true"
          className="pointer-events-none flex h-12 w-full items-center justify-center [@media(min-height:540px)]:h-16 sm:h-24 md:h-28"
        >
          {!webglSupported && (
            <div
              className="flex h-full w-full items-center justify-center rounded-[var(--radius-3)] px-4"
              style={{
                background:
                  "radial-gradient(ellipse 68% 72% at 50% 50%, color-mix(in srgb, var(--azul-coordinadora) 16%, transparent) 0%, transparent 74%)",
              }}
            >
              <span className="select-none text-center text-3xl font-extrabold tracking-tight text-[var(--azul-dark)] dark:text-[var(--color-primary)] sm:text-5xl md:text-6xl">
                COORDINADORA
              </span>
            </div>
          )}
        </div>

        <footer className="flex flex-col items-center justify-center gap-2 [@media(min-height:540px)]:gap-3">
          {/* Usa siempre --color-accent y --color-accent-contrast: en .dark (src/index.css)
              --color-accent (#ef7d56) es intencionalmente más claro que #eb5d2c para conservar contraste AA sobre fondo oscuro. */}
          <button
            type="button"
            onClick={handleEnterPortal}
            className="inline-flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-7 py-2.5 text-base font-bold text-[var(--color-accent-contrast)] transition hover:bg-[var(--color-accent-hover)] [@media(min-height:540px)]:px-8 [@media(min-height:540px)]:py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            style={{ boxShadow: "var(--shadow-3)" }}
          >
            <span>{standalone ? "Volver al portal" : "Entrar al portal"}</span>
            <span aria-hidden="true">&rarr;</span>
          </button>
          <p className="rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)]/90 px-4 py-1.5 text-center text-[13px] font-medium text-[var(--text-body)] shadow-xs backdrop-blur-xs">
            {movimientoReducido
              ? "Presiona Enter o usa el botón para entrar al portal"
              : "Desliza el cursor para iluminar • Presiona Enter para entrar"}
          </p>
        </footer>
      </div>
    </div>
  );
};
