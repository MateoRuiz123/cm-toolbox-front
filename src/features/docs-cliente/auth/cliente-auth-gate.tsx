import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router";
import { ensureClienteSession } from "./cliente-session";

type GateState = "loading" | "ok" | "anon";

/**
 * Puerta /cliente: espera init Keycloak (callback OAuth) antes de decidir.
 * RF-13 / C-G: sin sesión → `/cliente/login` (nunca Google).
 */
export const ClienteAuthGate = ({
  children,
}: {
  readonly children: ReactNode;
}) => {
  const [state, setState] = useState<GateState>("loading");

  useEffect(() => {
    let cancelled = false;
    void ensureClienteSession().then((status) => {
      if (cancelled) {
        return;
      }
      setState(status === "authenticated" ? "ok" : "anon");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-muted)]"
        aria-busy="true"
        aria-live="polite"
      >
        Verificando acceso…
      </div>
    );
  }

  if (state === "anon") {
    return <Navigate to="/cliente/login" replace />;
  }

  return children;
};
