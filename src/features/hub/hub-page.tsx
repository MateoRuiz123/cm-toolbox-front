import { SmoothLinkScramble, SmoothTitleAccent } from "@/shared/ui/smoothui";
import { useAccess } from "../../shared/auth/access-context";
import type { AppIconType, AppStatus } from "../../shared/auth/access-types";
import { useTheme } from "../../app/theme-context";
import { FolderComponent } from "./folder-component";

interface AppCardProps {
  readonly titulo: string;
  readonly descripcion: string;
  readonly ruta?: string;
  readonly status: AppStatus;
  readonly canAccess: boolean;
  readonly tags: readonly string[];
  readonly icono: AppIconType;
}

const renderIcono = (tipo: AppCardProps["icono"]) => {
  if (tipo === "diagnostico") {
    return (
      <svg
        className="size-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    );
  }

  if (tipo === "pubsub") {
    return (
      <svg
        className="size-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    );
  }

  if (tipo === "docs") {
    return (
      <svg
        className="size-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    );
  }

  return (
    <svg
      className="size-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
};

const HubArrowIcon = (
  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M14 5l7 7m0 0l-7 7m7-7H3"
    />
  </svg>
);

const AppCard = ({
  titulo,
  descripcion,
  ruta,
  status,
  canAccess,
  tags,
  icono,
}: AppCardProps) => {
  const disponible = canAccess && Boolean(ruta) && status !== "disabled";
  const isMaintenance = status === "maintenance";
  const isRestricted = status === "active" && !canAccess;
  const { sistema } = useTheme();
  const esVisitors = sistema === "visitors";

  const obtenerBadgeLabel = () => {
    if (status === "disabled") return "Próximamente";
    if (isMaintenance && canAccess) return "Mantenimiento (administrador)";
    if (isMaintenance) return "En mantenimiento";
    if (isRestricted) return "Acceso restringido";
    return "Disponible";
  };

  const obtenerBadgeClass = () => {
    if (status === "disabled") {
      return "border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-muted)]";
    }
    if (isMaintenance) {
      return "border border-[var(--state-warning)]/30 bg-[var(--alert-warning-bg)] text-[var(--state-warning)]";
    }
    if (isRestricted) {
      return "border border-[var(--state-error)]/30 bg-[var(--alert-error-bg)] text-[var(--state-error)]";
    }
    return "border border-[var(--state-success)]/30 bg-[var(--alert-success-bg)] text-[var(--state-success)]";
  };

  const obtenerCtaDeshabilitadoLabel = () => {
    if (status === "disabled") return "En construcción";
    if (isMaintenance) return "En mantenimiento";
    return "Permiso requerido";
  };

  return (
    <div
      style={esVisitors ? undefined : { boxShadow: "var(--shadow-1)" }}
      className={`surface group relative flex flex-col justify-between rounded-[var(--radius-3)] border p-6 transition-all duration-200 ${
        disponible
          ? esVisitors
            ? "border-[var(--border-default)]"
            : "border-[var(--border-default)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-4)]"
          : "border-[var(--border-default)] opacity-75 border-dashed bg-[var(--surface-sunken)]/50"
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div
            className={`grid place-items-center ${
              esVisitors
                ? "size-10 rounded-full"
                : "size-12 rounded-[var(--radius-2)]"
            } ${
              disponible
                ? "bg-[var(--color-action)] text-[var(--color-action-contrast)] shadow-xs"
                : "bg-[var(--border-default)] text-[var(--text-muted)]"
            }`}
          >
            {renderIcono(icono)}
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${obtenerBadgeClass()}`}
          >
            {obtenerBadgeLabel()}
          </span>
        </div>

        <h3 className="text-lg font-bold text-[var(--text-body)] tracking-tight mb-2 group-hover:text-[var(--color-primary)] transition-colors">
          {titulo}
        </h3>
        <p className="text-sm leading-relaxed text-[var(--text-muted)] mb-5">
          {descripcion}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-6">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-[var(--border-default)]">
        {disponible && ruta ? (
          /^https?:\/\//i.test(ruta) ? (
            <a
              href={ruta}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2.5 text-sm font-semibold text-[var(--color-action-contrast)] shadow-xs transition hover:bg-[var(--color-action-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <span>Abrir herramienta</span>
              {HubArrowIcon}
            </a>
          ) : (
            <SmoothLinkScramble
              to={ruta}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2.5 text-sm font-semibold text-[var(--color-action-contrast)] shadow-xs transition hover:bg-[var(--color-action-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              accessibleLabel="Abrir herramienta"
              before="Abrir "
              scrambleText="herramienta"
              trailing={HubArrowIcon}
            />
          )
        ) : (
          <button
            type="button"
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-4 py-2.5 text-sm font-semibold text-[var(--text-disabled)] cursor-not-allowed"
          >
            <span>{obtenerCtaDeshabilitadoLabel()}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export const HubPage = () => {
  const { apps, loadingAccess } = useAccess();
  const { sistema } = useTheme();
  const esVisitors = sistema === "visitors";
  const esGlass = sistema === "glass";
  /** Solo SIGO usa marco de tarjeta en el hero; Visitors/Glass van abiertos. */
  const heroConMarco = sistema === "sigo";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div
        className={
          heroConMarco
            ? "mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6 sm:p-10 shadow-xs"
            : esGlass
              ? "mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8"
              : "mb-10"
        }
      >
        <div
          className={
            esVisitors
              ? "mx-auto max-w-2xl text-center"
              : "max-w-xl text-center md:text-left"
          }
        >
          <div
            className={`inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] px-3 py-1 mb-3 ${
              esVisitors
                ? "bg-[var(--surface-card)] text-sm font-medium text-[var(--text-body)]"
                : "bg-[var(--surface-sunken)] text-xs font-medium text-[var(--text-muted)]"
            }`}
          >
            <span className="size-2 rounded-full bg-[var(--state-success)]" />
            <span>Ecosistema de Herramientas CM</span>
          </div>
          <SmoothTitleAccent
            as="h1"
            className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-body)] mb-3"
            accessibleTitle="Portal de Aplicaciones de Apoyo"
            before="Portal de Aplicaciones de "
            accent="Apoyo"
            amplitude={4}
          />
          <p className="text-sm sm:text-base leading-relaxed text-[var(--text-muted)] mb-6">
            Accede desde un solo lugar a herramientas operativas, utilitarios de
            diagnóstico, monitoreo y soporte técnico para los equipos de
            Coordinadora.
          </p>
          <div
            className={`flex flex-wrap items-center justify-center gap-3 ${
              esVisitors ? "" : "md:justify-start"
            }`}
          >
            <a
              href="#herramientas"
              className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-action)] px-5 py-2.5 text-sm font-semibold text-[var(--color-action-contrast)] shadow-xs transition hover:bg-[var(--color-action-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <span>Ver herramientas</span>
              {HubArrowIcon}
            </a>
            <SmoothLinkScramble
              to="/contacto"
              className={
                esVisitors
                  ? "inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-transparent px-5 py-2.5 text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--text-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  : "inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-5 py-2.5 text-sm font-semibold text-[var(--text-body)] transition hover:bg-[var(--border-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              }
              accessibleLabel="Contacto y Soporte"
              before="Contacto y "
              scrambleText="Soporte"
            />
          </div>
        </div>

        {!esVisitors && (
          <div className="hidden md:flex shrink-0 items-center justify-center py-4">
            <FolderComponent size="sm" color="blue" />
          </div>
        )}
      </div>

      {esVisitors && (
        <div
          className="mb-16 flex items-center justify-center rounded-[var(--radius-3)] px-6 py-12"
          style={{ background: "var(--visitors-hero-gradient)" }}
        >
          <FolderComponent size="sm" color="blue" />
        </div>
      )}

      <div
        id="herramientas"
        className="grid scroll-mt-24 grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {loadingAccess ? (
          <div
            className="col-span-full flex min-h-[20vh] items-center justify-center text-sm text-[var(--text-muted)]"
            aria-busy="true"
            aria-live="polite"
          >
            Cargando herramientas…
          </div>
        ) : (
          apps
            .filter((app) => app.status !== "hidden")
            .map((app) => (
              <AppCard
                key={app.id}
                titulo={app.name}
                descripcion={app.description}
                ruta={app.route}
                status={app.status}
                canAccess={app.canAccess}
                tags={app.tags}
                icono={app.icon}
              />
            ))
        )}
      </div>
    </div>
  );
};
