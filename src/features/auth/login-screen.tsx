import { useState } from "react";
import { Link, useInRouterContext } from "react-router";
import { SmoothTitleAccent } from "@/shared/ui/smoothui";
import { env } from "../../shared/lib/env";
import { ThemeToggle } from "../../shared/ui/theme-toggle";

const GoogleIcon = () => (
  <svg aria-hidden="true" className="size-5 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
    />
  </svg>
);

interface EcosystemHighlight {
  readonly id: string;
  readonly title: string;
  readonly badge: string;
  readonly description: string;
  readonly spanClass: string;
}

const ECOSYSTEM_HIGHLIGHTS: readonly EcosystemHighlight[] = [
  {
    id: "diagnostico",
    title: "Diagnóstico de Migración",
    badge: "Trazabilidad",
    description:
      "Auditoría de remisiones y despachos con verificaciones automáticas, evidencia y re-migración asistida.",
    spanClass: "sm:col-span-7",
  },
  {
    id: "logs",
    title: "Visor de Logs GKE",
    badge: "Tiempo real",
    description:
      "Streaming de pods, filtros de entorno Prod/Test y acceso directo a cargas de trabajo.",
    spanClass: "sm:col-span-5",
  },
  {
    id: "docs",
    title: "Documentación de APIs",
    badge: "OpenAPI",
    description:
      "Especificaciones vigentes y portal dedicado para clientes e integradores.",
    spanClass: "sm:col-span-5",
  },
  {
    id: "rbac",
    title: "Gobierno RBAC y Salud",
    badge: "Seguridad",
    description:
      "Control granular por roles, bitácora de auditoría y monitoreo continuo por servicio.",
    spanClass: "sm:col-span-7",
  },
];

interface LoginScreenProps {
  readonly onLogin: () => void | Promise<void>;
}

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [iniciando, setIniciando] = useState(false);
  const [errorLogin, setErrorLogin] = useState<string | null>(null);
  const inRouter = useInRouterContext();

  const handleLogin = async () => {
    try {
      setErrorLogin(null);
      setIniciando(true);
      await onLogin();
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      setErrorLogin(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar la redirección con Google.",
      );
      setIniciando(false);
    }
  };

  return (
    <div
      style={{
        backgroundImage:
          "linear-gradient(var(--scrim-login), var(--scrim-login)), url(/fondo.webp)",
      }}
      className="relative flex min-h-screen w-full items-center justify-center bg-[var(--surface-app)] bg-cover bg-center px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
        <section
          aria-label="Ecosistema Coordinadora Toolbox"
          style={{
            boxShadow: "var(--shadow-24)",
            background: "var(--surface-glass)",
            backdropFilter: "var(--blur-glass)",
          }}
          className="rounded-[var(--radius-3)] border border-[var(--border-default)] p-6 sm:p-8 lg:col-span-7"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
              <span className="size-2 rounded-full bg-[var(--state-success)]" />
              <span>Ecosistema Operativo TI</span>
            </span>
            <span className="font-mono text-[11px] font-semibold text-[var(--text-muted)]">
              Ambiente {env.keycloakEnv}
            </span>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-body)] sm:text-3xl">
            Coordinadora{" "}
            <span className="text-[var(--color-primary)]">Toolbox</span>
          </h2>
          <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
            Centro unificado de diagnóstico, observabilidad Kubernetes y
            documentación API para acelerar la operación diaria de los equipos
            de Coordinadora Mercantil.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-12">
            {ECOSYSTEM_HIGHLIGHTS.map((item) => (
              <div
                key={item.id}
                className={`${item.spanClass} rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)]/90 p-4`}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[var(--text-body)]">
                    {item.title}
                  </h3>
                  <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary)]">
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col justify-between gap-3 border-t border-[var(--border-default)] pt-5 sm:flex-row sm:items-center">
            <div className="text-xs text-[var(--text-muted)]">
              ¿Eres integrador externo buscando especificaciones de API?
            </div>
            {inRouter ? (
              <Link
                to="/cliente/login"
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--color-primary)]/40 bg-[var(--surface-card)] px-4 py-2 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)]"
              >
                <span>Portal de Documentación para Clientes</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            ) : (
              <a
                href="/cliente/login"
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--color-primary)]/40 bg-[var(--surface-card)] px-4 py-2 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)]"
              >
                <span>Portal de Documentación para Clientes</span>
                <span aria-hidden="true">&rarr;</span>
              </a>
            )}
          </div>
        </section>

        <section
          aria-label="Inicio de sesión corporativo"
          style={{
            boxShadow: "var(--shadow-24)",
            background: "var(--surface-glass)",
            backdropFilter: "var(--blur-glass)",
          }}
          className="mx-auto w-full max-w-[var(--card-max-narrow)] rounded-[var(--radius-3)] border border-[var(--border-default)] p-8 text-center sm:p-10 lg:col-span-5"
        >
          <div className="mb-6 flex justify-center">
            <img
              src="/logo-coordinadora.png"
              alt="Logotipo de Coordinadora Mercantil - Inicio de sesión"
              className="h-auto w-full max-w-[260px] object-contain dark:brightness-0 dark:invert"
            />
          </div>

          <hr className="my-6 border-0 border-t border-[var(--border-default)]" />

          <SmoothTitleAccent
            as="h1"
            className="mb-2 text-xl font-bold tracking-tight text-[var(--text-body)] sm:text-2xl"
            accessibleTitle="Bienvenido"
            accent="Bienvenido"
            amplitude={3}
          />
          <p className="mb-8 text-sm leading-relaxed text-[var(--text-muted)]">
            Autentícate con tu cuenta corporativa para entrar directo al portal
            de herramientas según tus permisos.
          </p>

          {errorLogin && (
            <div
              role="alert"
              className="mb-6 rounded-[var(--radius-1)] border border-[var(--state-error)]/30 bg-[var(--alert-error-bg)] p-3 text-left text-xs text-[var(--state-error)]"
            >
              <p className="mb-1 font-semibold">
                Error al conectar con la autenticación
              </p>
              <p className="leading-relaxed">{errorLogin}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={iniciando}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-6 py-3 text-base font-medium text-[var(--color-accent-contrast)] shadow-md transition-all hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex size-6 items-center justify-center rounded-full bg-white p-0.5 shadow-xs">
              <GoogleIcon />
            </div>
            <span>
              {iniciando ? "Iniciando sesión..." : "Iniciar sesión con Google"}
            </span>
          </button>

          <p className="mt-8 text-xs text-[var(--text-muted)]">
            Uso interno corporativo Coordinadora Mercantil S.A. &bull; Ambiente:{" "}
            <span className="font-mono font-medium">{env.keycloakEnv}</span>
          </p>
        </section>
      </main>
    </div>
  );
};
