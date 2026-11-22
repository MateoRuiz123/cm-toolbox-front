import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import type { EffectiveAppAccess } from "../../shared/auth/access-types";
import { useMovimientoReducido } from "../../shared/lib/use-movimiento-reducido";
import { AppIcon } from "../../shared/ui/app-icon";
import { leerConsultaSesion } from "../diagnostico/consulta-sesion";
import { leerLogsRecientes } from "../logs/logs-sesion";
import type { AppHealthResult, IncidentReportResponse } from "./api/apps-health";
import { HubArrowIcon, type UnavailableReason } from "./bento-app-card";
import { HubAmbientBackground } from "./hub-ambient-background";
import { resolveHubAmbientTheme } from "./hub-ambient-config";
import type { HubSortMode } from "./hub-layout-storage";

export interface HubPs5StageProps {
  readonly apps: readonly EffectiveAppAccess[];
  readonly sortMode: HubSortMode;
  readonly onChangeSortMode: (mode: HubSortMode) => void;
  readonly usageCounts: Readonly<Record<string, number>>;
  readonly healthByAppId: Readonly<Record<string, AppHealthResult>>;
  readonly isCheckingHealth: boolean;
  readonly onRefreshHealth: () => void;
  readonly unhealthyApps: readonly EffectiveAppAccess[];
  readonly reportError: string | null;
  readonly reportedTickets: Readonly<Record<string, IncidentReportResponse>>;
  readonly reportingAppId: string | null;
  readonly editorFeedback: {
    readonly type: "success" | "error";
    readonly text: string;
  } | null;
  readonly userEmail?: string;
  readonly onOpenApp: (app: EffectiveAppAccess) => void;
  readonly onClickUnavailable: (
    app: EffectiveAppAccess,
    reason: UnavailableReason,
  ) => void;
  readonly onQuickReport: (
    app: EffectiveAppAccess,
    detectedState: string,
  ) => void;
}

const HEALTH_LABEL: Readonly<
  Record<AppHealthResult["state"], { readonly label: string; readonly dot: string }>
> = {
  online: { label: "Operativa", dot: "bg-[var(--state-success)]" },
  degraded: { label: "Degradada", dot: "bg-[var(--state-warning)]" },
  offline: { label: "Fuera de línea", dot: "bg-[var(--state-error)]" },
  unmonitored: { label: "Activa", dot: "bg-[var(--state-success)]" },
};

const isExternalRoute = (route: string): boolean => /^https?:\/\//i.test(route);

const resolveResumeContext = (
  appId: string,
  userEmail?: string,
): { readonly label: string } | null => {
  if (appId === "diagnostico") {
    const sesion = leerConsultaSesion();
    const raw = `${sesion.remisiones} ${sesion.despachos}`.trim();
    if (!raw) return null;
    const firstCode = raw
      .split(/[\s,;]+/)
      .map((item) => item.trim())
      .find(Boolean);
    return firstCode ? { label: `Continuar consulta: ${firstCode}` } : null;
  }

  if (appId === "logs") {
    const recientes = leerLogsRecientes(userEmail);
    const latest = recientes[0];
    return latest?.workloadName
      ? { label: `Último log: ${latest.workloadName} (${latest.env})` }
      : null;
  }

  return null;
};

const resolveAppStatusSummary = (
  app: EffectiveAppAccess,
  health?: AppHealthResult,
): {
  readonly eyebrowStatus: string;
  readonly healthLabel: string;
  readonly dotClass: string;
  readonly unavailableReason: UnavailableReason | null;
} => {
  if (app.status === "disabled") {
    return {
      eyebrowStatus: "Próximamente",
      healthLabel: "En construcción",
      dotClass: "bg-[var(--text-muted)]",
      unavailableReason: null,
    };
  }
  if (!app.canAccess) {
    return {
      eyebrowStatus: "Sin permiso",
      healthLabel: "Acceso restringido",
      dotClass: "bg-[var(--state-warning)]",
      unavailableReason: null,
    };
  }
  if (app.status === "maintenance") {
    return {
      eyebrowStatus: "Mantenimiento",
      healthLabel: "En mantenimiento",
      dotClass: "bg-[var(--state-warning)]",
      unavailableReason: "maintenance",
    };
  }
  if (health?.state === "offline") {
    return {
      eyebrowStatus: "Fuera de línea",
      healthLabel: HEALTH_LABEL.offline.label,
      dotClass: HEALTH_LABEL.offline.dot,
      unavailableReason: "offline",
    };
  }
  if (health?.state === "degraded") {
    return {
      eyebrowStatus: "Degradada",
      healthLabel: HEALTH_LABEL.degraded.label,
      dotClass: HEALTH_LABEL.degraded.dot,
      unavailableReason: null,
    };
  }
  if (health?.state === "online") {
    return {
      eyebrowStatus: "Activa",
      healthLabel: HEALTH_LABEL.online.label,
      dotClass: HEALTH_LABEL.online.dot,
      unavailableReason: null,
    };
  }
  return {
    eyebrowStatus: "Activa",
    healthLabel: HEALTH_LABEL.unmonitored.label,
    dotClass: HEALTH_LABEL.unmonitored.dot,
    unavailableReason: null,
  };
};

/**
 * Escenario principal estilo consola (referencia PS5) con fondo ambiental crossfade,
 * bloque Spotlight de información y fila horizontal de accesos con navegación por teclado.
 */
export const HubPs5Stage = ({
  apps,
  sortMode,
  onChangeSortMode,
  usageCounts,
  healthByAppId,
  isCheckingHealth,
  onRefreshHealth,
  unhealthyApps,
  reportError,
  reportedTickets,
  reportingAppId,
  editorFeedback,
  userEmail,
  onOpenApp,
  onClickUnavailable,
  onQuickReport,
}: HubPs5StageProps) => {
  const movimientoReducido = useMovimientoReducido();
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [hasSwitchedApp, setHasSwitchedApp] = useState(false);
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const tileRefs = useRef<Record<string, HTMLElement | null>>({});

  const effectiveActiveApp = useMemo(() => {
    if (apps.length === 0) return null;
    if (activeAppId) {
      const found = apps.find((app) => app.id === activeAppId);
      if (found) return found;
    }
    return apps[0];
  }, [apps, activeAppId]);

  const effectiveActiveAppId = effectiveActiveApp?.id ?? null;

  const activateApp = (nextId: string) => {
    if (nextId !== effectiveActiveAppId) {
      setHasSwitchedApp(true);
      setShowStatusPanel(false);
    }
    setActiveAppId(nextId);
  };

  useEffect(() => {
    if (apps.length === 0) return;

    const handleArrowNav = (event: KeyboardEvent) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      event.preventDefault();
      const currentIdx = effectiveActiveAppId
        ? apps.findIndex((item) => item.id === effectiveActiveAppId)
        : 0;
      const safeCurrentIdx = currentIdx === -1 ? 0 : currentIdx;
      const nextIdx =
        (safeCurrentIdx + (event.key === "ArrowRight" ? 1 : -1) + apps.length) %
        apps.length;
      const nextApp = apps[nextIdx];
      if (!nextApp) return;

      setHasSwitchedApp(true);
      setShowStatusPanel(false);
      setActiveAppId(nextApp.id);
      tileRefs.current[nextApp.id]?.focus();
    };

    window.addEventListener("keydown", handleArrowNav);
    return () => window.removeEventListener("keydown", handleArrowNav);
  }, [apps, effectiveActiveAppId]);

  const activeTheme = useMemo(
    () => (effectiveActiveApp ? resolveHubAmbientTheme(effectiveActiveApp) : null),
    [effectiveActiveApp],
  );

  const activeHealth = effectiveActiveApp
    ? healthByAppId[effectiveActiveApp.id]
    : undefined;

  const activeStatus = effectiveActiveApp
    ? resolveAppStatusSummary(effectiveActiveApp, activeHealth)
    : null;

  const activeResumeContext = effectiveActiveApp
    ? resolveResumeContext(effectiveActiveApp.id, userEmail)
    : null;

  const activeUsageCount = effectiveActiveApp
    ? (usageCounts[effectiveActiveApp.id] ?? 0)
    : 0;

  const activeTicket = effectiveActiveApp
    ? reportedTickets[effectiveActiveApp.id]
    : undefined;

  const primaryIncident = unhealthyApps[0];

  const handleSelectSort = (nextMode: HubSortMode) => {
    setActiveAppId(null);
    setHasSwitchedApp(false);
    setShowStatusPanel(false);
    onChangeSortMode(nextMode);
  };

  const renderPrimaryAction = (app: EffectiveAppAccess) => {
    if (!app.canAccess) {
      return (
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-5 py-2.5 text-sm font-semibold text-[var(--text-muted)]"
        >
          Permiso requerido
        </button>
      );
    }

    if (app.status === "disabled") {
      return (
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-5 py-2.5 text-sm font-semibold text-[var(--text-muted)]"
        >
          Próximamente &bull; En construcción
        </button>
      );
    }

    if (activeStatus?.unavailableReason) {
      const reason = activeStatus.unavailableReason;
      return (
        <button
          type="button"
          aria-disabled="true"
          aria-label={`Abrir herramienta (${app.name} ${
            reason === "maintenance" ? "en mantenimiento" : "fuera de línea"
          })`}
          onClick={() => onClickUnavailable(app, reason)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--state-warning)]/40 bg-[var(--alert-warning-bg)] px-6 py-2.5 text-sm font-bold text-[var(--alert-warning-fg)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          <span>Abrir herramienta</span>
          <HubArrowIcon />
        </button>
      );
    }

    const ctaClass =
      "inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-6 py-2.5 text-sm font-bold text-[var(--color-primary-on)] shadow-sm transition hover:bg-[var(--azul-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]";

    if (isExternalRoute(app.route)) {
      return (
        <a
          href={app.route}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onOpenApp(app)}
          className={ctaClass}
        >
          <span>Abrir herramienta</span>
          <HubArrowIcon />
        </a>
      );
    }

    return (
      <Link to={app.route} onClick={() => onOpenApp(app)} className={ctaClass}>
        <span>Abrir herramienta</span>
        <HubArrowIcon />
      </Link>
    );
  };

  return (
    <div className="relative min-h-[calc(100vh-4.5rem)]">
      <HubAmbientBackground apps={apps} activeAppId={effectiveActiveAppId} />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-7xl flex-col justify-between px-4 pt-6 pb-8 sm:px-10 sm:pt-8 sm:pb-10">
        <h1 className="sr-only">Portal de Aplicaciones de Apoyo</h1>

        {/* Barra superior estilo consola: tabs de orden + utilidades del portal */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="group"
            aria-label="Orden de herramientas"
            className="flex flex-wrap items-center gap-6"
          >
            <button
              type="button"
              aria-pressed={sortMode === "portal"}
              onClick={() => handleSelectSort("portal")}
              className={`relative cursor-pointer pb-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                sortMode === "portal"
                  ? "text-[var(--text-body)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-body)]"
              }`}
            >
              Orden del portal
              {sortMode === "portal" && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--text-body)]" />
              )}
            </button>

            <button
              type="button"
              aria-pressed={sortMode === "most_used"}
              onClick={() => handleSelectSort("most_used")}
              className={`relative cursor-pointer pb-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                sortMode === "most_used"
                  ? "text-[var(--text-body)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-body)]"
              }`}
            >
              Más usadas
              {sortMode === "most_used" && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--text-body)]" />
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onRefreshHealth}
              disabled={isCheckingHealth}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)]/75 px-3.5 py-1.5 text-xs font-semibold text-[var(--text-body)] backdrop-blur-md transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <span
                className={`size-2 rounded-full ${
                  isCheckingHealth
                    ? "animate-ping bg-[var(--state-warning)]"
                    : "bg-[var(--state-success)]"
                }`}
              />
              <span>
                {isCheckingHealth ? "Verificando..." : "Verificar salud"}
              </span>
            </button>
          </div>
        </div>

        {(editorFeedback || reportError || primaryIncident) && (
          <div className="mt-4 flex flex-col gap-2">
            {editorFeedback && (
              <div
                role="status"
                className={`w-fit rounded-[var(--radius-pill)] border px-4 py-1.5 text-xs font-medium backdrop-blur-md ${
                  editorFeedback.type === "success"
                    ? "border-[var(--state-success)]/40 bg-[var(--alert-success-bg)] text-[var(--alert-success-fg)]"
                    : "border-[var(--state-error)]/40 bg-[var(--alert-error-bg)] text-[var(--alert-error-fg)]"
                }`}
              >
                {editorFeedback.text}
              </div>
            )}

            {reportError && (
              <div
                role="alert"
                className="w-fit rounded-[var(--radius-pill)] border border-[var(--state-error)]/40 bg-[var(--alert-error-bg)] px-4 py-1.5 text-xs font-medium text-[var(--alert-error-fg)] backdrop-blur-md"
              >
                {reportError}
              </div>
            )}

            {primaryIncident && (
              <div className="flex w-fit flex-wrap items-center gap-3 rounded-[var(--radius-pill)] border border-[var(--state-warning)]/40 bg-[var(--alert-warning-bg)]/90 px-4 py-1.5 text-xs text-[var(--alert-warning-fg)] backdrop-blur-md">
                <span className="font-semibold">
                  Incidencia detectada:{" "}
                  {unhealthyApps.map((item) => item.name).join(", ")}
                </span>
                {reportedTickets[primaryIncident.id] ? (
                  <span className="font-bold">
                    Ticket {reportedTickets[primaryIncident.id].ticketId}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={reportingAppId === primaryIncident.id}
                    onClick={() =>
                      onQuickReport(
                        primaryIncident,
                        primaryIncident.status === "maintenance"
                          ? "maintenance"
                          : (healthByAppId[primaryIncident.id]?.state ?? "offline"),
                      )
                    }
                    className="cursor-pointer font-bold underline hover:opacity-80 disabled:cursor-wait disabled:opacity-60"
                  >
                    {reportingAppId === primaryIncident.id
                      ? "Enviando reporte..."
                      : `Reportar ${primaryIncident.name}`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bloque Spotlight central izquierdo (.info de referencia PS5) */}
        <section
          aria-label="Detalle de herramienta seleccionada"
          data-testid="hub-ps5-spotlight"
          aria-live="polite"
          className="my-auto pt-8 pb-6 sm:pt-12 sm:pb-8"
        >
          {effectiveActiveApp && activeTheme && activeStatus ? (
            <motion.div
              key={effectiveActiveApp.id}
              initial={
                !hasSwitchedApp || movimientoReducido
                  ? false
                  : { opacity: 0.2, y: 10 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={
                movimientoReducido
                  ? { duration: 0 }
                  : { duration: 0.24, ease: "easeOut" }
              }
              className="max-w-xl"
            >
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                <span>{activeTheme.categoryLabel}</span>
                <span aria-hidden="true">&bull;</span>
                <span>{activeStatus.eyebrowStatus}</span>
                {activeTheme.spotlightLabel &&
                  activeTheme.spotlightLabel !== effectiveActiveApp.name && (
                    <>
                      <span aria-hidden="true">&bull;</span>
                      <span className="normal-case tracking-normal font-medium">
                        {activeTheme.spotlightLabel}
                      </span>
                    </>
                  )}
              </div>

              <h2 className="mt-2.5 text-3xl font-extrabold tracking-tight text-[var(--text-body)] sm:text-5xl">
                {effectiveActiveApp.name}
              </h2>

              <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
                {effectiveActiveApp.description}
              </p>

              {(activeResumeContext || effectiveActiveApp.tags.length > 0) && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {activeResumeContext && (
                    <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--color-primary)]/35 bg-[var(--color-primary-soft)]/90 px-3 py-1 text-xs font-semibold text-[var(--color-primary)] backdrop-blur-sm">
                      <span className="size-1.5 rounded-full bg-[var(--color-primary)]" />
                      {activeResumeContext.label}
                    </span>
                  )}
                  {effectiveActiveApp.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)]/70 px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)] backdrop-blur-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {renderPrimaryAction(effectiveActiveApp)}

                <button
                  type="button"
                  aria-expanded={showStatusPanel}
                  onClick={() => setShowStatusPanel((prev) => !prev)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)]/75 px-5 py-2.5 text-sm font-semibold text-[var(--text-body)] backdrop-blur-md transition hover:border-[var(--color-primary)] hover:bg-[var(--surface-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  <span className={`size-2 rounded-full ${activeStatus.dotClass}`} />
                  <span>{showStatusPanel ? "Ocultar estado" : "Ver estado"}</span>
                </button>
              </div>

              {showStatusPanel && (
                <div
                  data-testid="hub-ps5-status-panel"
                  className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)]/90 px-4 py-3 text-xs shadow-sm backdrop-blur-md"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 font-bold text-[var(--text-body)]">
                      <span className={`size-2 rounded-full ${activeStatus.dotClass}`} />
                      {activeStatus.healthLabel}
                    </span>
                    {typeof activeHealth?.latencyMs === "number" && (
                      <span className="tabular-nums text-[var(--text-muted)]">
                        Latencia: {activeHealth.latencyMs}ms
                      </span>
                    )}
                    <span className="tabular-nums text-[var(--text-muted)]">
                      {activeUsageCount} {activeUsageCount === 1 ? "acceso" : "accesos"}
                    </span>
                  </div>

                  {activeStatus.unavailableReason || activeHealth?.state === "degraded" ? (
                    activeTicket ? (
                      <span className="font-bold text-[var(--alert-success-fg)]">
                        Ticket {activeTicket.ticketId} enviado
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={reportingAppId === effectiveActiveApp.id}
                        onClick={() =>
                          onQuickReport(
                            effectiveActiveApp,
                            activeStatus.unavailableReason ?? "degraded",
                          )
                        }
                        className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--state-warning)]/40 bg-[var(--alert-warning-bg)] px-3 py-1 font-bold text-[var(--alert-warning-fg)] transition hover:opacity-85 disabled:cursor-wait disabled:opacity-60"
                      >
                        {reportingAppId === effectiveActiveApp.id
                          ? "Reportando..."
                          : "Reportar incidente"}
                      </button>
                    )
                  ) : null}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)]/85 p-6 text-sm text-[var(--text-muted)]">
              No tienes herramientas asignadas en tu perfil.
            </div>
          )}
        </section>

        {/* Fila inferior horizontal de tarjetas rectangulares anchas (.row de referencia PS5) */}
        <div className="pt-2">
          <section
            aria-label="Herramientas del portal"
            data-testid="hub-ps5-dock"
            className="-mx-4 flex items-center gap-4 overflow-x-auto px-6 py-5 sm:-mx-6 sm:gap-5 sm:px-8"
          >
            {apps.map((app) => {
              const tileTheme = resolveHubAmbientTheme(app);
              const isActive = effectiveActiveAppId === app.id;
              const isDisabledState = app.status === "disabled" || !app.canAccess;
              const appHealth = healthByAppId[app.id];
              const appStatus = resolveAppStatusSummary(app, appHealth);

              const motionTransition = movimientoReducido
                ? "transition-none"
                : "transition-[transform,opacity,box-shadow,filter] duration-300 ease-out";

              const tileClassName = `relative flex h-28 w-40 shrink-0 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[22px] px-3.5 text-center outline-none sm:h-32 sm:w-48 sm:px-4 ${motionTransition} focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-app)] ${
                isActive
                  ? "z-10 scale-[1.06] sm:scale-[1.1] opacity-100 ring-2 ring-[var(--color-primary)] dark:ring-[var(--text-body)] ring-offset-2 ring-offset-[var(--surface-app)]"
                  : "scale-100 opacity-70 hover:scale-[1.03] hover:opacity-90"
              } ${isDisabledState ? "grayscale-[25%]" : ""}`;

              const tileStyle = {
                backgroundImage: tileTheme.tileGradient,
                boxShadow: "var(--elevation-card)",
              };

              const commonHandlers = {
                "data-testid": `hub-ps5-tile-${app.id}`,
                "data-app-id": app.id,
                "data-active": isActive ? "true" : "false",
                "data-ambient-state": isActive ? "active" : "dimmed",
                onPointerEnter: () => activateApp(app.id),
                onFocus: () => activateApp(app.id),
                className: tileClassName,
                style: tileStyle,
                ref: (el: HTMLElement | null) => {
                  tileRefs.current[app.id] = el;
                },
              };

              const tileInner = (
                <>
                  <span className="flex items-center justify-center text-[var(--surface-card)] dark:text-[var(--text-body)]">
                    <AppIcon
                      icon={app.icon}
                      appId={app.id}
                      className="size-8 sm:size-9"
                    />
                  </span>

                  {(appStatus.unavailableReason || app.status === "disabled") && (
                    <span
                      aria-hidden="true"
                      className={`absolute top-2.5 right-2.5 size-2.5 rounded-full ring-2 ring-[var(--surface-card)]/60 ${appStatus.dotClass}`}
                    />
                  )}

                  {app.status === "disabled" && (
                    <span className="sr-only">Próximamente — En construcción</span>
                  )}

                  <span className="line-clamp-2 text-xs font-bold leading-snug tracking-tight text-[var(--surface-card)] dark:text-[var(--text-body)] sm:text-[13px]">
                    {app.name}
                  </span>
                </>
              );

              if (!app.canAccess || app.status === "disabled") {
                return (
                  <button
                    key={app.id}
                    type="button"
                    aria-label={app.name}
                    onClick={() => activateApp(app.id)}
                    {...commonHandlers}
                  >
                    {tileInner}
                  </button>
                );
              }

              if (appStatus.unavailableReason) {
                const reason = appStatus.unavailableReason;
                return (
                  <button
                    key={app.id}
                    type="button"
                    aria-label={app.name}
                    onClick={() => {
                      activateApp(app.id);
                      onClickUnavailable(app, reason);
                    }}
                    {...commonHandlers}
                  >
                    {tileInner}
                  </button>
                );
              }

              if (isExternalRoute(app.route)) {
                return (
                  <a
                    key={app.id}
                    href={app.route}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={app.name}
                    onClick={() => onOpenApp(app)}
                    {...commonHandlers}
                  >
                    {tileInner}
                  </a>
                );
              }

              return (
                <Link
                  key={app.id}
                  to={app.route}
                  aria-label={app.name}
                  onClick={() => onOpenApp(app)}
                  {...commonHandlers}
                >
                  {tileInner}
                </Link>
              );
            })}
          </section>

          <p className="mt-1 text-right text-[11px] font-medium text-[var(--text-muted)]">
            Pasa el cursor, o usa &larr; &rarr; para cambiar de herramienta
          </p>
        </div>
      </div>
    </div>
  );
};
