import { SmoothTitleAccent } from '@/shared/ui/smoothui'
import { useTheme } from '../../app/theme-context'
import type { SistemaVisual } from '../../shared/lib/ui-preferences'

interface SistemaOpcion {
  readonly id: SistemaVisual
  readonly nombre: string
  readonly detalle: string
  readonly lienzo: string
  readonly tinta: string
  readonly borde: string
  readonly accion: string
  readonly accionTexto: string
}

const OPCIONES: readonly SistemaOpcion[] = [
  {
    id: 'sigo',
    nombre: 'SIGO Droop',
    detalle: 'Azul institucional, naranja de compromiso y radios del design system.',
    lienzo: '#f4f3ef',
    tinta: '#333333',
    borde: '#dfddd6',
    accion: '#0066cc',
    accionTexto: '#ffffff',
  },
  {
    id: 'visitors',
    nombre: 'Visitors',
    detalle: 'Lienzo blanco, borde hairline y un solo acento lavanda en el botón.',
    lienzo: '#fbfaf7',
    tinta: '#181925',
    borde: '#e6e4dd',
    accion: '#918df6',
    accionTexto: '#181925',
  },
]

/** Página de apariencia. La preferencia vive en el navegador, no en el catálogo de apps. */
export const ConfiguracionPage = () => {
  const { sistema, setSistema, descanso, toggleDescanso, movimientoReducido, setMovimientoReducido } = useTheme()
  const descansoActivo = descanso === 'calido'

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <SmoothTitleAccent
        as="h1"
        className="text-2xl font-bold tracking-tight text-[var(--text-body)] sm:text-3xl"
        accessibleTitle="Apariencia del toolbox"
        before="Apariencia del "
        accent="toolbox"
        amplitude={3}
      />
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
        Elige el sistema visual de toda la aplicación. El modo claro u oscuro sigue en el encabezado y se combina con cualquiera de los dos.
      </p>

      <div
        role="radiogroup"
        aria-label="Sistema visual"
        className="mt-8 grid gap-4 sm:grid-cols-2"
      >
        {OPCIONES.map((opcion) => {
          const activo = sistema === opcion.id
          return (
            <button
              key={opcion.id}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => setSistema(opcion.id)}
              className={`rounded-[var(--radius-3)] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                activo
                  ? 'border-[var(--border-focus)] bg-[var(--surface-card)]'
                  : 'border-[var(--border-default)] bg-[var(--surface-card)] hover:bg-[var(--surface-sunken)]'
              }`}
            >
              <span className="block text-sm font-medium text-[var(--text-body)]">
                {opcion.nombre}
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-[var(--text-muted)]">
                {opcion.detalle}
              </span>
              <span
                className="mt-4 block rounded-[var(--radius-2)] border p-4"
                style={{ backgroundColor: opcion.lienzo, borderColor: opcion.borde }}
              >
                <span className="block text-base font-medium" style={{ color: opcion.tinta }}>
                  Portal
                </span>
                <span
                  className="mt-3 inline-flex rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium"
                  style={{ backgroundColor: opcion.accion, color: opcion.accionTexto }}
                >
                  Abrir
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <section aria-labelledby="comodidad-titulo" className="mt-12">
        <h2 id="comodidad-titulo" className="text-lg font-bold text-[var(--text-body)]">
          Comodidad visual para uso prolongado
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-muted)]">
          Para turnos largos. Lleva fondos y textos a tonos papel y ámbar que deslumbran menos. Funciona con cualquier sistema y modo.
        </p>

        <div className="surface mt-5 flex flex-col gap-5 rounded-[var(--radius-3)] border border-[var(--border-default)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span id="descanso-label" className="block text-sm font-medium text-[var(--text-body)]">
              Descanso visual (tono cálido)
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-[var(--text-muted)]">
              Mantiene el contraste AA y los colores de estado. Solo cambia superficies, bordes y texto.
            </span>
            <span aria-hidden="true" className="mt-4 flex gap-2">
              <span className="block h-10 w-16 rounded-[var(--radius-1)] border border-[#e0e0e0] bg-[#fcfbf9]" title="Normal" />
              <span className="block h-10 w-16 rounded-[var(--radius-1)] border border-[#dcd5c7] bg-[#f3efe6]" title="Cálido" />
              <span className="block h-10 w-16 rounded-[var(--radius-1)] border border-[#332e28] bg-[#23201c]" title="Cálido oscuro" />
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={descansoActivo}
            aria-labelledby="descanso-label"
            onClick={toggleDescanso}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
              descansoActivo
                ? 'border-[var(--color-action)] bg-[var(--color-action)]'
                : 'border-[var(--border-default)] bg-[var(--surface-sunken)]'
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block size-5 rounded-full bg-[var(--surface-card)] shadow transition-transform duration-200 ease-out ${
                descansoActivo ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="surface mt-4 flex flex-col gap-5 rounded-[var(--radius-3)] border border-[var(--border-default)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span id="movimiento-label" className="block text-sm font-medium text-[var(--text-body)]">
              Reducir movimiento
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-[var(--text-muted)]">
              Detiene ondas, fundidos y transiciones de la aplicación. Si el sistema operativo ya lo pide, permanece activo.
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={movimientoReducido}
            aria-labelledby="movimiento-label"
            onClick={() => setMovimientoReducido(!movimientoReducido)}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
              movimientoReducido
                ? 'border-[var(--color-action)] bg-[var(--color-action)]'
                : 'border-[var(--border-default)] bg-[var(--surface-sunken)]'
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block size-5 rounded-full bg-[var(--surface-card)] shadow ${
                movimientoReducido ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>
    </div>
  )
}
