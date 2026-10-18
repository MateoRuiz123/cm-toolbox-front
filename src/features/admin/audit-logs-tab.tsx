import { useState } from "react";
import { JsonModal } from "../../shared/ui/json-modal";
import type { AuditLogItem } from "./api/admin-api";

interface AuditLogsTabProps {
  readonly items: readonly AuditLogItem[];
}

export const AuditLogsTab = ({ items }: AuditLogsTabProps) => {
  const [selectedItem, setSelectedItem] = useState<AuditLogItem | null>(null);

  return (
    <div className="overflow-hidden rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">Fecha UTC</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Evento</th>
              <th className="px-4 py-3">Recurso afectado</th>
              <th className="px-4 py-3 text-right">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {items.map((log) => (
              <tr
                key={log.id}
                className="hover:bg-[var(--surface-sunken)]/40"
              >
                <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                  {new Date(log.createdAt).toLocaleString("es-CO")}
                </td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--text-body)]">
                  {log.actorEmail}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[var(--color-primary)]">
                    {log.eventType}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--text-body)]">
                  {log.targetType}: {log.targetId}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(log)}
                    className="rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1 text-xs font-semibold text-[var(--text-body)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] cursor-pointer"
                  >
                    Ver JSON
                  </button>
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-[var(--text-muted)]"
                >
                  Aún no hay eventos registrados en la bitácora de auditoría.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <JsonModal
          data={{
            id: selectedItem.id,
            actorEmail: selectedItem.actorEmail,
            eventType: selectedItem.eventType,
            targetType: selectedItem.targetType,
            targetId: selectedItem.targetId,
            beforeState: selectedItem.beforeState,
            afterState: selectedItem.afterState,
            createdAt: selectedItem.createdAt,
          }}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
};
