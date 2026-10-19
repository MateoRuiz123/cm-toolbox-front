import { Link } from "react-router";
import { SmoothTitleAccent } from "@/shared/ui/smoothui";

export const ThankYouPage = () => {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-center justify-center px-4 py-12 text-center sm:px-6">
      <div className="mb-6 grid size-16 place-items-center rounded-full bg-[var(--alert-success-bg)] text-[var(--state-success)] shadow-xs animate-modal-dialog">
        <svg
          className="size-8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1 text-xs font-semibold text-[var(--state-success)] shadow-2xs">
        <span>Radicado Satisfactoriamente</span>
      </div>

      <SmoothTitleAccent
        as="h1"
        className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-body)] mb-3"
        accessibleTitle="¡Mensaje Enviado con Éxito!"
        before="¡Mensaje Enviado con "
        accent="Éxito"
        after="!"
        amplitude={3}
      />

      <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-lg mb-8">
        Hemos recibido tu consulta o reporte técnico. El equipo responsable de
        las plataformas internas de Coordinadora Mercantil revisará tu
        requerimiento a la mayor brevedad.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-action)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-[var(--color-action-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <span>Volver al Portal</span>
        </Link>

        <Link
          to="/contacto"
          className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-body)] transition hover:bg-[var(--border-default)]"
        >
          <span>Enviar otra consulta</span>
        </Link>
      </div>
    </div>
  );
};
