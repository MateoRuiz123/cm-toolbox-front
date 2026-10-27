# Decisiones de arquitectura (ADR corto)

Registro de decisiones para que el agente de desarrollo no reabra debates ya cerrados o deje explícitas las pendientes.

Formato: contexto → decisión → alternativas → consecuencias → estado.

---

## ADR-001 — Separación front / back

|                   |                                                                                   |
| ----------------- | --------------------------------------------------------------------------------- |
| **Estado**        | Aceptada                                                                          |
| **Contexto**      | Hay que servir OpenAPI con control de acceso y no repetir el anti-patrón del PDF. |
| **Decisión**      | UI en `cm-toolbox-front`; autoridad de catálogo/spec/authz en `cm-docs-ms`.       |
| **Alternativas**  | Solo front con archivos en `public/`; producto SaaS externo.                      |
| **Consecuencias** | Proxy `/docs-api/`, variables `DOCS_API_UPSTREAM`, dos repos/despliegues.         |

---

## ADR-002 — Opción B primero, C como check

|                   |                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| **Estado**        | Aceptada                                                                                              |
| **Contexto**      | Upload YAML y admin son deseables pero no bloquean el valor (consultar docs vigentes).                |
| **Decisión**      | Implementar B (listar + servir spec + authz). Evaluar C con [check-opcion-c.md](./check-opcion-c.md). |
| **Alternativas**  | Empezar por admin+upload; solo CI sin API.                                                            |
| **Consecuencias** | El agente no implementa `POST .../specs` ni UI admin hasta check verde.                               |

---

## ADR-003 — Framework HTTP del MS

|                            |                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Estado**                 | Provisional — default para el agente                                                                     |
| **Contexto**               | `cm-logs-ms` usa Express; `cm-api-replicacion-ms` usa Fastify + plantilla corporativa.                   |
| **Decisión**               | **Default: Express + Inversify + hexagonal como `cm-logs-ms`**, por ser MS hermano del toolbox.          |
| **Alternativas**           | Fastify plantilla replicación.                                                                           |
| **Consecuencias**          | Si IAM/arquitectura exige Fastify, mantener el mismo contrato y capas; solo cambia `infrastructure/api`. |
| **Resolver antes de prod** | Confirmar con el equipo si la plantilla Fastify es obligatoria.                                          |

---

## ADR-004 — Visor OpenAPI en el front

|                        |                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Estado**             | Aceptada (implementada)                                                                                                    |
| **Contexto**           | Hay que renderizar OpenAPI 3.x dentro del diseño del toolbox sin romper CSP.                                               |
| **Decisión**           | **Visor ligero propio** (`src/features/docs/openapi-viewer.tsx`): paths + métodos + summaries.                             |
| **Alternativas**       | Scalar; Swagger UI; Redoc.                                                                                                 |
| **Consecuencias**      | Sin dependencia pesada; suficiente para demo y lectura. Se puede sustituir por Scalar/Redoc sin cambiar rutas ni contrato. |
| **Criterio de cambio** | Si producto exige try-it-out / UI rica, evaluar Scalar/Redoc y validar CSP.                                                |

---

## ADR-005 — Storage de specs

|                   |                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| **Estado**        | Provisional — default para el agente                                                                |
| **Contexto**      | Dev local sin GCP vs deploy Cloud Run.                                                              |
| **Decisión**      | Driver `local` (FS) en desarrollo; driver `gcs` (o compatible) en deploy. Interfaz de puerto única. |
| **Alternativas**  | Solo GCS; solo repo git leído en runtime.                                                           |
| **Consecuencias** | `SPECS_DRIVER`, `SPECS_LOCAL_DIR`, `GCS_BUCKET`. Specs normalizadas a JSON en storage.              |

---

## ADR-006 — Metadata de catálogo

|                   |                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| **Estado**        | Provisional — default para el agente                                                            |
| **Contexto**      | Hay que filtrar por audiencia sin montar un ERP.                                                |
| **Decisión**      | MVP: **archivo JSON de catálogo** (`CATALOG_PATH`) versionable.                                 |
| **Alternativas**  | Firestore; Postgres.                                                                            |
| **Consecuencias** | Suficiente para 1–N APIs de la práctica; migrable a Firestore sin cambiar el puerto de dominio. |

---

## ADR-007 — Claims Keycloak / audiencias

|                              |                                                                                                                                                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Estado**                   | Aceptada (MVP + objetivo fase clientes)                                                                                                                                                                                                                        |
| **Contexto**                 | Internos vs clientes externos.                                                                                                                                                                                                                                 |
| **Decisión MVP (B interno)** | Mientras no exista la puerta clientes en prod: todo usuario que autentica el toolbox interno ve APIs con audiencia `internal`.                                                                                                                                 |
| **Decisión fase clientes**   | Audiencias `internal` y `client:<id>`; el MS mapea claims JWT → `TokenClaims.audiences` vía env (`DOCS_CLIENT_AUDIENCE_CLAIM`, prefijo). Token con solo `client:x` **no** recibe `internal` por defecto. Publish con rol/claim `docs:publish` (solo internos). |
| **Consecuencias**            | El filtro por audiencia existe desde el día 1; el mapeo real de clientes se activa con IAM + [auth-clientes.md](./auth-clientes.md).                                                                                                                           |
| **Bloqueante prod clientes** | Client OIDC + claim acordados con identidad (ver ADR-011).                                                                                                                                                                                                     |

---

## ADR-008 — Proxy same-origin

|                   |                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------- |
| **Estado**        | Aceptada                                                                            |
| **Contexto**      | Diagnóstico y logs ya usan proxy nginx/Vite.                                        |
| **Decisión**      | El navegador solo llama `/docs-api/...`; nginx/Vite reenvían a `DOCS_API_UPSTREAM`. |
| **Alternativas**  | URL absoluta `VITE_DOCS_API_URL` en el bundle.                                      |
| **Consecuencias** | Menor fricción CSP; misma validación de upstream que logs.                          |

---

## ADR-009 — No PDF como canal principal

|                   |                                                                     |
| ----------------- | ------------------------------------------------------------------- |
| **Estado**        | Aceptada                                                            |
| **Contexto**      | El problema original es el reenvío de PDF.                          |
| **Decisión**      | Fuente de verdad = OpenAPI en portal. Correo (later) solo con link. |
| **Alternativas**  | Generar PDF desde OpenAPI y adjuntarlo.                             |
| **Consecuencias** | El agente no implementa generación/envío de PDF en el MVP.          |

---

## ADR-010 — Puertas separadas internos / clientes

|                   |                                                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Estado**        | Aceptada                                                                                                                                                                                  |
| **Contexto**      | Mezclar Google y NIT+clave en la misma pantalla genera confusión y riesgo de que un cliente entre al hub.                                                                                 |
| **Decisión**      | Mismo SPA/deploy; **dos puertas**: internos (`AuthGate` + Google → hub → `/docs`); clientes (`/cliente/login` usuario+clave → solo `/cliente/docs*`). Shell cliente sin tarjetas del hub. |
| **Alternativas**  | Segundo dominio/SPA; un solo login con dos botones.                                                                                                                                       |
| **Consecuencias** | Rutas y AuthGate distintos; 401 de cliente redirige a `/cliente/login`, no al Google interno. Detalle: [auth-clientes.md](./auth-clientes.md).                                            |

---

## ADR-011 — Keycloak client OIDC para clientes

|                   |                                                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Estado**        | Aceptada (pendiente provisión IAM)                                                                                                                                |
| **Contexto**      | Acceso persistente (cuenta permanente); correo solo para activar/reset.                                                                                           |
| **Decisión**      | Misma plataforma Keycloak; **client OIDC distinto** para clientes; IdP Google **deshabilitado** en ese client; username/password; atributo → claim `client:<id>`. |
| **Alternativas**  | Realm separado; magic link diario; cuentas solo en el MS.                                                                                                         |
| **Consecuencias** | Front: segundo `clientId` / init Keycloak. MS: aceptar aud/issuer acordados. Bloqueante operativo con IAM antes de prod.                                          |

---

## Resumen para el agente

| ID                      | Acción al implementar                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| 001, 002, 008, 009, 010 | Seguir sin preguntar                                                                                         |
| 004                     | Visor ligero implementado; Scalar/Redoc opcionales después                                                   |
| 003, 005, 006           | Defaults documentados; storage = local (sin GCS)                                                             |
| 007                     | Implementar filtro `audiences`; mapeo claims configurable; MVP B = `internal`; fase clientes = `client:<id>` |
| 011                     | No desplegar `/cliente` a prod sin client OIDC + claim IAM                                                   |
