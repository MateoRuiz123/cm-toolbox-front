import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { SmoothTitleAccent } from "@/shared/ui/smoothui";
import { esAuthBypassActivo } from "@/shared/auth/auth-bypass";
import {
  DocsApiError,
  fetchClienteProfile,
  updateClienteProfile,
} from "../docs/api/docs-api";
import type { DocsClient } from "../docs/api/types";
import { resetPasswordCliente } from "./auth/cliente-session";

type ClientePerfilPageProps = {
  readonly onUnauthorized?: () => void;
};

export const ClientePerfilPage = ({
  onUnauthorized,
}: ClientePerfilPageProps) => {
  const [profile, setProfile] = useState<DocsClient | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchClienteProfile(controller.signal)
      .then((data) => {
        setProfile(data);
        setName(data.name);
        setEmail(data.email);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        if (err instanceof DocsApiError && err.status === 401) {
          onUnauthorized?.();
          return;
        }
        setError(
          err instanceof DocsApiError
            ? err.message
            : "No pudimos cargar tu perfil.",
        );
        setLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [onUnauthorized]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!name.trim() || !email.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateClienteProfile({
        name: name.trim(),
        email: email.trim(),
      });
      setProfile(updated);
      setName(updated.name);
      setEmail(updated.email);
      setSuccess("Perfil actualizado.");
      globalThis.dispatchEvent(
        new CustomEvent("cliente-profile-updated", { detail: updated }),
      );
    } catch (err) {
      if (err instanceof DocsApiError && err.status === 401) {
        onUnauthorized?.();
        return;
      }
      setError(
        err instanceof DocsApiError
          ? err.message
          : "No pudimos guardar los cambios del perfil.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-muted)]"
        aria-busy="true"
      >
        Cargando perfil…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <SmoothTitleAccent
        as="h1"
        className="text-xl font-bold text-[var(--text-body)] sm:text-2xl"
        accessibleTitle="Mi perfil"
        before="Mi "
        accent="perfil"
        amplitude={3}
      />
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Actualiza el nombre y el correo asociados a tu acceso de documentación.
      </p>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-8 space-y-4 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6"
        style={{ boxShadow: "var(--shadow-1)" }}
        aria-labelledby="perfil-heading"
      >
        <h2 id="perfil-heading" className="sr-only">
          Datos del perfil
        </h2>

        <div>
          <label
            htmlFor="perfil-id"
            className="block text-xs font-semibold text-[var(--text-body)]"
          >
            Identificador (NIT)
          </label>
          <input
            id="perfil-id"
            type="text"
            readOnly
            value={profile?.id ?? ""}
            className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-muted)]"
          />
        </div>

        <div>
          <label
            htmlFor="perfil-status"
            className="block text-xs font-semibold text-[var(--text-body)]"
          >
            Estado
          </label>
          <input
            id="perfil-status"
            type="text"
            readOnly
            value={profile?.status ?? ""}
            className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-muted)]"
          />
        </div>

        <div>
          <label
            htmlFor="perfil-name"
            className="block text-xs font-semibold text-[var(--text-body)]"
          >
            Nombre
          </label>
          <input
            id="perfil-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          />
        </div>

        <div>
          <label
            htmlFor="perfil-email"
            className="block text-xs font-semibold text-[var(--text-body)]"
          >
            Correo
          </label>
          <input
            id="perfil-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          />
        </div>

        {error ? (
          <p className="text-sm text-[var(--state-error)]" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm text-[var(--state-success)]" role="status">
            {success}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={saving}
            className="rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-action-contrast)] disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
          <Link
            to="/cliente/docs"
            className="text-center text-sm text-[var(--color-primary)] hover:underline"
          >
            Volver a documentación
          </Link>
        </div>
      </form>

      {!esAuthBypassActivo() ? (
        <div className="mt-6">
          <button
            type="button"
            className="text-sm text-[var(--color-primary)] hover:underline"
            onClick={() => {
              void resetPasswordCliente().catch(() => {
                setError("No pudimos abrir el restablecimiento de contraseña.");
              });
            }}
          >
            Restablecer contraseña
          </button>
        </div>
      ) : null}
    </div>
  );
};
