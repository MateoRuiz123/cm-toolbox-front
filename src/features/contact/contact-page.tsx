import { useState, type FormEvent } from 'react'
import { Link } from '../../shared/router/router-context'
import { useRouter } from '../../shared/router/use-router'

interface FormContactState {
  nombre: string
  email: string
  asunto: string
  mensaje: string
}

interface FormContactErrors {
  nombre?: string
  email?: string
  asunto?: string
  mensaje?: string
}

export const ContactPage = () => {
  const { navigate } = useRouter()
  const [formData, setFormData] = useState<FormContactState>({
    nombre: '',
    email: '',
    asunto: 'diagnostico',
    mensaje: '',
  })
  const [errors, setErrors] = useState<FormContactErrors>({})
  const [enviando, setEnviando] = useState(false)

  const validate = (): boolean => {
    const nuevosErrores: FormContactErrors = {}

    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es requerido.'
    } else if (formData.nombre.trim().length < 3) {
      nuevosErrores.nombre = 'Ingresa al menos 3 caracteres.'
    }

    if (!formData.email.trim()) {
      nuevosErrores.email = 'El correo electrónico es requerido.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      nuevosErrores.email = 'Ingresa un correo electrónico válido.'
    }

    if (!formData.asunto.trim()) {
      nuevosErrores.asunto = 'Selecciona o ingresa un asunto.'
    }

    if (!formData.mensaje.trim()) {
      nuevosErrores.mensaje = 'El mensaje no puede estar vacío.'
    } else if (formData.mensaje.trim().length < 10) {
      nuevosErrores.mensaje = 'Describe tu consulta con al menos 10 caracteres.'
    }

    setErrors(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) return

    setEnviando(true)
    setTimeout(() => {
      setEnviando(false)
      navigate('/gracias')
    }, 400)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] hover:underline"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Volver al portal</span>
        </Link>
      </div>

      <header className="mb-8 border-b border-[var(--border-default)] pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1 text-xs font-medium text-[var(--text-muted)] shadow-2xs mb-3">
          <span className="size-2 rounded-full bg-[var(--color-primary)]" />
          <span>Atención y Soporte Institucional</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-body)] mb-2">
          Contacto y Soporte de TI
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Canales de atención directa para reportes, consultas técnicas y gestión operativa de Coordinadora Mercantil S.A.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Columna Izquierda: Información de Contacto Real */}
        <section
          style={{ boxShadow: 'var(--shadow-1)' }}
          className="surface space-y-6 rounded-[var(--radius-2)] border border-[var(--border-default)] p-6 sm:p-8"
        >
          <h2 className="text-lg font-bold text-[var(--text-body)] tracking-tight">
            Coordinadora Mercantil S.A.
          </h2>

          <div className="space-y-4 text-sm text-[var(--text-body)]">
            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-1)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <strong className="block font-semibold">Sede Principal Nacional:</strong>
                <span className="text-[var(--text-muted)]">Calle 30A # 6-38, Medellín, Antioquia, Colombia</span>
                <span className="block text-xs text-[var(--text-muted)]">Código Postal: 050015 &bull; NIT: 890.901.050-1</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-1)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <strong className="block font-semibold">Líneas Telefónicas:</strong>
                <span className="text-[var(--text-muted)]">PBX Medellín: +57 (604) 310 3100</span>
                <span className="block text-[var(--text-muted)]">Línea Nacional Gratuita: 01 8000 915 035</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-1)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <strong className="block font-semibold">Canales de Correo:</strong>
                <span className="block text-[var(--text-muted)]">Soporte Técnico TI: <a href="mailto:soporte.ti@coordinadora.com" className="text-[var(--color-primary)] hover:underline">soporte.ti@coordinadora.com</a></span>
                <span className="block text-[var(--text-muted)]">Atención General: <a href="mailto:contacto@coordinadora.com" className="text-[var(--color-primary)] hover:underline">contacto@coordinadora.com</a></span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-1)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <strong className="block font-semibold">Horario de Atención:</strong>
                <span className="text-[var(--text-muted)]">Lunes a Viernes: 7:00 a.m. a 6:00 p.m.</span>
                <span className="block text-[var(--text-muted)]">Sábados: 8:00 a.m. a 12:00 m.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Columna Derecha: Formulario de Contacto / Reporte con validación accesible */}
        <section
          style={{ boxShadow: 'var(--shadow-1)' }}
          className="surface rounded-[var(--radius-2)] border border-[var(--border-default)] p-6 sm:p-8"
        >
          <h2 className="text-lg font-bold text-[var(--text-body)] tracking-tight mb-2">
            Envíanos un Mensaje
          </h2>
          <p className="text-xs text-[var(--text-muted)] mb-6">
            Diligencia el formulario para reportar incidencias con guías, solicitar acceso o formular dudas técnicas.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="nombre" className="block text-xs font-bold text-[var(--text-body)] mb-1">
                Nombre Completo *
              </label>
              <input
                id="nombre"
                type="text"
                value={formData.nombre}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                  if (errors.nombre) setErrors((prev) => ({ ...prev, nombre: undefined }))
                }}
                aria-invalid={Boolean(errors.nombre)}
                aria-describedby={errors.nombre ? 'nombre-error' : undefined}
                placeholder="Ej. Juan Pérez"
                className={`w-full rounded-[var(--radius-1)] border bg-[var(--surface-card)] px-3.5 py-2 text-sm text-[var(--text-body)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 ${
                  errors.nombre
                    ? 'border-[var(--state-error)] focus:border-[var(--state-error)] focus:ring-[var(--state-error)]'
                    : 'border-[var(--border-default)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
                }`}
              />
              {errors.nombre && (
                <p id="nombre-error" role="alert" className="mt-1 text-xs text-[var(--state-error)]">
                  {errors.nombre}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-[var(--text-body)] mb-1">
                Correo Corporativo *
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                }}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                placeholder="usuario@coordinadora.com"
                className={`w-full rounded-[var(--radius-1)] border bg-[var(--surface-card)] px-3.5 py-2 text-sm text-[var(--text-body)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 ${
                  errors.email
                    ? 'border-[var(--state-error)] focus:border-[var(--state-error)] focus:ring-[var(--state-error)]'
                    : 'border-[var(--border-default)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
                }`}
              />
              {errors.email && (
                <p id="email-error" role="alert" className="mt-1 text-xs text-[var(--state-error)]">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="asunto" className="block text-xs font-bold text-[var(--text-body)] mb-1">
                Motivo de Consulta *
              </label>
              <select
                id="asunto"
                value={formData.asunto}
                onChange={(e) => setFormData((prev) => ({ ...prev, asunto: e.target.value }))}
                className="w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-body)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              >
                <option value="diagnostico">Fallo en Diagnóstico o Re-migración de Guía</option>
                <option value="permisos">Solicitud de Acceso o Permisos</option>
                <option value="pubsub">Incidencia en Tópicos Pub/Sub</option>
                <option value="otro">Otra Consulta / Sugerencia</option>
              </select>
            </div>

            <div>
              <label htmlFor="mensaje" className="block text-xs font-bold text-[var(--text-body)] mb-1">
                Mensaje o Detalle del Caso *
              </label>
              <textarea
                id="mensaje"
                rows={4}
                value={formData.mensaje}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, mensaje: e.target.value }))
                  if (errors.mensaje) setErrors((prev) => ({ ...prev, mensaje: undefined }))
                }}
                aria-invalid={Boolean(errors.mensaje)}
                aria-describedby={errors.mensaje ? 'mensaje-error' : undefined}
                placeholder="Indica el código de remisión o descripción de la incidencia..."
                className={`w-full resize-y rounded-[var(--radius-1)] border bg-[var(--surface-card)] px-3.5 py-2 text-sm text-[var(--text-body)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 ${
                  errors.mensaje
                    ? 'border-[var(--state-error)] focus:border-[var(--state-error)] focus:ring-[var(--state-error)]'
                    : 'border-[var(--border-default)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
                }`}
              />
              {errors.mensaje && (
                <p id="mensaje-error" role="alert" className="mt-1 text-xs text-[var(--state-error)]">
                  {errors.mensaje}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-60"
            >
              {enviando ? (
                <span>Enviando mensaje...</span>
              ) : (
                <>
                  <span>Enviar mensaje</span>
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
