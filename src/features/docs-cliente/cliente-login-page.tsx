import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
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
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const activationState = useMemo(() => {
    const client = searchParams.get("client");
    const token = searchParams.get("activation_token");
    const expiresAt = searchParams.get("expires_at");
    if (!client || !token) return null;
    const expiresDate = expiresAt ? new Date(expiresAt) : null;
    const isValidDate =
      expiresDate !== null && !Number.isNaN(expiresDate.getTime());
    const expired = isValidDate && expiresDate.getTime() < Date.now();
    return {
      client,
      expired,
      expiresLabel: isValidDate ? expiresDate.toLocaleString("es-CO") : null,
    };
  }, [searchParams]);

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
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div
          style={{ boxShadow: "var(--shadow-panel)" }}
          className="surface w-full max-w-md rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-8"
        >
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-[var(--border-default)] pb-5">
            <img
              src="/logo-coordinadora.png"
              alt="Logotipo de Coordinadora Mercantil"
              className="h-6 w-auto object-contain dark:brightness-0 dark:invert"
            />
            <span className="rounded-[var(--radius-pill)] bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
              Portal de Integraciones
            </span>
          </div>

          <SmoothTitleAccent
            as="h1"
            className="text-2xl font-bold text-[var(--text-body)]"
            accessibleTitle="Documentación para clientes"
            before="Documentación para "
            accent="clientes"
            amplitude={3}
          />
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Ingresa con las credenciales asignadas a tu organización.
          </p>

          {activationState ? (
            <div
              role="status"
              className={`mt-5 rounded-[var(--radius-2)] border p-3 text-xs ${
                activationState.expired
                  ? "border-[var(--state-error)]/40 bg-[var(--alert-error-bg)] text-[var(--state-error)]"
                  : "border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] text-[var(--text-body)]"
              }`}
            >
              {activationState.expired ? (
                <p>
                  El enlace temporal para{" "}
                  <strong className="font-mono">{activationState.client}</strong>{" "}
                  expiró. Solicita un reenvío al equipo de Coordinadora.
                </p>
              ) : (
                <p>
                  Enlace de activación listo para{" "}
                  <strong className="font-mono">{activationState.client}</strong>
                  {activationState.expiresLabel
                    ? ` (vigente hasta ${activationState.expiresLabel})`
                    : ""}
                  .
                </p>
              )}
            </div>
          ) : null}

          {esAuthBypassActivo() ? (
            <div className="mt-7 space-y-3">
              <p className="text-xs text-[var(--text-muted)]">
                Modo local: el servicio usa{" "}
                <code className="font-mono">AUTH_MODE=disabled</code>. Puedes
                entrar sin Keycloak.
              </p>
              <button
                type="button"
                onClick={() => void handleLogin()}
                className="w-full cursor-pointer rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-action-contrast)] shadow-sm transition hover:bg-[var(--color-action-hover)]"
              >
                Entrar (dev)
              </button>
            </div>
          ) : (
            <div className="mt-7 space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Serás redirigido al inicio de sesión seguro (usuario y
                contraseña). No se usa Google en este acceso.
              </p>
              <button
                type="button"
                disabled={loading || activationState?.expired === true}
                onClick={() => void handleLogin()}
                className="w-full cursor-pointer rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-action-contrast)] shadow-sm transition hover:bg-[var(--color-action-hover)] disabled:opacity-50"
              >
                {loading ? "Entrando…" : "Entrar"}
              </button>
              <button
                type="button"
                className="block w-full cursor-pointer text-center text-sm text-[var(--color-primary)] hover:underline"
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
      </div>
    </ClienteShell>
  );
};
