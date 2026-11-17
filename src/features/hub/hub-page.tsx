import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type DragEvent,
} from "react";
import { Link, useNavigate } from "react-router";
import type { EffectiveAppAccess } from "../../shared/auth/access-types";
import { AuthContext } from "../../shared/auth/auth-context-base";
import { useAccess } from "../../shared/auth/use-access";
import { SmoothTitleAccent } from "../../shared/ui/smoothui";
import {
  fetchAppsUsageRanking,
  recordAppOpenEvent,
  saveGlobalAppsOrder,
  sendAutomaticIncidentReport,
  type BentoSize,
  type IncidentReportResponse,
} from "./api/apps-health";
import { BentoAppCard, type UnavailableReason } from "./bento-app-card";
import {
  clearCachedBentoSizes,
  computeAutoPackedBentoSizes,
  formatBentoSize,
  readSortModePreference,
  resolveBentoSizes,
  saveCachedBentoSizes,
  saveSortModePreference,
  sortAppsForHub,
  type HubSortMode,
} from "./hub-layout-storage";
import { useAppsHealth } from "./use-apps-health";

import { Skeleton, SkeletonRegion, SkeletonText } from "@/shared/ui/skeleton";

interface UnavailableDialogState {
  readonly app: EffectiveAppAccess;
  readonly reason: UnavailableReason;
}

const HUB_SKELETON_SPANS: readonly string[] = [
  "md:col-span-3 lg:col-span-6",
  "md:col-span-3 lg:col-span-6",
  "md:col-span-2 lg:col-span-4",
  "md:col-span-2 lg:col-span-4",
  "md:col-span-2 lg:col-span-4",
];

const HubSkeletonGrid = () => (
  <SkeletonRegion
    label="Cargando herramientas del portal..."
    className="grid grid-cols-1 gap-6 md:grid-cols-6 lg:grid-cols-12"
  >
    {HUB_SKELETON_SPANS.map((span, index) => (
      <div
        key={index}
        aria-hidden="true"
        className={`flex min-h-52 flex-col justify-between rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6 ${span}`}
      >
        <div>
          <div className="flex items-start justify-between">
            <Skeleton className="size-11 rounded-[var(--radius-2)]" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="mt-5 h-6 w-2/3" />
          <SkeletonText lines={2} className="mt-3" />
          <div className="mt-4 flex gap-1.5">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
        </div>
        <Skeleton className="mt-6 h-9 w-full rounded-full" />
      </div>
    ))}
  </SkeletonRegion>
);

export const HubPage = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const { apps, loadingAccess, isSuperAdmin, refreshAccess } = useAccess();

  const visibleApps = useMemo(
    () => apps.filter((app) => app.status !== "hidden"),
    [apps],
  );

  const { healthByAppId, isCheckingHealth, refreshHealth } = useAppsHealth(
    visibleApps,
    !loadingAccess,
  );

  const [sortMode, setSortMode] = useState<HubSortMode>(() =>
    readSortModePreference(),
  );
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [remoteLayoutMeta, setRemoteLayoutMeta] = useState<Record<
    string,
    BentoSize
  > | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [draftSizes, setDraftSizes] = useState<Record<string, BentoSize>>({});
  const [draggingAppId, setDraggingAppId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [editorFeedback, setEditorFeedback] = useState<{
    readonly type: "success" | "error";
    readonly text: string;
  } | null>(null);

  const [dialogState, setDialogState] = useState<UnavailableDialogState | null>(
    null,
  );
  const [reportingAppId, setReportingAppId] = useState<string | null>(null);
  const [reportedTickets, setReportedTickets] = useState<
    Record<string, IncidentReportResponse>
  >({});
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchAppsUsageRanking().then((data) => {
      if (!active) return;
      setUsageCounts({ ...data.counts });
      if (data.layoutMeta) {
        setRemoteLayoutMeta({ ...data.layoutMeta });
        saveCachedBentoSizes(data.layoutMeta);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!dialogState) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDialogState(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialogState]);

  const portalSortedApps = useMemo(
    () => sortAppsForHub(visibleApps, "portal", usageCounts),
    [visibleApps, usageCounts],
  );

  const displaySortedApps = useMemo(() => {
    if (isEditing && draftOrder.length > 0) {
      const byId = new Map(visibleApps.map((app) => [app.id, app]));
      const ordered = draftOrder
        .map((id) => byId.get(id))
        .filter((item): item is EffectiveAppAccess => Boolean(item));
      const missing = visibleApps.filter((app) => !draftOrder.includes(app.id));
      return [...ordered, ...missing];
    }
    return sortAppsForHub(visibleApps, sortMode, usageCounts);
  }, [isEditing, draftOrder, visibleApps, sortMode, usageCounts]);

  const resolvedSizes = useMemo(() => {
    if (isEditing) {
      return resolveBentoSizes(displaySortedApps, draftSizes);
    }
    return resolveBentoSizes(displaySortedApps, remoteLayoutMeta ?? undefined);
  }, [isEditing, displaySortedApps, draftSizes, remoteLayoutMeta]);

  const unhealthyApps = useMemo(
    () =>
      portalSortedApps.filter((app) => {
        if (app.status === "disabled") return false;
        if (app.status === "maintenance") return true;
        const healthState = healthByAppId[app.id]?.state;
        return healthState === "offline" || healthState === "degraded";
      }),
    [portalSortedApps, healthByAppId],
  );

  const handleSortModeChange = (nextMode: HubSortMode) => {
    setSortMode(nextMode);
    saveSortModePreference(nextMode);
  };

  const handleOpenApp = useCallback((app: EffectiveAppAccess) => {
    setUsageCounts((prev) => ({
      ...prev,
      [app.id]: (prev[app.id] ?? 0) + 1,
    }));
    void recordAppOpenEvent(app.id);
  }, []);

  const handleStartEditing = () => {
    setEditorFeedback(null);
    setDraftOrder(portalSortedApps.map((app) => app.id));
    setDraftSizes(
      resolveBentoSizes(portalSortedApps, remoteLayoutMeta ?? undefined),
    );
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setDraggingAppId(null);
    setEditorFeedback(null);
  };

  const handleResetLayout = () => {
    clearCachedBentoSizes();
    const freshOrder = sortAppsForHub(visibleApps, "portal", usageCounts);
    setDraftOrder(freshOrder.map((app) => app.id));
    setDraftSizes(computeAutoPackedBentoSizes(freshOrder));
    setEditorFeedback({
      type: "success",
      text: "Diseño automático sin huecos restablecido en el borrador. Guarda para aplicarlo a todos.",
    });
  };

  const handleAutoPackLayout = () => {
    setDraftSizes(computeAutoPackedBentoSizes(displaySortedApps));
    setEditorFeedback({
      type: "success",
      text: "Tarjetas auto-ajustadas en filas exactas de 12 columnas. Guarda para aplicarlo.",
    });
  };

  const handleMoveCard = (appId: string, delta: -1 | 1) => {
    setDraftOrder((prev) => {
      const idx = prev.indexOf(appId);
      if (idx === -1) return prev;
      const targetIdx = idx + delta;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  };

  const handleChangeCardSize = (appId: string, nextSize: BentoSize) => {
    setDraftSizes((prev) => ({
      ...prev,
      [appId]: nextSize,
    }));
  };

  const handleDragStartCard = (appId: string, e: DragEvent<HTMLElement>) => {
    setDraggingAppId(appId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", appId);
  };

  const handleDropOnCard = (
    targetAppId: string,
    e: DragEvent<HTMLElement>,
  ) => {
    const sourceAppId =
      draggingAppId || e.dataTransfer.getData("text/plain") || "";
    setDraggingAppId(null);
    if (!sourceAppId || sourceAppId === targetAppId) return;

    setDraftOrder((prev) => {
      const fromIdx = prev.indexOf(sourceAppId);
      const toIdx = prev.indexOf(targetAppId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const handleDragEndCard = () => {
    setDraggingAppId(null);
  };

  const handleSaveGlobalOrder = async () => {
    setSavingOrder(true);
    setEditorFeedback(null);
    try {
      const orderedIds =
        draftOrder.length > 0
          ? draftOrder
          : portalSortedApps.map((app) => app.id);
      const items = orderedIds.map((appId, index) => ({
        appId,
        displayOrder: (index + 1) * 10,
      }));
      await saveGlobalAppsOrder(items, draftSizes);
      saveCachedBentoSizes(draftSizes);
      setRemoteLayoutMeta({ ...draftSizes });
      await refreshAccess?.();
      setIsEditing(false);
      setEditorFeedback({
        type: "success",
        text: "Orden global y disposición Bento guardados para todos los usuarios.",
      });
    } catch (error) {
      setEditorFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "No fue posible guardar la disposición del portal.",
      });
    } finally {
      setSavingOrder(false);
    }
  };

  const handleQuickReport = async (
    app: EffectiveAppAccess,
    detectedState: string,
  ) => {
    setReportingAppId(app.id);
    setReportError(null);
    try {
      const stateText =
        detectedState === "maintenance"
          ? "en mantenimiento"
          : detectedState === "degraded"
            ? "con latencia o degradación"
            : "fuera de línea";
      const result = await sendAutomaticIncidentReport({
        appId: app.id,
        appName: app.name,
        subject: `Fallo reportado en ${app.name} (${detectedState})`,
        message: `El usuario reportó automáticamente desde el Portal de Aplicaciones que ${app.name} figura ${stateText}. Ruta configurada: ${app.route}.`,
        detectedState,
      });
      setReportedTickets((prev) => ({ ...prev, [app.id]: result }));
    } catch (error) {
      setReportError(
        error instanceof Error
          ? error.message
          : "No se pudo enviar el reporte automático.",
      );
    } finally {
      setReportingAppId(null);
    }
  };

  const handleProceedAnyway = () => {
    if (!dialogState) return;
    const { app } = dialogState;
    handleOpenApp(app);
    setDialogState(null);
    if (/^https?:\/\//i.test(app.route)) {
      window.open(app.route, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(app.route);
  };

  const primaryIncident = unhealthyApps[0];
  const primaryIncidentState = primaryIncident
    ? primaryIncident.status === "maintenance"
      ? "maintenance"
      : (healthByAppId[primaryIncident.id]?.state ?? "offline")
    : null;
  const primaryIncidentTicket = primaryIncident
    ? reportedTickets[primaryIncident.id]
    : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-col gap-5 border-b border-[var(--border-default)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
            <span className="size-2 rounded-full bg-[var(--color-accent)]" />
            <span>Coordinadora Mercantil &bull; Portal Interno</span>
          </div>

          <SmoothTitleAccent
            as="h1"
            className="text-3xl font-extrabold tracking-tight text-[var(--text-body)] sm:text-4xl"
            accessibleTitle="Portal de Aplicaciones de Apoyo"
            before="Portal de "
            accent="Aplicaciones de Apoyo"
            amplitude={3}
          />

          <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
            Accede a las herramientas operativas de diagnóstico, monitoreo GKE y
            documentación técnica según los permisos asignados a tu cuenta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="group"
            aria-label="Orden de herramientas"
            className="inline-flex rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] p-1 shadow-2xs"
          >
            <button
              type="button"
              aria-pressed={sortMode === "portal"}
              disabled={isEditing}
              onClick={() => handleSortModeChange("portal")}
              className={`cursor-pointer rounded-[var(--radius-pill)] px-3.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                sortMode === "portal"
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-on)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-body)]"
              }`}
            >
              Orden del portal
            </button>
            <button
              type="button"
              aria-pressed={sortMode === "most_used"}
              disabled={isEditing}
              onClick={() => handleSortModeChange("most_used")}
              className={`cursor-pointer rounded-[var(--radius-pill)] px-3.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                sortMode === "most_used"
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-on)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-body)]"
              }`}
            >
              Más usadas
            </button>
          </div>

          <button
            type="button"
            onClick={refreshHealth}
            disabled={isCheckingHealth}
            className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3.5 py-2 text-xs font-semibold text-[var(--text-body)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-wait disabled:opacity-70"
          >
            <span
              className={`size-2 rounded-full ${
                isCheckingHealth
                  ? "animate-ping bg-[var(--state-warning)]"
                  : "bg-[var(--state-success)]"
              }`}
            />
            <span>{isCheckingHealth ? "Verificando..." : "Verificar salud"}</span>
          </button>

          {Boolean(isSuperAdmin) && !isEditing && (
            <button
              type="button"
              onClick={handleStartEditing}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)] px-4 py-2 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-on)]"
            >
              <span>Personalizar portal</span>
            </button>
          )}
        </div>
      </header>

      {isEditing && (
        <section
          aria-label="Barra de personalización de orden global"
          className="mb-6 flex flex-col justify-between gap-4 rounded-[var(--radius-3)] border border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)]/55 p-4 sm:flex-row sm:items-center"
        >
          <div>
            <h2 className="text-sm font-bold text-[var(--text-body)]">
              Modo editor del portal (SuperAdmin)
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Arrastra esquinas o bordes de cualquier tarjeta para ajustar sus
              columnas/filas sobre la cuadrícula guía, o reordena con flechas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAutoPackLayout}
              className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--color-primary)]/40 bg-[var(--surface-card)] px-3.5 py-2 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)]"
            >
              Auto-ajustar sin huecos
            </button>
            <button
              type="button"
              onClick={handleResetLayout}
              className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3.5 py-2 text-xs font-semibold text-[var(--text-muted)] transition hover:text-[var(--text-body)]"
            >
              Restablecer diseño
            </button>
            <button
              type="button"
              onClick={handleCancelEditing}
              disabled={savingOrder}
              className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 text-xs font-semibold text-[var(--text-body)] transition hover:bg-[var(--surface-sunken)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={savingOrder}
              onClick={() => void handleSaveGlobalOrder()}
              className="cursor-pointer rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2 text-xs font-bold text-[var(--color-action-contrast)] shadow-xs transition hover:bg-[var(--color-action-hover)] disabled:cursor-wait disabled:opacity-70"
            >
              {savingOrder ? "Guardando..." : "Guardar para todos"}
            </button>
          </div>
        </section>
      )}

      {editorFeedback && (
        <div
          role="status"
          className={`mb-6 rounded-[var(--radius-2)] border px-4 py-3 text-xs font-medium ${
            editorFeedback.type === "error"
              ? "border-[var(--state-error)]/40 bg-[var(--alert-error-bg)] text-[var(--alert-error-fg)]"
              : "border-[var(--state-success)]/40 bg-[var(--alert-success-bg)] text-[var(--alert-success-fg)]"
          }`}
        >
          {editorFeedback.text}
        </div>
      )}

      {reportError && (
        <div
          role="alert"
          className="mb-6 rounded-[var(--radius-2)] border border-[var(--state-error)]/40 bg-[var(--alert-error-bg)] px-4 py-3 text-xs font-medium text-[var(--alert-error-fg)]"
        >
          {reportError}
        </div>
      )}

      {!loadingAccess && primaryIncident && primaryIncidentState && (
        <section
          role="region"
          aria-label="Aviso de disponibilidad de herramientas"
          className="mb-6 flex flex-col justify-between gap-3 rounded-[var(--radius-3)] border border-[var(--state-warning)]/45 bg-[var(--alert-warning-bg)] px-5 py-4 text-[var(--alert-warning-fg)] sm:flex-row sm:items-center"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider">
              Incidencia detectada ({unhealthyApps.length}{" "}
              {unhealthyApps.length === 1
                ? "servicio con alerta"
                : "servicios con alerta"}
              )
            </p>
            <p className="text-sm font-medium">
              {unhealthyApps.map((item) => item.name).join(", ")}{" "}
              {unhealthyApps.length === 1
                ? "presenta estado de contingencia o mantenimiento."
                : "presentan estado de contingencia o mantenimiento."}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {primaryIncidentTicket ? (
              <span className="rounded-[var(--radius-pill)] border border-[var(--state-success)]/40 bg-[var(--alert-success-bg)] px-3.5 py-1.5 text-xs font-bold text-[var(--alert-success-fg)]">
                Reporte enviado ({primaryIncidentTicket.ticketId})
              </span>
            ) : (
              <button
                type="button"
                disabled={reportingAppId === primaryIncident.id}
                onClick={() =>
                  void handleQuickReport(primaryIncident, primaryIncidentState)
                }
                className="cursor-pointer rounded-[var(--radius-pill)] bg-[var(--state-warning)] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                {reportingAppId === primaryIncident.id
                  ? "Enviando reporte..."
                  : `Reportar ${primaryIncident.name}`}
              </button>
            )}
          </div>
        </section>
      )}

      {loadingAccess ? (
        <HubSkeletonGrid />
      ) : (
        <div className="relative">
          {isEditing && (
            <>
              <div
                aria-hidden="true"
                className="mb-2 hidden grid-cols-12 gap-6 text-center lg:grid"
              >
                {Array.from({ length: 12 }, (_, idx) => (
                  <div
                    key={idx}
                    className="rounded border border-dashed border-[var(--color-primary)]/35 bg-[var(--color-primary-soft)]/30 py-1 font-mono text-[10px] font-bold text-[var(--color-primary)]"
                  >
                    C{idx + 1}
                  </div>
                ))}
              </div>
              <div
                aria-hidden="true"
                data-testid="bento-grid-guides"
                className="pointer-events-none absolute inset-x-0 bottom-0 top-8 hidden grid-cols-12 gap-6 lg:grid"
              >
                {Array.from({ length: 12 }, (_, idx) => (
                  <div
                    key={idx}
                    className="h-full rounded-[var(--radius-2)] border border-dashed border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)]/10"
                  />
                ))}
              </div>
            </>
          )}

          <section
            aria-label="Herramientas del portal"
            className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-6 lg:grid-cols-12 lg:grid-flow-dense lg:auto-rows-[minmax(230px,auto)]"
          >
            {displaySortedApps.map((app, index) => (
              <BentoAppCard
                key={app.id}
                app={app}
                bentoSize={resolvedSizes[app.id] ?? "wide"}
                health={healthByAppId[app.id]}
                usageCount={usageCounts[app.id] ?? 0}
                userEmail={auth?.email}
                isEditing={isEditing}
                canMovePrev={index > 0}
                canMoveNext={index < displaySortedApps.length - 1}
                isDragging={draggingAppId === app.id}
                reportingAppId={reportingAppId}
                reportedTicketId={reportedTickets[app.id]?.ticketId}
                showUsageBadge={sortMode === "most_used"}
                onOpenApp={handleOpenApp}
                onClickUnavailable={(targetApp, reason) =>
                  setDialogState({ app: targetApp, reason })
                }
                onQuickReport={(targetApp, detected) =>
                  void handleQuickReport(targetApp, detected)
                }
                onMoveCard={handleMoveCard}
                onChangeSize={handleChangeCardSize}
                onResizeDimensions={(appId, cols, rows) =>
                  handleChangeCardSize(appId, formatBentoSize(cols, rows))
                }
                onDragStartCard={handleDragStartCard}
                onDropOnCard={handleDropOnCard}
                onDragEndCard={handleDragEndCard}
              />
            ))}
          </section>
        </div>
      )}

      {dialogState && (
        <div
          className="animate-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
          onClick={() => setDialogState(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hub-unavailable-dialog-title"
            style={{ boxShadow: "var(--elevation-modal)" }}
            className="animate-modal-dialog w-full max-w-md rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--state-warning)]/40 bg-[var(--alert-warning-bg)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--alert-warning-fg)]">
                  {dialogState.reason === "maintenance"
                    ? "En mantenimiento"
                    : "Servicio fuera de línea"}
                </span>
                <h2
                  id="hub-unavailable-dialog-title"
                  className="mt-2 text-lg font-bold text-[var(--text-body)]"
                >
                  {dialogState.app.name} podría no responder
                </h2>
              </div>

              <button
                type="button"
                aria-label="Cerrar advertencia"
                onClick={() => setDialogState(null)}
                className="cursor-pointer rounded-full p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--text-body)]"
              >
                &times;
              </button>
            </div>

            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              {dialogState.reason === "maintenance"
                ? "Esta aplicación figura actualmente en mantenimiento administrativo. Si intentas ingresar, es posible que veas una pantalla de bloqueo o respuestas incompletas."
                : "La verificación /health de esta herramienta no respondió como operativa. Puede estar reiniciándose o presentando una falla temporal."}
            </p>

            {reportedTickets[dialogState.app.id] && (
              <div className="mt-4 rounded-[var(--radius-2)] border border-[var(--state-success)]/40 bg-[var(--alert-success-bg)] px-3.5 py-2.5 text-xs font-semibold text-[var(--alert-success-fg)]">
                Reporte automático registrado (
                {reportedTickets[dialogState.app.id].ticketId}).
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleProceedAnyway}
                className="w-full cursor-pointer rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-action-contrast)] shadow-xs transition hover:bg-[var(--color-action-hover)]"
              >
                Abrir de todos modos
              </button>

              {!reportedTickets[dialogState.app.id] && (
                <button
                  type="button"
                  disabled={reportingAppId === dialogState.app.id}
                  onClick={() =>
                    void handleQuickReport(dialogState.app, dialogState.reason)
                  }
                  className="w-full cursor-pointer rounded-[var(--radius-pill)] border border-[var(--state-error)]/40 bg-[var(--alert-error-bg)] px-4 py-2.5 text-xs font-bold text-[var(--alert-error-fg)] transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                >
                  {reportingAppId === dialogState.app.id
                    ? "Enviando reporte automático..."
                    : "Reportar fallo automáticamente"}
                </button>
              )}

              <div className="flex items-center justify-between gap-3 pt-1">
                <Link
                  to={`/contacto?app=${encodeURIComponent(dialogState.app.id)}&asunto=${encodeURIComponent(dialogState.reason === "maintenance" ? "mantenimiento" : "diagnostico")}&estado=${encodeURIComponent(dialogState.reason)}`}
                  onClick={() => setDialogState(null)}
                  className="text-xs font-semibold text-[var(--text-link)] hover:underline"
                >
                  Abrir formulario detallado
                </Link>
                <button
                  type="button"
                  onClick={() => setDialogState(null)}
                  className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] px-4 py-1.5 text-xs font-semibold text-[var(--text-body)] transition hover:bg-[var(--surface-sunken)]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
