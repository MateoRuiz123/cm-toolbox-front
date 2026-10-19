import { useState } from "react";
import { SmoothTitleAccent } from "@/shared/ui/smoothui";
import { ThemeToggle } from "../../shared/ui/theme-toggle";
import { env } from "../../shared/lib/env";

const GoogleIcon = () => (
  <svg className="size-5 shrink-0" viewBox="0 0 24 24">
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

interface LoginScreenProps {
  onLogin: () => void | Promise<void>;
}

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [iniciando, setIniciando] = useState(false);
  const [errorLogin, setErrorLogin] = useState<string | null>(null);

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
      className="relative flex min-h-screen w-full items-center justify-center bg-[var(--surface-app)] bg-cover bg-center p-4"
    >
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div
        style={{
          boxShadow: "var(--shadow-24)",
          background: "var(--surface-glass)",
          backdropFilter: "var(--blur-glass)",
        }}
        className="w-full max-w-[var(--card-max-narrow)] rounded-[var(--radius-3)] p-8 sm:p-10 text-center"
      >
        <div className="flex justify-center mb-6">
          <img
            src="/logo-coordinadora.png"
            alt="Logotipo de Coordinadora Mercantil - Inicio de sesión"
            className="max-w-[280px] w-full h-auto object-contain dark:brightness-0 dark:invert"
          />
        </div>

        <hr className="border-0 border-t border-[var(--border-default)] my-6" />

        <SmoothTitleAccent
          as="h1"
          className="text-xl sm:text-2xl font-bold text-[var(--text-body)] tracking-tight mb-2"
          accessibleTitle="Bienvenido"
          accent="Bienvenido"
          amplitude={3}
        />
        <p className="text-sm text-[var(--text-muted)] mb-8 leading-relaxed">
          Autentícate para acceder a las herramientas internas, utilitarios
          operativos y servicios de soporte.
        </p>

        {errorLogin && (
          <div className="mb-6 rounded-[var(--radius-1)] border border-[var(--state-error)]/30 bg-[var(--alert-error-bg)] p-3 text-left text-xs text-[var(--state-error)]">
            <p className="font-semibold mb-1">
              Error al conectar con la autenticación
            </p>
            <p className="leading-relaxed">{errorLogin}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogin}
          disabled={iniciando}
          className="flex w-full items-center justify-center gap-3 rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-6 py-3 text-base font-medium text-white shadow-md transition-all hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-center size-6 rounded-full bg-white p-0.5 shadow-xs">
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
      </div>
    </div>
  );
};
