import { Link } from "react-router";

const CURRENT_YEAR = new Date().getFullYear();

export const AppFooter = () => {

  return (
    <footer className="relative z-10 mt-16 border-t border-[var(--border-default)] bg-[var(--surface-header)] text-xs text-[var(--text-muted)] transition-colors">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-[var(--text-body)]">
                Coordinadora Mercantil S.A.
              </span>
              <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary)]">
                Toolbox Interno
              </span>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-[var(--text-muted)]">
              Sede Principal: Calle 30A # 6-38, Medellín &bull; PBX: +57 (604)
              310 3100 &bull; NIT: 890.901.050-1
            </p>
          </div>

          <nav
            aria-label="Enlaces institucionales y legales"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs"
          >
            <Link
              to="/"
              className="transition hover:text-[var(--color-primary)] hover:underline"
            >
              Inicio
            </Link>
            <Link
              to="/diagnostico"
              className="transition hover:text-[var(--color-primary)] hover:underline"
            >
              Diagnóstico
            </Link>
            <Link
              to="/privacidad"
              className="transition hover:text-[var(--color-primary)] hover:underline"
            >
              Privacidad
            </Link>
            <Link
              to="/terminos"
              className="transition hover:text-[var(--color-primary)] hover:underline"
            >
              Términos
            </Link>
            <Link
              to="/contacto"
              className="transition hover:text-[var(--color-primary)] hover:underline"
            >
              Contacto
            </Link>
          </nav>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-[var(--border-default)] pt-6 sm:flex-row">
          <p className="text-[11px] text-[var(--text-muted)]">
            &copy; {CURRENT_YEAR} Coordinadora Mercantil S.A. Todos los derechos
            reservados.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
            <span className="size-1.5 rounded-full bg-[var(--state-success)]" />
            <span>Servicios internos operativos</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
