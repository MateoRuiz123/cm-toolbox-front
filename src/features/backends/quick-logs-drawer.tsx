import { useEffect, useRef, useState } from "react";
import {
  authenticateLogsWebSocket,
  createLogsWebSocket,
  parseLogStreamMessage,
} from "../logs/api/logs-api";
import type { LogEnvironment, LogStreamMessage } from "../logs/api/logs-types";
import { appendBoundedLog } from "../logs/logs-buffer";
import { LogsViewer } from "../logs/logs-viewer";
import type { BackendEnvTarget } from "./api/backends-api";

export interface QuickLogsDrawerProps {
  readonly backendName: string;
  readonly env: LogEnvironment;
  readonly target: BackendEnvTarget;
  readonly onOpenFullLogs: (env: LogEnvironment, target: BackendEnvTarget) => void;
  readonly onClose: () => void;
}

export const QuickLogsDrawer = ({
  backendName,
  env,
  target,
  onOpenFullLogs,
  onClose,
}: QuickLogsDrawerProps) => {
  const [logs, setLogs] = useState<LogStreamMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [reloadNonce, setReloadNonce] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const ws = createLogsWebSocket();
    wsRef.current = ws;

    ws.onopen = () => {
      authenticateLogsWebSocket(ws);
    };

    ws.onmessage = (event) => {
      const msg = parseLogStreamMessage(String(event.data));
      if (!msg) return;

      if (msg.type === "authenticated") {
        ws.send(
          JSON.stringify({
            action: "start",
            env,
            cluster: target.cluster,
            namespace: target.namespace,
            workload: target.workload,
            tailLines: 100,
            since: "15m",
          }),
        );
        return;
      }

      if (msg.type === "log" || msg.type === "info" || msg.type === "error") {
        setLogs((prev) => appendBoundedLog(prev, msg));
      }
    };

    ws.onerror = () => {
      setIsStreaming(false);
    };

    ws.onclose = () => {
      setIsStreaming(false);
    };

    return () => {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "stop" }));
      }
      ws.close();
      wsRef.current = null;
    };
  }, [env, target.cluster, target.namespace, target.workload, reloadNonce]);

  const handleReload = () => {
    setLogs([]);
    setIsStreaming(true);
    setReloadNonce((n) => n + 1);
  };

  return (
    <div
      className="animate-modal-backdrop fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Vista rápida de logs de ${backendName}`}
        style={{ boxShadow: "var(--elevation-modal)" }}
        className="flex h-full w-full max-w-4xl flex-col border-l border-[var(--border-default)] bg-[var(--surface-app)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] bg-[var(--surface-header)] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                  env === "prod"
                    ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                    : "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                }`}
              >
                {env.toUpperCase()}
              </span>
              <h2 className="truncate text-base font-bold text-[var(--text-body)]">
                {backendName} &mdash; Logs en vivo
              </h2>
            </div>
            <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--text-muted)]">
              {target.cluster} / {target.namespace} / {target.workload}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenFullLogs(env, target)}
              className="cursor-pointer rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-1.5 text-xs font-bold text-[var(--color-action-contrast)] transition hover:bg-[var(--color-action-hover)]"
            >
              Abrir completo en /logs
            </button>
            <button
              type="button"
              aria-label="Cerrar panel de logs"
              onClick={onClose}
              className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-body)] transition hover:bg-[var(--surface-sunken)]"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 p-4">
          <LogsViewer
            logs={logs}
            isStreaming={isStreaming}
            onClear={() => setLogs([])}
            onReload={handleReload}
            target={{
              workload: target.workload,
              namespace: target.namespace,
              cluster: target.cluster,
              env,
            }}
          />
        </div>
      </aside>
    </div>
  );
};
