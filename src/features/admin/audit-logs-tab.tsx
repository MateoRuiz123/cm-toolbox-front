import { useState } from "react";
import { JsonModal } from "../../shared/ui/json-modal";
import type { AuditLogItem } from "./api/admin-api";
import {
  describeAuditEvent,
  describeAuditTarget,
  labelAuditEvent,
} from "./audit-summary";

interface AuditLogsTabProps {
  readonly logs: readonly AuditLogItem[];
}

export const AuditLogsTab = ({ logs = [] }: AuditLogsTabProps) => {
  const [selected, setSelected] = useState<AuditLogItem | null>(null);

  return (
    <div className="overflow-x-auto rounded-[var(--radius-2)] border border-[var(--border-default)]">
      <table className="w-full min-w-[960px] border-collapse text-left text-sm">
        <thead className="bg-[var(--surface-sunken)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Actor</th>
            <th className="px-4 py-3">Evento</th>
            <th className="px-4 py-3">Qué pasó</th>
            <th className="px-4 py-3">Recurso</th>
            <th className="px-4 py-3">Detalle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-default)] bg-[var(--surface-card)]">
          {logs.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-8 text-center text-[var(--text-muted)]"
              >
                No hay eventos de auditoría registrados.
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3 whitespace-nowrap text-[var(--text-muted)]">
                  {new Date(log.createdAt).toLocaleString("es-CO")}
                </td>
                <td className="px-4 py-3 text-[var(--text-body)]">
                  {log.actorEmail}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-[var(--radius-pill)] bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary)]">
                    {labelAuditEvent(log.eventType)}
                  </span>
                </td>
                <td className="max-w-md px-4 py-3 text-[var(--text-body)]">
                  {describeAuditEvent(log)}
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {describeAuditTarget(log.targetType, log.targetId)}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setSelected(log)}
                    className="cursor-pointer text-xs font-semibold text-[var(--color-primary)] hover:underline"
                  >
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {selected ? (
        <JsonModal
          data={{
            eventType: selected.eventType,
            beforeState: selected.beforeState,
            afterState: selected.afterState,
          }}
          onClose={() => setSelected(null)}
          title="Detalle técnico"
          copyLabel="Copiar detalle"
          closeLabel="Cerrar detalle"
        />
      ) : null}
    </div>
  );
};
