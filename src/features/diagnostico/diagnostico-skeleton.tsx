/**
 * Estado de carga con efecto de esqueleto pulsante adaptado a SIGO Droop.
 * Refleja visualmente la estructura de las tarjetas de diagnóstico sin saltos de layout.
 */
export const DiagnosticoSkeleton = () => {
  return (
    <section
      aria-label="Cargando resultados del diagnóstico"
      aria-busy="true"
      className="space-y-4 sm:space-y-5 animate-pulse"
    >
      {/* Cabecera del esqueleto */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-3 w-28 rounded-[var(--radius-1)] bg-[var(--border-default)] opacity-60" />
          <div className="h-7 w-64 rounded-[var(--radius-1)] bg-[var(--border-default)]" />
        </div>
        <div className="h-6 w-24 rounded-[16px] bg-[var(--border-default)] opacity-60" />
      </div>

      {/* Barra de herramientas simulada */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-10 w-full max-w-md rounded-[var(--radius-3)] bg-[var(--border-default)] opacity-50 sm:w-80" />
        <div className="h-8 w-32 rounded-[var(--radius-1)] bg-[var(--border-default)] opacity-40" />
      </div>

      {/* Tarjetas simuladas */}
      <div className="space-y-2.5">
        {[1, 2, 3].map((key) => (
          <div
            key={key}
            style={{ boxShadow: 'var(--shadow-1)' }}
            className="surface rounded-[var(--radius-2)] border border-[var(--border-default)] p-4 sm:px-5 sm:py-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-4 rounded-[2px] bg-[var(--border-default)] opacity-60" />
                <div className="size-4 rounded-full bg-[var(--border-default)] opacity-50" />
                <div className="space-y-1.5">
                  <div className="h-2.5 w-16 rounded-[var(--radius-1)] bg-[var(--border-default)] opacity-60" />
                  <div className="h-4 w-32 rounded-[var(--radius-1)] bg-[var(--border-default)]" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden h-4 w-24 rounded-[var(--radius-1)] bg-[var(--border-default)] opacity-40 md:block" />
                <div className="h-6 w-20 rounded-[16px] bg-[var(--border-default)] opacity-60" />
              </div>
            </div>
            <div className="mt-3 h-3 w-3/4 rounded-[var(--radius-1)] bg-[var(--border-default)] opacity-40" />
          </div>
        ))}
      </div>
    </section>
  )
}
