import type { CheckResultado } from '../../shared/api/types'

interface CheckRowProps {
  check: CheckResultado
}

/** Fila desplegable estructurada para un check de diagnóstico según SIGO Droop. */
export const CheckRow = ({ check }: CheckRowProps) => {
  const failed = check.resultado === 'no_cumple'

  return (
    <details className="border-t border-[var(--border-default)] first:border-t-0" open={failed}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-[var(--text-body)] hover:text-[var(--color-primary)] transition-colors">
        <span className="text-sm font-medium">{check.nombre}</span>
        <span
          className={`inline-flex h-6 shrink-0 items-center rounded-[16px] border px-2.5 text-[11px] font-bold uppercase tracking-wider ${
            failed
              ? 'border-[var(--state-error)]/30 bg-[var(--alert-error-bg)] text-[var(--state-error)]'
              : 'border-[var(--state-success)]/30 bg-[var(--alert-success-bg)] text-[var(--state-success)]'
          }`}
        >
          {failed ? 'No cumple' : 'Cumple'}
        </span>
      </summary>

      {failed && (
        <div className="my-2 space-y-3 rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-4 text-xs leading-relaxed text-[var(--text-muted)] animate-accordion-content">
          {check.que_paso && (
            <div className="space-y-1 text-[var(--text-body)]">
              {Array.isArray(check.que_paso) ? (
                check.que_paso.map((paso, index) => <p key={index}>{paso}</p>)
              ) : (
                <p>{check.que_paso}</p>
              )}
            </div>
          )}

          {check.causa && (
            <p>
              <strong className="font-semibold text-[var(--text-body)]">Causa:</strong> {check.causa}
            </p>
          )}

          {check.consecuencia && (
            <p>
              <strong className="font-semibold text-[var(--text-body)]">Consecuencia:</strong> {check.consecuencia}
            </p>
          )}

          {check.solucion && check.solucion.length > 0 && (
            <div className="pt-1">
              <strong className="font-semibold text-[var(--color-primary)]">Qué hacer:</strong>
              <ol className="mt-1 list-decimal space-y-1 pl-4 text-[var(--text-body)]">
                {check.solucion.map((paso) => (
                  <li key={paso}>{paso}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </details>
  )
}
