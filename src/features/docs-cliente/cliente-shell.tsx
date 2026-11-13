import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { fetchClienteProfile } from "../docs/api/docs-api";
import type { DocsClient } from "../docs/api/types";

type ClienteShellProps = {
  readonly children: ReactNode;
  readonly onLogout?: () => void;
};

export const ClienteShell = ({ children, onLogout }: ClienteShellProps) => {
  const [profile, setProfile] = useState<DocsClient | null>(null);

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
  }, [onLogout]);

  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      const custom = event as CustomEvent<DocsClient>;
      if (custom.detail) {
        setProfile(custom.detail);
      }
    };
    globalThis.addEventListener("cliente-profile-updated", handleProfileUpdate);
    return () => {
      globalThis.removeEventListener(
        "cliente-profile-updated",
        handleProfileUpdate,
      );
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-app)] text-[var(--text-body)]">
      <header
        style={{ boxShadow: "var(--shadow-1)" }}
        className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[var(--border-default)] bg-[var(--surface-header)] px-4 sm:px-8"
      >
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/cliente/docs"
            className="flex shrink-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <img
              src="/logo-coordinadora.png"
              alt="Logotipo de Coordinadora Mercantil"
              className="h-5 w-auto object-contain dark:brightness-0 dark:invert sm:h-6"
            />
          </Link>
          <div className="hidden h-4 w-px shrink-0 bg-[var(--border-default)] sm:block" />
          <Link
            to="/cliente/docs"
            className="truncate text-xs font-bold text-[var(--text-body)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] sm:text-sm"
          >
            Documentación de APIs
          </Link>
          <span className="hidden rounded-[var(--radius-pill)] bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] md:inline-block">
            Portal Clientes
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {profile ? (
            <Link
              to="/cliente/perfil"
              className="max-w-[12rem] truncate rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 text-left text-xs text-[var(--text-body)] transition hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] sm:max-w-[18rem]"
              aria-label={`Perfil de ${profile.name}`}
              title={`NIT ${profile.id} · ${profile.name} · ${profile.email}`}
            >
              <span className="flex items-center gap-1.5 truncate font-semibold">
                <span className="truncate">{profile.name}</span>
                <span className="shrink-0 font-mono text-[10px] text-[var(--color-primary)]">
                  {profile.id}
                </span>
              </span>
              <span className="block truncate text-[11px] text-[var(--text-muted)]">
                {profile.email}
              </span>
            </Link>
          ) : null}

          <ThemeToggle />

          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="shrink-0 cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-body)] transition hover:border-[var(--state-error)] hover:text-[var(--state-error)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
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
