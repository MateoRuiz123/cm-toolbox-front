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
  readonly total?: number;
  readonly onFilterChange?: (filter: {
    readonly eventType?: string;
    readonly actorEmail?: string;
    readonly limit?: number;
  }) => void;
}

export const AuditLogsTab = ({
  logs = [],
  total,
  onFilterChange,
}: AuditLogsTabProps) => {
  const [selected, setSelected] = useState<AuditLogItem | null>(null);
  const [actorQuery, setActorQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [limit, setLimit] = useState(50);

  const emitFilter = (next: {
    eventType?: string;
    actorEmail?: string;
    limit?: number;
  }) => {
    onFilterChange?.({
      eventType: next.eventType || undefined,
      actorEmail: next.actorEmail?.trim() || undefined,
      limit: next.limit,
    });
  };

  const visibleLogs = logs.filter((log) => {
    if (eventTypeFilter && log.eventType !== eventTypeFilter) return false;
    if (actorQuery.trim()) {
      const q = actorQuery.trim().toLowerCase();
      return (
        log.actorEmail.toLowerCase().includes(q) ||
        log.targetId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const canLoadMore = total !== undefined && logs.length < total;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={actorQuery}
            onChange={(e) => {
              const val = e.target.value;
              setActorQuery(val);
              emitFilter({
                eventType: eventTypeFilter,
                actorEmail: val,
                limit,
              });
            }}
            placeholder="Buscar por actor o recurso..."
            aria-label="Filtrar auditoría por actor o recurso"
            className="w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3.5 py-2 text-sm text-[var(--text-body)] sm:max-w-xs"
          />

          <select
            value={eventTypeFilter}
            onChange={(e) => {
              const val = e.target.value;
              setEventTypeFilter(val);
              emitFilter({
                eventType: val,
                actorEmail: actorQuery,
                limit,
              });
            }}
            aria-label="Filtrar por tipo de evento"
            className="rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-body)]"
          >
            <option value="">Todos los eventos</option>
            <option value="USER_ACCESS_UPDATED">
              Evento: Actualización de acceso de usuario
            </option>
            <option value="USER_DELETED">Evento: Eliminación de usuario</option>
            <option value="ROLE_UPSERTED">
              Evento: Alta o actualización de rol
            </option>
            <option value="ROLE_DELETED">Evento: Eliminación de rol</option>
            <option value="APP_UPSERTED">
              Evento: Alta o actualización de herramienta
            </option>
            <option value="APP_STATUS_CHANGED">
              Evento: Cambio de estado
            </option>
            <option value="APP_ID_RENAMED">
              Evento: Renombre de identificador
            </option>
          </select>
        </div>

        <span className="text-xs text-[var(--text-muted)]">
          Mostrando {visibleLogs.length}
          {total !== undefined ? ` de ${total}` : ""} eventos
        </span>
      </div>

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
            {visibleLogs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-[var(--text-muted)]"
                >
                  No hay eventos de auditoría registrados.
                </td>
              </tr>
            ) : (
              visibleLogs.map((log) => (
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
      </div>

      {canLoadMore && onFilterChange && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => {
              const nextLimit = limit + 50;
              setLimit(nextLimit);
              emitFilter({
                eventType: eventTypeFilter,
                actorEmail: actorQuery,
                limit: nextLimit,
              });
            }}
            className="cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-card)] px-5 py-2 text-xs font-bold text-[var(--text-body)] hover:bg-[var(--surface-sunken)]"
          >
            Cargar más ({logs.length} / {total})
          </button>
        </div>
      )}

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
