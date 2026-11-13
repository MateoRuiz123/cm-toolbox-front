import { useEffect, useRef, useState, useMemo } from "react";
import type {
  LogStreamMessage,
  LogSeverity,
  ProcessedLogLine,
} from "./api/logs-types";
import { buildGcpLogsExplorerUrl, buildGkeWorkloadUrl } from "./gcp-links";

export interface LogsViewerTarget {
  readonly workload: string;
  readonly namespace: string;
  readonly cluster: string;
  readonly env: string;
  readonly location?: string;
  readonly project?: string;
}

interface LogsViewerProps {
  readonly logs: readonly LogStreamMessage[];
  readonly isStreaming: boolean;
  readonly onClear: () => void;
  readonly onReload?: () => void;
  readonly target?: LogsViewerTarget;
}

const ExternalLinkIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="size-3 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 3h6v6" />
    <path d="M10 14L21 3" />
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
  </svg>
);

const ReloadIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="size-3 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 11-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </svg>
);

const detectSeverity = (text: string): LogSeverity => {
  const t = text.toLowerCase();
  if (t.includes("error") || t.includes("exception") || t.includes("fatal"))
    return "error";
  if (t.includes("warn")) return "warn";
  if (t.includes("debug")) return "debug";
  return "info";
};

const severityLabel: Record<LogSeverity, string> = {
  error: "ERR",
  warn: "WRN",
  info: "INF",
  debug: "DBG",
};

const severityBadgeClass: Record<LogSeverity, string> = {
  error: "bg-[var(--state-error)]/10 text-[var(--state-error)]",
  warn: "bg-[var(--state-warning)]/10 text-[var(--state-warning)]",
  info: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
  debug: "bg-[var(--surface-sunken)] text-[var(--text-muted)]",
};

const severityFilterActiveClass: Record<LogSeverity, string> = {
  error:
    "border-[var(--state-error)]/40 bg-[var(--state-error)]/10 text-[var(--state-error)]",
  warn: "border-[var(--state-warning)]/40 bg-[var(--state-warning)]/10 text-[var(--state-warning)]",
  info: "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
  debug:
    "border-[var(--text-muted)]/40 bg-[var(--surface-sunken)] text-[var(--text-body)]",
};

const SEVERITY_ORDER = ["error", "warn", "info", "debug"] as const;

export const LogsViewer = ({
  logs,
  isStreaming,
  onClear,
  onReload,
  target,
}: LogsViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<"all" | LogSeverity>(
    "all",
  );
  const [textoFiltro, setTextoFiltro] = useState("");

  const processedLogs = useMemo(() => {
    const lines: ProcessedLogLine[] = [];
    logs.forEach((msg) => {
      if (!msg.text) return;
      const chunks = msg.text.split("\n").filter((l) => l.trim());
      const time = new Date(msg.timestamp).toLocaleTimeString("es", {
        hour12: false,
      });
      chunks.forEach((line, lineIndex) => {
        let sev: LogSeverity = "info";
        if (msg.type === "error") sev = "error";
        else if (msg.type === "log") sev = detectSeverity(line);
        lines.push({
          id: `${msg.id}-${lineIndex}`,
          pod: msg.pod ?? "",
          text: line,
          severity: sev,
          time,
        });
      });
    });
    return lines;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const porSeveridad =
      severityFilter === "all"
        ? processedLogs
        : processedLogs.filter((l) => l.severity === severityFilter);
    const consulta = textoFiltro.trim().toLowerCase();
    if (!consulta) return porSeveridad;
    return porSeveridad.filter(
      (linea) =>
        linea.text.toLowerCase().includes(consulta) ||
        linea.pod.toLowerCase().includes(consulta),
    );
  }, [processedLogs, severityFilter, textoFiltro]);

  const counts = useMemo(() => {
    return processedLogs.reduce(
      (acc, l) => {
        acc[l.severity] += 1;
        return acc;
      },
      { error: 0, warn: 0, info: 0, debug: 0 },
    );
  }, [processedLogs]);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const filterButtonClass = (active: boolean, sev?: LogSeverity) =>
    `flex items-center gap-1 rounded-[var(--radius-1)] border px-2 py-1 font-mono text-[11px] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
      active
        ? sev
          ? severityFilterActiveClass[sev]
          : "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
        : "border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-body)]"
    }`;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* Toolbar única: target + estado | filtros con conteo | acciones */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--border-default)] bg-[var(--surface-header)] px-3.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="sr-only">Logs en tiempo real</h2>
          {target ? (
            <p
              className="truncate font-mono text-[11px] text-[var(--text-muted)]"
              title={`${target.workload} · ${target.namespace} · ${target.cluster} · ${target.env.toUpperCase()}`}
            >
              <span className="font-semibold text-[var(--text-body)]">
                {target.workload}
              </span>
              {" · "}
              {target.namespace}
              {" · "}
              {target.cluster}
              {" · "}
              {target.env.toUpperCase()}
            </p>
          ) : (
            <p
              className="font-mono text-[11px] text-[var(--text-muted)]"
              aria-hidden="true"
            >
              Logs en tiempo real
            </p>
          )}
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              isStreaming
                ? "bg-[var(--state-success)]/10 text-[var(--state-success)]"
                : "bg-[var(--surface-sunken)] text-[var(--text-muted)]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${
                isStreaming
                  ? "animate-pulse bg-[var(--state-success)]"
                  : "bg-[var(--text-muted)]"
              }`}
            />
            {isStreaming ? "En vivo" : "Detenido"}
          </span>
          {target && (
            <div className="flex shrink-0 items-center gap-1">
              <a
                href={buildGkeWorkloadUrl(target)}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir carga de trabajo en GKE (nueva pestaña)"
                className="inline-flex items-center gap-1 rounded-[var(--radius-1)] border border-[var(--border-default)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                <ExternalLinkIcon />
                Workload GKE
              </a>
              <a
                href={buildGcpLogsExplorerUrl(target)}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir en Cloud Logging (nueva pestaña)"
                className="inline-flex items-center gap-1 rounded-[var(--radius-1)] border border-[var(--border-default)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                <ExternalLinkIcon />
                Logs GCP
              </a>
            </div>
          )}
        </div>

        <label className="min-w-36 flex-1">
          <span className="sr-only">Buscar en los logs</span>
          <input
            type="search"
            value={textoFiltro}
            onChange={(event) => setTextoFiltro(event.target.value)}
            placeholder="Buscar texto o pod"
            aria-label="Buscar en los logs"
            className="w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2 py-1 font-sans text-[11px] text-[var(--text-body)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
          />
        </label>
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Filtrar por severidad"
        >
          <button
            type="button"
            onClick={() => setSeverityFilter("all")}
            aria-pressed={severityFilter === "all"}
            className={filterButtonClass(severityFilter === "all")}
          >
            Todos
            <span className="opacity-70">{processedLogs.length}</span>
          </button>
          {SEVERITY_ORDER.map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(sev)}
              aria-pressed={severityFilter === sev}
              title={`${counts[sev]} ${sev}`}
              className={filterButtonClass(severityFilter === sev, sev)}
            >
              {severityLabel[sev]}
              <span className="opacity-70">{counts[sev]}</span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {target && onReload && (
            <button
              type="button"
              onClick={onReload}
              title="Recargar streaming de logs"
              className="flex items-center gap-1 rounded-[var(--radius-1)] border border-[var(--border-default)] px-2 py-1 text-[11px] text-[var(--text-muted)] transition-colors hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <ReloadIcon />
              Recargar
            </button>
          )}
          <button
            type="button"
            onClick={() => setAutoScroll((prev) => !prev)}
            aria-pressed={autoScroll}
            title="Desplazamiento automático al final"
            className={`flex items-center gap-1 rounded-[var(--radius-1)] border px-2 py-1 text-[11px] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
              autoScroll
                ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                : "border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-body)]"
            }`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
            Auto-scroll
          </button>
          <button
            type="button"
            onClick={onClear}
            title="Limpiar logs"
            className="flex items-center gap-1 rounded-[var(--radius-1)] border border-[var(--border-default)] px-2 py-1 text-[11px] text-[var(--text-muted)] transition-colors hover:text-[var(--state-error)] focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
            </svg>
            Limpiar
          </button>
        </div>
      </div>

      {/* Salida de logs */}
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-y-auto bg-[var(--surface-sunken)] px-3.5 py-2.5 font-mono text-xs leading-[1.75] text-[var(--text-body)] [scrollbar-width:thin] dark:bg-[var(--surface-header)]"
      >
        {processedLogs.length > 0 && filteredLogs.length === 0 ? (
          <p
            className="px-1.5 py-1 text-[11px] text-[var(--text-muted)]"
            role="status"
          >
            Ninguna línea coincide con la búsqueda.
          </p>
        ) : filteredLogs.length === 0 ? (
          target ? (
            <p
              className="px-1.5 py-1 text-[11px] text-[var(--text-muted)]"
              role="status"
            >
              {isStreaming
                ? `▸ terminal limpia · esperando eventos de ${target.workload}…`
                : "▸ terminal limpia · streaming detenido"}
            </p>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1.5 text-[var(--text-muted)]">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-8 opacity-30"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 17l6-6-6-6M12 19h8" />
              </svg>
              <p className="font-sans text-xs font-medium text-[var(--text-body)]">
                Sin logs activos
              </p>
              <p className="font-mono text-[11px]">
                selecciona una carga de trabajo para iniciar
              </p>
            </div>
          )
        ) : (
          <div className="flex flex-col">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="group flex items-start gap-2.5 rounded-[var(--radius-1)] border-l-2 border-transparent px-1.5 py-1 transition-colors duration-150 hover:border-[var(--border-focus)]/50 hover:bg-[var(--surface-card)]/90"
              >
                <span className="shrink-0 select-none pt-px text-[10px] text-[var(--text-muted)]">
                  {log.time}
                </span>
                <span
                  className={`w-9 shrink-0 select-none rounded-[3px] px-1 text-center text-[9px] font-bold uppercase leading-4 ${severityBadgeClass[log.severity]}`}
                >
                  {severityLabel[log.severity]}
                </span>
                {log.pod && (
                  <span
                    className="w-32 shrink-0 truncate pt-px text-[10px] text-[var(--color-primary)] opacity-70 group-hover:opacity-100"
                    title={log.pod}
                  >
                    {log.pod.slice(-24)}
                  </span>
                )}
                <span
                  className={`min-w-0 flex-1 whitespace-pre-wrap break-words ${
                    log.severity === "error"
                      ? "text-[var(--state-error)]"
                      : log.severity === "warn"
                        ? "text-[var(--state-warning)]"
                        : ""
                  }`}
                >
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
