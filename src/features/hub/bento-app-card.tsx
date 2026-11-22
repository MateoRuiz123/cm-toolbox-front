import { useMemo, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router";
import type { EffectiveAppAccess } from "../../shared/auth/access-types";
import { AppIcon } from "../../shared/ui/app-icon";
import { leerConsultaSesion } from "../diagnostico/consulta-sesion";
import { leerLogsRecientes } from "../logs/logs-sesion";
import type { AppHealthResult, BentoSize } from "./api/apps-health";
import {
  BENTO_SIZE_LABEL,
  getBentoSpanClasses,
  parseBentoDimensions,
} from "./hub-layout-storage";

export type UnavailableReason = "offline" | "maintenance";

export interface BentoAppCardProps {
  readonly app: EffectiveAppAccess;
  readonly bentoSize: BentoSize;
  readonly health?: AppHealthResult;
  readonly usageCount: number;
  readonly userEmail?: string;
  readonly isEditing: boolean;
  readonly canMovePrev: boolean;
  readonly canMoveNext: boolean;
  readonly isDragging: boolean;
  readonly reportingAppId: string | null;
  readonly reportedTicketId?: string;
  readonly showUsageBadge: boolean;
  readonly onOpenApp: (app: EffectiveAppAccess) => void;
  readonly onClickUnavailable: (
    app: EffectiveAppAccess,
    reason: UnavailableReason,
  ) => void;
  readonly onQuickReport: (app: EffectiveAppAccess, detectedState: string) => void;
  readonly onMoveCard: (appId: string, delta: -1 | 1) => void;
  readonly onChangeSize: (appId: string, nextSize: BentoSize) => void;
  readonly onResizeDimensions?: (
    appId: string,
    colSpan: number,
    rowSpan: number,
  ) => void;
  readonly onDragStartCard: (appId: string, e: DragEvent<HTMLElement>) => void;
  readonly onDropOnCard: (targetAppId: string, e: DragEvent<HTMLElement>) => void;
  readonly onDragEndCard: () => void;
  readonly isPs5Mode?: boolean;
  readonly isActiveAmbient?: boolean;
  readonly isDimmedAmbient?: boolean;
  readonly onActivate?: (appId: string) => void;
  readonly onDeactivate?: (appId: string) => void;
  readonly cardRefCallback?: (el: HTMLElement | null) => void;
}

const BENTO_SIZES_ORDER: readonly BentoSize[] = ["featured", "wide", "standard"];

export const HubArrowIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    className="size-4 transition-transform group-hover:translate-x-0.5"
    fill="none"
    stroke="currentColor"
  >
    <path
      d="M4 10h12m-4-4 4 4-4 4"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const resumePreviewCodes = (raw: string): string => {
  const firstLine = raw
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (firstLine.length === 0) return "";
  if (firstLine.length === 1) return firstLine[0];
  return `${firstLine[0]} (+${firstLine.length - 1})`;
};

export const BentoAppCard = ({
  app,
  bentoSize,
  health,
  usageCount,
  userEmail,
  isEditing,
  canMovePrev,
  canMoveNext,
  isDragging,
  reportingAppId,
  reportedTicketId,
  showUsageBadge,
  onOpenApp,
  onClickUnavailable,
  onQuickReport,
  onMoveCard,
  onChangeSize,
  onResizeDimensions,
  onDragStartCard,
  onDropOnCard,
  onDragEndCard,
  isPs5Mode = false,
  isActiveAmbient = false,
  isDimmedAmbient = false,
  onActivate,
  onDeactivate,
  cardRefCallback,
}: BentoAppCardProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);

  const dims = parseBentoDimensions(bentoSize);
  const esFeatured = bentoSize === "featured" || dims.colSpan >= 7;
  const esConstruccion = app.status === "disabled";
  const enMantenimiento = app.status === "maintenance";
  const puedeAbrirConPermiso = app.canAccess;
  const esOffline =
    !esConstruccion && !enMantenimiento && health?.state === "offline";
  const esDegraded =
    !esConstruccion && !enMantenimiento && health?.state === "degraded";
  const requiereConfirmacion =
    !esConstruccion &&
    (esOffline || (enMantenimiento && !puedeAbrirConPermiso));
  const esExterna = /^https?:\/\//i.test(app.route);

  const resumeContext = useMemo(() => {
    if (!esFeatured || isEditing || esConstruccion || !puedeAbrirConPermiso) {
      return null;
    }
    if (app.id === "diagnostico") {
      const sesion = leerConsultaSesion();
      const rem = resumePreviewCodes(sesion.remisiones);
      const desp = resumePreviewCodes(sesion.despachos);
      const label = rem || desp;
      if (!label) return null;
      return {
        label: `Continuar consulta: ${label}`,
        to: "/diagnostico",
      };
    }
    if (app.id === "logs") {
      const recientes = leerLogsRecientes(userEmail);
      const ultimo = recientes[0];
      if (!ultimo) return null;
      return {
        label: `Continuar logs: ${ultimo.workloadName} (${ultimo.env.toUpperCase()})`,
        to: "/logs",
      };
    }
    return null;
  }, [
    esFeatured,
    isEditing,
    esConstruccion,
    puedeAbrirConPermiso,
    app.id,
    userEmail,
  ]);

  const spanClass = getBentoSpanClasses(bentoSize);

  const startResize = (
    dir: "e" | "w" | "s" | "n" | "se" | "sw" | "ne" | "nw",
    e: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (!isEditing || !onResizeDimensions) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startCols = dims.colSpan;
    const startRows = dims.rowSpan;
    const gridWidth =
      cardRef.current?.parentElement?.getBoundingClientRect().width ?? 0;
    const colStepPx = gridWidth > 0 ? gridWidth / 12 : 80;
    const rowStepPx = 190;

    const hSign =
      dir === "e" || dir === "se" || dir === "ne"
        ? 1
        : dir === "w" || dir === "sw" || dir === "nw"
          ? -1
          : 0;
    const vSign =
      dir === "s" || dir === "se" || dir === "sw"
        ? 1
        : dir === "n" || dir === "ne" || dir === "nw"
          ? -1
          : 0;

    setIsResizing(true);

    const handleMove = (clientX: number, clientY: number) => {
      const dx = clientX - startX;
      const dy = clientY - startY;
      const nextCols =
        hSign === 0
          ? startCols
          : Math.min(
              12,
              Math.max(3, Math.round(startCols + (hSign * dx) / colStepPx)),
            );
      const nextRows =
        vSign === 0
          ? startRows
          : Math.min(
              3,
              Math.max(1, Math.round(startRows + (vSign * dy) / rowStepPx)),
            );
      onResizeDimensions(app.id, nextCols, nextRows);
    };

    const onPointerMove = (ev: globalThis.PointerEvent) =>
      handleMove(ev.clientX, ev.clientY);
    const onMouseMove = (ev: globalThis.MouseEvent) =>
      handleMove(ev.clientX, ev.clientY);

    const finish = () => {
      setIsResizing(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("mouseup", finish);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("mouseup", finish);
  };

  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    if (!isEditing) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    if (isDragOver) setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLElement>) => {
    if (!isEditing) return;
    e.preventDefault();
    setIsDragOver(false);
    onDropOnCard(app.id, e);
  };

  const renderStatusBadge = () => {
    if (esConstruccion) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
          Próximamente
        </span>
      );
    }

    if (enMantenimiento) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--state-warning)]/40 bg-[var(--alert-warning-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--alert-warning-fg)]">
          <span className="size-1.5 rounded-full bg-[var(--state-warning)]" />
          En mantenimiento
        </span>
      );
    }

    if (esOffline) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--state-error)]/40 bg-[var(--alert-error-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--alert-error-fg)]">
          <span className="size-1.5 rounded-full bg-[var(--state-error)]" />
          Fuera de línea
        </span>
      );
    }

    if (esDegraded) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--state-warning)]/40 bg-[var(--alert-warning-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--alert-warning-fg)]">
          <span className="size-1.5 rounded-full bg-[var(--state-warning)]" />
          Degradado{health?.latencyMs ? ` · ${health.latencyMs}ms` : ""}
        </span>
      );
    }

    if (!puedeAbrirConPermiso) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
          Acceso restringido
        </span>
      );
    }

    if (health?.state === "online") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--state-success)]/35 bg-[var(--alert-success-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--alert-success-fg)]">
          <span className="size-1.5 rounded-full bg-[var(--state-success)]" />
          Operativa{health.latencyMs ? ` · ${health.latencyMs}ms` : ""}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
        <span className="size-1.5 rounded-full bg-[var(--color-primary)]" />
        Disponible
      </span>
    );
  };

  const renderPrimaryAction = () => {
    if (isEditing) {
      return (
        <span className="inline-flex w-full items-center justify-center rounded-[var(--radius-pill)] border border-dashed border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)]/50 px-4 py-2.5 text-xs font-semibold text-[var(--color-primary)]">
          Modo editor activo
        </span>
      );
    }

    if (esConstruccion) {
      return (
        <button
          type="button"
          disabled
          className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-4 py-2.5 text-xs font-semibold text-[var(--text-disabled)]"
        >
          <span>En construcción</span>
        </button>
      );
    }

    if (requiereConfirmacion) {
      const reason: UnavailableReason = enMantenimiento
        ? "maintenance"
        : "offline";
      const label = enMantenimiento
        ? "En mantenimiento"
        : "Abrir herramienta";
      return (
        <button
          type="button"
          aria-disabled="true"
          aria-label={`${label} (${app.name} ${enMantenimiento ? "en mantenimiento" : "fuera de línea"}, clic para opciones)`}
          onClick={() => onClickUnavailable(app, reason)}
          className="group inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] opacity-80 transition hover:border-[var(--state-warning)] hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          <span>{label}</span>
          <HubArrowIcon />
        </button>
      );
    }

    if (!puedeAbrirConPermiso) {
      return (
        <button
          type="button"
          disabled
          className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-4 py-2.5 text-xs font-semibold text-[var(--text-disabled)]"
        >
          <span>Permiso requerido</span>
        </button>
      );
    }

    const ctaText = enMantenimiento
      ? "Mantenimiento (administrador)"
      : "Abrir herramienta";

    const buttonClasses =
      "group inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-action-contrast)] shadow-xs transition hover:bg-[var(--color-action-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";

    if (esExterna) {
      return (
        <a
          href={app.route}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onOpenApp(app)}
          className={buttonClasses}
        >
          <span>{ctaText}</span>
          <HubArrowIcon />
        </a>
      );
    }

    return (
      <Link
        to={app.route}
        onClick={() => onOpenApp(app)}
        className={buttonClasses}
      >
        <span>{ctaText}</span>
        <HubArrowIcon />
      </Link>
    );
  };

  const detectedIssueState = enMantenimiento
    ? "maintenance"
    : health?.state === "offline"
      ? "offline"
      : health?.state === "degraded"
        ? "degraded"
        : null;

  const canTriggerAmbient =
    isPs5Mode && !isEditing && app.status === "active" && app.canAccess;

  const handleAmbientEnterOrFocus = () => {
    if (canTriggerAmbient) {
      onActivate?.(app.id);
    }
  };

  const handleAmbientLeaveOrBlur = () => {
    if (isPs5Mode && !isEditing) {
      onDeactivate?.(app.id);
    }
  };

  return (
    <article
      ref={(node) => {
        cardRef.current = node;
        cardRefCallback?.(node);
      }}
      tabIndex={canTriggerAmbient ? 0 : undefined}
      draggable={isEditing && !isResizing}
      onDragStart={(e) => isEditing && !isResizing && onDragStartCard(app.id, e)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={onDragEndCard}
      onPointerEnter={handleAmbientEnterOrFocus}
      onFocus={handleAmbientEnterOrFocus}
      onPointerLeave={handleAmbientLeaveOrBlur}
      onBlur={(e) => {
        if (cardRef.current?.contains(e.relatedTarget as Node | null)) return;
        handleAmbientLeaveOrBlur();
      }}
      data-ambient-state={
        isActiveAmbient ? "active" : isDimmedAmbient ? "dimmed" : "idle"
      }
      style={{
        boxShadow: isActiveAmbient
          ? "var(--elevation-card-hover)"
          : "var(--elevation-card)",
      }}
      className={`${spanClass} relative flex flex-col justify-between rounded-[var(--radius-3)] border bg-[var(--surface-card)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
        esFeatured ? "p-6 sm:p-7" : "p-5 sm:p-6"
      } ${
        isEditing
          ? "overflow-visible cursor-grab border-dashed border-[var(--color-primary)]/70 hover:border-[var(--color-primary)] active:cursor-grabbing"
          : esOffline
            ? "overflow-hidden border-[var(--state-error)]/40 hover:border-[var(--state-error)]/60"
            : enMantenimiento || esDegraded
              ? "overflow-hidden border-[var(--state-warning)]/40 hover:border-[var(--state-warning)]/60"
              : isActiveAmbient
                ? "z-20 scale-[1.03] overflow-hidden border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/35"
                : "overflow-hidden border-[var(--border-default)] hover:-translate-y-0.5 hover:border-[var(--color-primary)]/45"
      } ${isDimmedAmbient ? "opacity-65" : ""} ${
        isDragging ? "opacity-50 scale-[0.98]" : ""
      } ${
        isDragOver || isResizing ? "ring-2 ring-[var(--color-primary)] ring-offset-2" : ""
      }`}
    >
      {isEditing && (
        <>
          {/* Tiradores de borde */}
          <button
            type="button"
            data-resize-handle="e"
            aria-label={`Redimensionar borde derecho de ${app.name}`}
            onPointerDown={(e) => startResize("e", e)}
            className="absolute right-0 top-6 bottom-6 z-20 w-2 cursor-ew-resize rounded-full transition hover:bg-[var(--color-primary)]/35"
          />
          <button
            type="button"
            data-resize-handle="w"
            aria-label={`Redimensionar borde izquierdo de ${app.name}`}
            onPointerDown={(e) => startResize("w", e)}
            className="absolute left-0 top-6 bottom-6 z-20 w-2 cursor-ew-resize rounded-full transition hover:bg-[var(--color-primary)]/35"
          />
          <button
            type="button"
            data-resize-handle="s"
            aria-label={`Redimensionar borde inferior de ${app.name}`}
            onPointerDown={(e) => startResize("s", e)}
            className="absolute bottom-0 left-6 right-6 z-20 h-2 cursor-ns-resize rounded-full transition hover:bg-[var(--color-primary)]/35"
          />
          <button
            type="button"
            data-resize-handle="n"
            aria-label={`Redimensionar borde superior de ${app.name}`}
            onPointerDown={(e) => startResize("n", e)}
            className="absolute top-0 left-6 right-6 z-20 h-2 cursor-ns-resize rounded-full transition hover:bg-[var(--color-primary)]/35"
          />

          {/* Esquinas cuadradas tipo lienzo/dibujo */}
          <button
            type="button"
            data-resize-handle="nw"
            aria-label={`Redimensionar esquina superior izquierda de ${app.name}`}
            onPointerDown={(e) => startResize("nw", e)}
            className="absolute -left-1.5 -top-1.5 z-30 size-3.5 cursor-nwse-resize rounded-[2px] border-2 border-[var(--color-primary)] bg-[var(--surface-card)] shadow-xs transition hover:scale-125"
          />
          <button
            type="button"
            data-resize-handle="ne"
            aria-label={`Redimensionar esquina superior derecha de ${app.name}`}
            onPointerDown={(e) => startResize("ne", e)}
            className="absolute -right-1.5 -top-1.5 z-30 size-3.5 cursor-nesw-resize rounded-[2px] border-2 border-[var(--color-primary)] bg-[var(--surface-card)] shadow-xs transition hover:scale-125"
          />
          <button
            type="button"
            data-resize-handle="sw"
            aria-label={`Redimensionar esquina inferior izquierda de ${app.name}`}
            onPointerDown={(e) => startResize("sw", e)}
            className="absolute -left-1.5 -bottom-1.5 z-30 size-3.5 cursor-nesw-resize rounded-[2px] border-2 border-[var(--color-primary)] bg-[var(--surface-card)] shadow-xs transition hover:scale-125"
          />
          <button
            type="button"
            data-resize-handle="se"
            aria-label={`Redimensionar esquina inferior derecha de ${app.name}`}
            onPointerDown={(e) => startResize("se", e)}
            className="absolute -right-1.5 -bottom-1.5 z-30 size-3.5 cursor-nwse-resize rounded-[2px] border-2 border-[var(--color-primary)] bg-[var(--surface-card)] shadow-xs transition hover:scale-125"
          />
        </>
      )}

      {esFeatured && !esConstruccion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-[radial-gradient(circle,var(--color-primary-soft)_0%,transparent_72%)] opacity-75"
        />
      )}

      <div>
        {isEditing && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-2)] border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)]/45 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
                Mover
              </span>
              <button
                type="button"
                disabled={!canMovePrev}
                aria-label={`Mover ${app.name} hacia atrás`}
                onClick={() => onMoveCard(app.id, -1)}
                className="inline-flex size-7 cursor-pointer items-center justify-center rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] text-xs font-bold text-[var(--text-body)] transition hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                &larr;
              </button>
              <button
                type="button"
                disabled={!canMoveNext}
                aria-label={`Mover ${app.name} hacia adelante`}
                onClick={() => onMoveCard(app.id, 1)}
                className="inline-flex size-7 cursor-pointer items-center justify-center rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] text-xs font-bold text-[var(--text-body)] transition hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                &rarr;
              </button>
              <span className="ml-1 rounded border border-[var(--color-primary)]/30 bg-[var(--surface-card)] px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--color-primary)]">
                {dims.colSpan} &times; {dims.rowSpan}
              </span>
            </div>

            <div
              role="group"
              aria-label={`Tamaño de tarjeta para ${app.name}`}
              className="flex items-center gap-1"
            >
              {BENTO_SIZES_ORDER.map((sizeOption) => {
                const active = bentoSize === sizeOption;
                return (
                  <button
                    key={sizeOption}
                    type="button"
                    aria-pressed={active}
                    aria-label={`Tamaño ${BENTO_SIZE_LABEL[sizeOption]} para ${app.name}`}
                    onClick={() => onChangeSize(app.id, sizeOption)}
                    className={`cursor-pointer rounded-[var(--radius-pill)] px-2.5 py-1 text-[10px] font-bold transition ${
                      active
                        ? "bg-[var(--color-primary)] text-[var(--color-primary-on)]"
                        : "border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-muted)] hover:text-[var(--text-body)]"
                    }`}
                  >
                    {BENTO_SIZE_LABEL[sizeOption]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="relative mb-4 flex items-start justify-between gap-3">
          <div
            className={`grid shrink-0 place-items-center rounded-[var(--radius-2)] border ${
              esFeatured ? "size-14" : "size-12"
            } ${
              esConstruccion || esOffline
                ? "border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-muted)]"
                : "border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
            }`}
          >
            <AppIcon
              icon={app.icon}
              appId={app.id}
              className={esFeatured ? "size-7" : "size-6"}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {showUsageBadge && usageCount > 0 && (
              <span className="inline-flex items-center rounded-full border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--color-primary)]">
                {usageCount} {usageCount === 1 ? "uso" : "usos"}
              </span>
            )}
            {renderStatusBadge()}
          </div>
        </div>

        <h2
          className={`font-bold tracking-tight text-[var(--text-body)] ${
            esFeatured ? "text-xl sm:text-2xl" : "text-lg"
          }`}
        >
          {app.name}
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
          {app.description}
        </p>

        {app.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {app.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {resumeContext && (
          <div className="mt-4">
            <Link
              to={resumeContext.to}
              onClick={() => onOpenApp(app)}
              className="inline-flex items-center gap-2 rounded-[var(--radius-2)] border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)]/55 px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)]"
            >
              <span className="size-1.5 rounded-full bg-[var(--color-accent)]" />
              <span className="truncate">{resumeContext.label}</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-2.5 border-t border-[var(--border-default)]/70 pt-4">
        {renderPrimaryAction()}

        {!isEditing && detectedIssueState && (
          <div className="flex items-center justify-between gap-2">
            {reportedTicketId ? (
              <p className="w-full rounded-[var(--radius-2)] border border-[var(--state-success)]/35 bg-[var(--alert-success-bg)] px-3 py-1.5 text-center text-[11px] font-semibold text-[var(--alert-success-fg)]">
                Incidencia reportada ({reportedTicketId})
              </p>
            ) : (
              <button
                type="button"
                disabled={reportingAppId === app.id}
                onClick={() => onQuickReport(app, detectedIssueState)}
                className="w-full cursor-pointer rounded-[var(--radius-pill)] border border-[var(--state-error)]/35 bg-[var(--alert-error-bg)] px-3 py-1.5 text-[11px] font-bold text-[var(--alert-error-fg)] transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                {reportingAppId === app.id
                  ? "Enviando reporte automático..."
                  : "Reportar fallo automáticamente"}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
