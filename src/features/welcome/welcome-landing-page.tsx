import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAccess } from "../../shared/auth/access-context";
import { useMovimientoReducido } from "../../shared/lib/use-movimiento-reducido";
import { startVolumetricWord } from "./volumetric-word-renderer";

interface WelcomeLandingPageProps {
  readonly onContinue?: () => void;
  readonly standalone?: boolean;
}

/**
 * Pantalla de bienvenida post-login con luz volumétrica WebGL2 sobre la palabra COORDINADORA,
 * control persistente por usuario "Volver a mostrar: Sí / No" y acceso al portal.
 */
export const WelcomeLandingPage = ({
  onContinue,
  standalone = false,
}: WelcomeLandingPageProps) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { showWelcomeLanding = true, updateWelcomeLandingPreference } =
    useAccess();
  const movimientoReducido = useMovimientoReducido();

  const [webglSupported, setWebglSupported] = useState(true);
  const [savingPreference, setSavingPreference] = useState(false);

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
      className="relative flex min-h-dvh w-full flex-col justify-between overflow-hidden bg-[var(--code-bg)] text-[var(--code-fg)]"
    >
      <h1 className="sr-only">Coordinadora — Bienvenida al Portal Toolbox</h1>

      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      />

      {!webglSupported && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-6"
          style={{
            background:
              "radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--naranja-coordinadora) 26%, transparent) 0%, color-mix(in srgb, var(--azul-coordinadora) 16%, transparent) 38%, transparent 72%)",
          }}
        >
          <span className="select-none text-center text-4xl font-extrabold tracking-tight text-[var(--code-fg)]/85 sm:text-6xl md:text-7xl">
            COORDINADORA
          </span>
        </div>
      )}

      {/* Barra superior con logotipo corporativo y control "Volver a mostrar: Sí / No" */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-6">
        <div className="flex items-center gap-3">
          <img
            src="/logo-coordinadora.png"
            alt="Logotipo oficial de Coordinadora Mercantil"
            className="h-6 w-auto object-contain brightness-0 invert"
          />
          <span className="hidden rounded-[var(--radius-pill)] border border-[var(--code-border)] bg-[var(--code-bg)]/80 px-3 py-1 text-[11px] font-semibold tracking-wider text-[var(--code-fg)]/80 sm:inline-flex">
            Ecosistema Operativo TI
          </span>
        </div>

        <div className="flex items-center gap-2.5 rounded-[var(--radius-pill)] border border-[var(--code-border)] bg-[var(--code-bg)]/85 px-3 py-1.5 backdrop-blur-md">
          <span
            id="welcome-repeat-label"
            className="text-xs font-medium text-[var(--code-fg)]/85"
          >
            Volver a mostrar
          </span>
          <div
            role="group"
            aria-labelledby="welcome-repeat-label"
            className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--code-border)] bg-[var(--surface-sunken)]/10 p-0.5"
          >
            <button
              type="button"
              disabled={savingPreference}
              aria-pressed={showWelcomeLanding}
              onClick={() => void handleSelectPreference(true)}
              className={`cursor-pointer rounded-[var(--radius-pill)] px-3 py-1 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                showWelcomeLanding
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-contrast)]"
                  : "text-[var(--code-fg)]/70 hover:text-[var(--code-fg)]"
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
                  : "text-[var(--code-fg)]/70 hover:text-[var(--code-fg)]"
              }`}
            >
              No
            </button>
          </div>
        </div>
      </header>

      {/* CTA inferior para ingresar al portal */}
      <footer className="relative z-10 flex flex-col items-center justify-center gap-2.5 px-5 pb-8 sm:pb-10">
        <button
          type="button"
          onClick={handleEnterPortal}
          className="inline-flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-7 py-3 text-sm font-bold text-[var(--color-accent-contrast)] shadow-lg transition hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          <span>{standalone ? "Volver al portal" : "Entrar al portal"}</span>
          <span aria-hidden="true">&rarr;</span>
        </button>
        <p className="text-[11px] text-[var(--code-fg)]/60">
          {movimientoReducido
            ? "Mueve el cursor para orientar la luz • Presiona Enter para entrar"
            : "Desliza el cursor para iluminar • Presiona Enter para entrar"}
        </p>
      </footer>
    </div>
  );
};
