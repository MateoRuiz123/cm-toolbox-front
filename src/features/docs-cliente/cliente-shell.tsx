import type { ReactNode } from "react";

type ClienteShellProps = {
  readonly children: ReactNode;
  readonly onLogout?: () => void;
};

export const ClienteShell = ({ children, onLogout }: ClienteShellProps) => (
  <div className="flex min-h-screen flex-col bg-[var(--surface-app)] text-[var(--text-body)]">
    <header className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3 sm:px-6">
      <p className="text-sm font-bold">Documentación de APIs</p>
      {onLogout ? (
        <button
          type="button"
          onClick={onLogout}
          className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          aria-label="Cerrar sesión"
        >
          Cerrar sesión
        </button>
      ) : null}
    </header>
    <main className="flex-1">{children}</main>
  </div>
);
