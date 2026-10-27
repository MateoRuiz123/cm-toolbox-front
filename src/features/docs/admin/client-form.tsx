import { useState, type FormEvent } from "react";
import { createAdminClient, DocsApiError } from "../api/docs-api";
import type { DocsClient } from "../api/types";

type ClientFormProps = {
  readonly onCreated: (client: DocsClient) => void;
};

export const ClientForm = ({ onCreated }: ClientFormProps) => {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!id.trim() || !name.trim() || !email.trim()) {
      setError("NIT, nombre y correo son obligatorios.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createAdminClient({
        id: id.trim(),
        name: name.trim(),
        email: email.trim(),
      });
      setId("");
      setName("");
      setEmail("");
      onCreated(created);
    } catch (err) {
      setError(
        err instanceof DocsApiError
          ? err.message
          : "No fue posible crear el cliente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6"
      style={{ boxShadow: "var(--shadow-1)" }}
      aria-labelledby="create-client-heading"
    >
      <h2
        id="create-client-heading"
        className="text-base font-bold text-[var(--text-body)]"
      >
        Alta de cliente
      </h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Un cliente equivale a un NIT (username de login) y a la audiencia{" "}
        <code className="font-mono">client:&lt;nit&gt;</code>.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="client-nit"
            className="block text-xs font-semibold text-[var(--text-body)]"
          >
            NIT
          </label>
          <input
            id="client-nit"
            type="text"
            required
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="900123456"
            className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          />
        </div>

        <div>
          <label
            htmlFor="client-name"
            className="block text-xs font-semibold text-[var(--text-body)]"
          >
            Nombre
          </label>
          <input
            id="client-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cliente Demo"
            className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          />
        </div>

        <div>
          <label
            htmlFor="client-email"
            className="block text-xs font-semibold text-[var(--text-body)]"
          >
            Correo
          </label>
          <input
            id="client-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="integraciones@cliente.com"
            className="mt-1 w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          />
        </div>
      </div>

      {error ? (
        <p
          className="mt-3 rounded-[var(--radius-1)] bg-[var(--alert-error-bg)] px-3 py-2 text-sm text-[var(--state-error)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-[var(--color-primary-contrast)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {submitting ? "Creando…" : "Crear y enviar activación"}
        </button>
      </div>
    </form>
  );
};
