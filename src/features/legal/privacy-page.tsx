import { Link } from "react-router";
import { LegalDocumentShell } from "@/shared/ui/legal-document-shell";

export const PrivacyPage = () => {
  return (
    <LegalDocumentShell
      badge={<span>Habeas Data &bull; Ley 1581 de 2012</span>}
      accessibleTitle="Política de Privacidad y Tratamiento de Datos"
      before="Política de "
      accent="Privacidad"
      after=" y Tratamiento de Datos"
      subtitle={
        <>
          Última actualización: Septiembre 2026 &bull; Coordinadora Mercantil
          S.A.
        </>
      }
    >
      <section
        style={{ boxShadow: "var(--shadow-1)" }}
        className="surface rounded-[var(--radius-2)] border border-[var(--border-default)] p-5 sm:p-6"
      >
        <h2 className="text-base font-bold text-[var(--text-body)] mb-2">
          1. Identificación del Responsable
        </h2>
        <p className="text-[var(--text-muted)]">
          Coordinadora Mercantil S.A. (en adelante, &quot;Coordinadora&quot;),
          sociedad comercial identificada con NIT 890.901.050-1, con domicilio
          principal en Calle 30A # 6-38, Medellín, Colombia, actúa como
          Responsable del Tratamiento de los datos personales recopilados y
          gestionados a través de este portal de herramientas operativas.
        </p>
      </section>

      <section
        style={{ boxShadow: "var(--shadow-1)" }}
        className="surface rounded-[var(--radius-2)] border border-[var(--border-default)] p-5 sm:p-6"
      >
        <h2 className="text-base font-bold text-[var(--text-body)] mb-2">
          2. Finalidad del Tratamiento de Datos
        </h2>
        <p className="text-[var(--text-muted)] mb-3">
          Los datos personales y de trazabilidad operativa capturados por las
          herramientas (tales como identificadores de usuario corporativo,
          correos electrónicos y referencias técnicas de cada operación) se
          procesan exclusivamente con los siguientes propósitos:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-[var(--text-muted)]">
          <li>
            Autenticación y autorización corporativa mediante Keycloak y
            proveedores de identidad corporativos.
          </li>
          <li>
            Diagnóstico, validación técnica, monitoreo y auditoría de los
            procesos internos soportados por el toolbox.
          </li>
          <li>
            Monitoreo de seguridad, prevención de accesos no autorizados y
            registro de trazas operativas (logs).
          </li>
          <li>
            Medición de métricas de rendimiento y optimización continua de la
            experiencia de usuario.
          </li>
        </ul>
      </section>

      <section
        style={{ boxShadow: "var(--shadow-1)" }}
        className="surface rounded-[var(--radius-2)] border border-[var(--border-default)] p-5 sm:p-6"
      >
        <h2 className="text-base font-bold text-[var(--text-body)] mb-2">
          3. Uso de Cookies y Almacenamiento Local
        </h2>
        <p className="text-[var(--text-muted)] mb-3">
          Esta aplicación utiliza cookies estrictamente técnicas y
          almacenamiento web local (
          <code className="rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-primary)]">
            localStorage
          </code>{" "}
          y{" "}
          <code className="rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-primary)]">
            sessionStorage
          </code>
          ) para:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-[var(--text-muted)]">
          <li>
            Preservar la sesión autenticada del usuario y tokens OAuth2/OIDC.
          </li>
          <li>
            Almacenar preferencias de interfaz (modo claro u oscuro, vista lista
            o cuadrícula).
          </li>
          <li>
            Guardar borradores temporales de consulta para evitar pérdida de
            trabajo ante recargas.
          </li>
        </ul>
      </section>

      <section
        style={{ boxShadow: "var(--shadow-1)" }}
        className="surface rounded-[var(--radius-2)] border border-[var(--border-default)] p-5 sm:p-6"
      >
        <h2 className="text-base font-bold text-[var(--text-body)] mb-2">
          4. Derechos de los Titulares
        </h2>
        <p className="text-[var(--text-muted)]">
          Conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013, los
          titulares de los datos tienen derecho a conocer, actualizar,
          rectificar y solicitar la supresión de sus datos personales. Para
          ejercer estos derechos, puede comunicarse a través de nuestro canal
          oficial{" "}
          <a
            href="mailto:habeasdata@coordinadora.com"
            className="font-semibold text-[var(--color-primary)] hover:underline"
          >
            habeasdata@coordinadora.com
          </a>{" "}
          o consultar en nuestra página de{" "}
          <Link
            to="/contacto"
            className="font-semibold text-[var(--color-primary)] hover:underline"
          >
            contacto
          </Link>
          .
        </p>
      </section>
    </LegalDocumentShell>
  );
};
