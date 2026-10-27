import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { SmoothTitleAccent } from "@/shared/ui/smoothui";
import { esAuthBypassActivo } from "@/shared/auth/auth-bypass";
import {
  ensureClienteSession,
  loginCliente,
  resetPasswordCliente,
} from "./auth/cliente-session";
import { ClienteShell } from "./cliente-shell";

/**
 * Login clientes: Keycloak client OIDC distinto (sin Google).
 * Con auth bypass local, un clic simula sesión cliente para humo UI.
 */
export const ClienteLoginPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void ensureClienteSession().then((status) => {
      if (cancelled) {
        return;
      }
      if (status === "authenticated") {
        navigate("/cliente/docs", { replace: true });
        return;
      }
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginCliente();
      navigate("/cliente/docs", { replace: true });
    } catch {
      setError("No pudimos iniciar sesión. Revisa usuario y contraseña.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <ClienteShell>
        <div
          className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-muted)]"
          aria-busy="true"
        >
          Cargando…
        </div>
      </ClienteShell>
    );
  }

  return (
    <ClienteShell>
      <div className="mx-auto flex max-w-md flex-col px-4 py-16">
        <SmoothTitleAccent
          as="h1"
          className="text-2xl font-bold text-[var(--text-body)]"
          accessibleTitle="Documentación para clientes"
          before="Documentación para "
          accent="clientes"
          amplitude={3}
        />
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Ingresa con el usuario y la contraseña que te asignaron.
        </p>

        {esAuthBypassActivo() ? (
          <div className="mt-8 space-y-3">
            <p className="text-xs text-[var(--text-muted)]">
              Modo local: el MS usa AUTH_MODE=disabled. Puedes entrar sin
              Keycloak.
            </p>
            <button
              type="button"
              onClick={() => void handleLogin()}
              className="w-full rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-action-contrast)]"
            >
              Entrar (dev)
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              Serás redirigido al inicio de sesión seguro (usuario y
              contraseña). No se usa Google en este acceso.
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleLogin()}
              className="w-full rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-action-contrast)] disabled:opacity-50"
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
            <button
              type="button"
              className="block w-full text-center text-sm text-[var(--color-primary)] hover:underline"
              onClick={() => {
                void resetPasswordCliente().catch(() => {
                  setError(
                    "No pudimos abrir el restablecimiento de contraseña.",
                  );
                });
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        )}

        {error ? (
          <p className="mt-4 text-sm text-[var(--state-error)]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </ClienteShell>
  );
};
