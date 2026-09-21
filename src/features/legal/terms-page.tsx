import { LegalDocumentShell } from '@/shared/ui/legal-document-shell'

export const TermsPage = () => {
  return (
    <LegalDocumentShell
      badge={<span>Términos y Condiciones &bull; Uso Autorizado</span>}
      accessibleTitle="Términos y Condiciones de Uso"
      before="Términos y "
      accent="Condiciones"
      after=" de Uso"
      subtitle={<>Portal de Herramientas de Apoyo y Diagnóstico &bull; Coordinadora Mercantil S.A.</>}
    >
      <section
        style={{ boxShadow: 'var(--shadow-1)' }}
        className="surface rounded-[var(--radius-2)] border border-[var(--border-default)] p-5 sm:p-6"
      >
        <h2 className="text-base font-bold text-[var(--text-body)] mb-2">
          1. Ámbito de Aplicación
        </h2>
        <p className="text-[var(--text-muted)]">
          El presente portal y sus módulos integrados (incluyendo la herramienta de diagnóstico de migración, monitoreo y auditoría operativa) son aplicaciones de uso exclusivo para colaboradores, integradores y personal debidamente autorizado por Coordinadora Mercantil S.A. El acceso no autorizado está estrictamente prohibido y puede dar lugar a sanciones disciplinarias y legales.
        </p>
      </section>

      <section
        style={{ boxShadow: 'var(--shadow-1)' }}
        className="surface rounded-[var(--radius-2)] border border-[var(--border-default)] p-5 sm:p-6"
      >
        <h2 className="text-base font-bold text-[var(--text-body)] mb-2">
          2. Responsabilidades del Usuario
        </h2>
        <p className="text-[var(--text-muted)] mb-3">
          Al acceder a la plataforma, el usuario se compromete a:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-[var(--text-muted)]">
          <li>Mantener la estricta confidencialidad de sus credenciales corporativas (Keycloak / Google Workspace corporativo).</li>
          <li>Utilizar las herramientas de re-migración y diagnóstico de acuerdo con los protocolos operativos vigentes.</li>
          <li>No realizar consultas masivas automatizadas no justificadas que degraden el rendimiento de las bases de datos o servicios backend.</li>
          <li>Reportar inmediatamente cualquier vulnerabilidad o comportamiento anómalo al equipo de soporte de TI.</li>
        </ul>
      </section>

      <section
        style={{ boxShadow: 'var(--shadow-1)' }}
        className="surface rounded-[var(--radius-2)] border border-[var(--border-default)] p-5 sm:p-6"
      >
        <h2 className="text-base font-bold text-[var(--text-body)] mb-2">
          3. Propiedad Intelectual
        </h2>
        <p className="text-[var(--text-muted)]">
          Todos los derechos de propiedad intelectual, marcas, logotipos, código fuente, componentes visuales del sistema SIGO Droop y contenidos presentados en esta plataforma son propiedad exclusiva de Coordinadora Mercantil S.A. o de sus respectivos licenciantes.
        </p>
      </section>

      <section
        style={{ boxShadow: 'var(--shadow-1)' }}
        className="surface rounded-[var(--radius-2)] border border-[var(--border-default)] p-5 sm:p-6"
      >
        <h2 className="text-base font-bold text-[var(--text-body)] mb-2">
          4. Modificaciones y Vigencia
        </h2>
        <p className="text-[var(--text-muted)]">
          Coordinadora se reserva el derecho de actualizar, modificar o discontinuar cualquier componente de este portal en cualquier momento sin previo aviso, en el marco del mantenimiento y evolución continua de su arquitectura tecnológica.
        </p>
      </section>
    </LegalDocumentShell>
  )
}
