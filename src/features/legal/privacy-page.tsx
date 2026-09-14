import { Link } from '../../shared/router/router-context'

export const PrivacyPage = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
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
          <span>Habeas Data &bull; Ley 1581 de 2012</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-body)] mb-2">
          Política de Privacidad y Tratamiento de Datos
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Última actualización: Septiembre 2026 &bull; Coordinadora Mercantil S.A.
        </p>
      </header>

      <article className="space-y-6 text-sm leading-relaxed text-[var(--text-body)]">
        <section
          style={{ boxShadow: 'var(--shadow-1)' }}
          className="surface rounded-[var(--radius-2)] border border-[var(--border-default)] p-5 sm:p-6"
        >
          <h2 className="text-base font-bold text-[var(--text-body)] mb-2">
            1. Identificación del Responsable
          </h2>
          <p className="text-[var(--text-muted)]">
            Coordinadora Mercantil S.A. (en adelante, &quot;Coordinadora&quot;), sociedad comercial identificada con NIT 890.901.050-1, con domicilio principal en Calle 30A # 6-38, Medellín, Colombia, actúa como Responsable del Tratamiento de los datos personales recopilados y gestionados a través de este portal de herramientas operativas.
          </p>
        </section>

        <section
          style={{ boxShadow: 'var(--shadow-1)' }}
          className="surface rounded-[var(--radius-2)] border border-[var(--border-default)] p-5 sm:p-6"
        >
          <h2 className="text-base font-bold text-[var(--text-body)] mb-2">
            2. Finalidad del Tratamiento de Datos
          </h2>
          <p className="text-[var(--text-muted)] mb-3">
            Los datos personales y de trazabilidad operativa capturados (tales como identificadores de usuario corporativo, correos electrónicos, terminales de despacho y códigos de remisión) se procesan exclusivamente con los siguientes propósitos:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-[var(--text-muted)]">
            <li>Autenticación y autorización corporativa mediante Keycloak y proveedores de identidad corporativos.</li>
            <li>Diagnóstico, validación técnica y auditoría en los procesos de migración entre sistemas de información (AGW y CM).</li>
            <li>Monitoreo de seguridad, prevención de accesos no autorizados y registro de trazas operativas (logs).</li>
            <li>Medición de métricas de rendimiento y optimización continua de la experiencia de usuario.</li>
          </ul>
        </section>

        <section
          style={{ boxShadow: 'var(--shadow-1)' }}
          className="surface rounded-[var(--radius-2)] border border-[var(--border-default)] p-5 sm:p-6"
        >
          <h2 className="text-base font-bold text-[var(--text-body)] mb-2">
            3. Uso de Cookies y Almacenamiento Local
          </h2>
          <p className="text-[var(--text-muted)] mb-3">
            Esta aplicación utiliza cookies estrictamente técnicas y almacenamiento web local (<code className="rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-primary)]">localStorage</code> y <code className="rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-primary)]">sessionStorage</code>) para:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-[var(--text-muted)]">
            <li>Preservar la sesión autenticada del usuario y tokens OAuth2/OIDC.</li>
            <li>Almacenar preferencias de interfaz (modo claro u oscuro, vista lista o cuadrícula).</li>
            <li>Guardar borradores temporales de consulta para evitar pérdida de trabajo ante recargas.</li>
          </ul>
        </section>

        <section
          style={{ boxShadow: 'var(--shadow-1)' }}
          className="surface rounded-[var(--radius-2)] border border-[var(--border-default)] p-5 sm:p-6"
        >
          <h2 className="text-base font-bold text-[var(--text-body)] mb-2">
            4. Derechos de los Titulares
          </h2>
          <p className="text-[var(--text-muted)]">
            Conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013, los titulares de los datos tienen derecho a conocer, actualizar, rectificar y solicitar la supresión de sus datos personales. Para ejercer estos derechos, puede comunicarse a través de nuestro canal oficial <a href="mailto:habeasdata@coordinadora.com" className="font-semibold text-[var(--color-primary)] hover:underline">habeasdata@coordinadora.com</a> o consultar en nuestra página de <Link href="/contacto" className="font-semibold text-[var(--color-primary)] hover:underline">contacto</Link>.
          </p>
        </section>
      </article>
    </div>
  )
}
