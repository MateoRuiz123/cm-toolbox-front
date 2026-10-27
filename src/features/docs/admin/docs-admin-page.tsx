import { Link } from "react-router";
import { useAccess } from "@/shared/auth/access-context";
import { SmoothTitleAccent } from "@/shared/ui/smoothui";

export const DocsAdminPage = () => {
  const { isSuperAdmin, canPerformAction } = useAccess();
  const canManage = isSuperAdmin || canPerformAction("docs", "manage");

  if (!canManage) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div
          className="rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-6"
          role="alert"
        >
          <p className="text-sm font-medium text-[var(--text-body)]">
            No tienes permisos para administrar la documentación de APIs.
          </p>
          <Link
            to="/docs"
            className="mt-4 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          to="/docs"
          className="text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          Volver al catálogo
        </Link>
      </div>

      <header className="mb-8">
        <SmoothTitleAccent
          as="h1"
          className="text-2xl font-bold text-[var(--text-body)]"
          accessibleTitle="Administración de documentación"
          before="Administración de "
          accent="documentación"
          amplitude={3}
        />
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Crea especificaciones OpenAPI, asigna audiencias y administra el
          acceso de clientes externos.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <article
          className="flex flex-col justify-between rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6"
          style={{ boxShadow: "var(--shadow-1)" }}
        >
          <div>
            <h2 className="text-lg font-bold text-[var(--text-body)]">
              Nueva documentación
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Registra una API nueva en el catálogo, sube o edita su OpenAPI 3.x
              y define quién puede consultarla.
            </p>
          </div>
          <div className="mt-6">
            <Link
              to="/docs/admin/nueva"
              aria-label="Ir a Nueva documentación"
              className="inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-contrast)] transition hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              Nueva documentación
            </Link>
          </div>
        </article>

        <article
          className="flex flex-col justify-between rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6"
          style={{ boxShadow: "var(--shadow-1)" }}
        >
          <div>
            <h2 className="text-lg font-bold text-[var(--text-body)]">
              Clientes
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Da de alta clientes por NIT, genera o reenvía su enlace de
              activación y administra el estado de sus cuentas.
            </p>
          </div>
          <div className="mt-6">
            <Link
              to="/docs/admin/clientes"
              aria-label="Ir a Clientes"
              className="inline-flex items-center justify-center rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-5 py-2.5 text-sm font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              Clientes
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
};
