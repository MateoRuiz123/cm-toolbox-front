import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { fetchClienteProfile } from "../docs/api/docs-api";
import type { DocsClient } from "../docs/api/types";

type ClienteShellProps = {
  readonly children: ReactNode;
  readonly onLogout?: () => void;
};

export const ClienteShell = ({ children, onLogout }: ClienteShellProps) => {
  const [profile, setProfile] = useState<DocsClient | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (!onLogout) {
      return;
    }
    const controller = new AbortController();
    void fetchClienteProfile(controller.signal)
      .then((data) => {
        setProfile(data);
      })
      .catch(() => {
        setProfile(null);
      });
    return () => {
      controller.abort();
    };
  }, [onLogout, location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-app)] text-[var(--text-body)]">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--border-default)] px-4 py-3 sm:px-6">
        <Link
          to="/cliente/docs"
          className="text-sm font-bold text-[var(--text-body)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          Documentación de APIs
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          {profile ? (
            <Link
              to="/cliente/perfil"
              className="max-w-[12rem] truncate rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 text-left text-xs text-[var(--text-body)] transition hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] sm:max-w-[16rem]"
              aria-label={`Perfil de ${profile.name}`}
              title={`${profile.name} · ${profile.email}`}
            >
              <span className="block truncate font-semibold">
                {profile.name}
              </span>
              <span className="block truncate text-[var(--text-muted)]">
                {profile.email}
              </span>
            </Link>
          ) : null}
          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="shrink-0 text-sm font-medium text-[var(--color-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              aria-label="Cerrar sesión"
            >
              Cerrar sesión
            </button>
          ) : null}
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
};
