import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { useAccess } from "@/shared/auth/access-context";
import { SmoothTitleAccent } from "@/shared/ui/smoothui";
import {
  DocsApiError,
  fetchAdminClients,
  resendClientActivation,
  updateAdminClientStatus,
} from "../api/docs-api";
import type { DocsClient, DocsClientStatus } from "../api/types";
import { ClientForm } from "./client-form";

const STATUS_LABEL: Record<DocsClientStatus, string> = {
  pending: "pendiente",
  active: "activo",
  disabled: "deshabilitado",
};

export const ClientsPage = () => {
  const { isSuperAdmin, canPerformAction } = useAccess();
  const canManage = isSuperAdmin || canPerformAction("docs", "manage");

  const [clients, setClients] = useState<DocsClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activationUrl, setActivationUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAdminClients();
      setClients(list);
    } catch (err) {
      setError(
        err instanceof DocsApiError
          ? err.message
          : "No fue posible cargar los clientes.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) {
      void loadClients();
    }
  }, [canManage, loadClients]);

  if (!canManage) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-sm text-[var(--text-body)]" role="alert">
          No tienes permisos para administrar clientes.
        </p>
      </div>
    );
  }

  const handleCreated = (created: DocsClient) => {
    setStatusMessage(
      "Se envió el enlace para que el cliente cree su contraseña.",
    );
    setActivationUrl(created.activationUrl ?? null);
    setCopied(false);
    void loadClients();
  };

  const handleResend = async (client: DocsClient) => {
    setError(null);
    setStatusMessage(null);
    setCopied(false);
    try {
      const res = await resendClientActivation(client.id);
      setStatusMessage(
        "Se envió el enlace para que el cliente cree su contraseña.",
      );
      setActivationUrl(res.activationUrl ?? null);
      void loadClients();
    } catch (err) {
      setError(
        err instanceof DocsApiError
          ? err.message
          : "No fue posible reenviar el enlace de activación.",
      );
    }
  };

  const handleToggleStatus = async (client: DocsClient) => {
    setError(null);
    const nextStatus = client.status === "disabled" ? "active" : "disabled";
    try {
      await updateAdminClientStatus(client.id, nextStatus);
      await loadClients();
    } catch (err) {
      setError(
        err instanceof DocsApiError
          ? err.message
          : "No fue posible cambiar el estado del cliente.",
      );
    }
  };

  const handleCopyUrl = async () => {
    if (!activationUrl) return;
    try {
      await navigator.clipboard.writeText(activationUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-4 text-sm">
        <Link
          to="/docs"
          className="font-medium text-[var(--color-primary)] hover:underline"
        >
          Catálogo
        </Link>
        <span className="text-[var(--text-muted)]">/</span>
        <Link
          to="/docs/admin"
          className="font-medium text-[var(--color-primary)] hover:underline"
        >
          Administrar
        </Link>
      </div>

      <header className="mb-6">
        <SmoothTitleAccent
          as="h1"
          className="text-2xl font-bold text-[var(--text-body)]"
          accessibleTitle="Clientes de documentación"
          before="Clientes de "
          accent="documentación"
          amplitude={3}
        />
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Crea cuentas de cliente por NIT y gestiona el envío del enlace de
          activación de contraseña.
        </p>
      </header>

      <ClientForm onCreated={handleCreated} />

      {statusMessage ? (
        <div
          className="mt-6 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4"
          role="status"
        >
          <p className="text-sm font-medium text-[var(--text-body)]">
            {statusMessage}
          </p>
          {activationUrl ? (
            <div className="mt-3">
              <p className="text-xs text-[var(--text-muted)]">
                En local no hay SMTP; copia el enlace, ábrelo y pulsa Entrar
                (dev). El token del query solo identifica el cliente en humo
                local:
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <code className="break-all rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-1.5 font-mono text-xs text-[var(--text-body)]">
                  {activationUrl}
                </code>
                <button
                  type="button"
                  onClick={() => void handleCopyUrl()}
                  className="rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-body)] hover:border-[var(--color-primary)]"
                >
                  {copied ? "Copiado" : "Copiar enlace"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p
          className="mt-6 rounded-[var(--radius-1)] bg-[var(--alert-error-bg)] px-3 py-2 text-sm text-[var(--state-error)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section className="mt-8" aria-labelledby="clients-list-heading">
        <h2
          id="clients-list-heading"
          className="mb-3 text-base font-bold text-[var(--text-body)]"
        >
          Clientes registrados
        </h2>

        {loading ? (
          <div
            className="h-32 animate-pulse rounded-[var(--radius-3)] bg-[var(--surface-sunken)]"
            aria-busy="true"
          />
        ) : clients.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Aún no hay clientes registrados.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-xs uppercase text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3">NIT</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-body)]">
                      {client.id}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--text-body)]">
                      {client.name}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {client.email}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-body)]">
                        {STATUS_LABEL[client.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void handleResend(client)}
                          className="rounded-[var(--radius-1)] border border-[var(--border-default)] px-2.5 py-1 text-xs font-medium text-[var(--text-body)] hover:border-[var(--color-primary)]"
                        >
                          Reenviar link de activación
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleStatus(client)}
                          className="rounded-[var(--radius-1)] border border-[var(--border-default)] px-2.5 py-1 text-xs font-medium text-[var(--text-body)] hover:border-[var(--color-primary)]"
                        >
                          {client.status === "disabled"
                            ? "Habilitar"
                            : "Deshabilitar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
