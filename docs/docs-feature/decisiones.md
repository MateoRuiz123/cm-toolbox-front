# Decisiones de arquitectura (ADR corto)

Registro de decisiones para que el agente de desarrollo no reabra debates ya cerrados o deje explícitas las pendientes.

Formato: contexto → decisión → alternativas → consecuencias → estado.

---

## ADR-001 — Separación front / back

| | |
| --- | --- |
| **Estado** | Aceptada |
| **Contexto** | Hay que servir OpenAPI con control de acceso y no repetir el anti-patrón del PDF. |
| **Decisión** | UI en `cm-toolbox-front`; autoridad de catálogo/spec/authz en `cm-docs-ms`. |
| **Alternativas** | Solo front con archivos en `public/`; producto SaaS externo. |
| **Consecuencias** | Proxy `/docs-api/`, variables `DOCS_API_UPSTREAM`, dos repos/despliegues. |

---

## ADR-002 — Opción B primero, C como check

| | |
| --- | --- |
| **Estado** | Aceptada |
| **Contexto** | Upload YAML y admin son deseables pero no bloquean el valor (consultar docs vigentes). |
| **Decisión** | Implementar B (listar + servir spec + authz). Evaluar C con [check-opcion-c.md](./check-opcion-c.md). |
| **Alternativas** | Empezar por admin+upload; solo CI sin API. |
| **Consecuencias** | El agente no implementa `POST .../specs` ni UI admin hasta check verde. |

---

## ADR-003 — Framework HTTP del MS

| | |
| --- | --- |
| **Estado** | Provisional — default para el agente |
| **Contexto** | `cm-logs-ms` usa Express; `cm-api-replicacion-ms` usa Fastify + plantilla corporativa. |
| **Decisión** | **Default: Express + Inversify + hexagonal como `cm-logs-ms`**, por ser MS hermano del toolbox. |
| **Alternativas** | Fastify plantilla replicación. |
| **Consecuencias** | Si IAM/arquitectura exige Fastify, mantener el mismo contrato y capas; solo cambia `infrastructure/api`. |
| **Resolver antes de prod** | Confirmar con el equipo si la plantilla Fastify es obligatoria. |

---

## ADR-004 — Visor OpenAPI en el front

| | |
| --- | --- |
| **Estado** | Provisional — default para el agente |
| **Contexto** | Hay que renderizar OpenAPI 3.x dentro del diseño del toolbox. |
| **Decisión** | **Default: Scalar** cargado con import dinámico / lazy. |
| **Alternativas** | Swagger UI; Redoc. |
| **Consecuencias** | Dependencia nueva; aislar en chunk aparte del hub. |
| **Criterio de cambio** | Si Scalar complica CSP o bundle, caer a Redoc (lectura) o Swagger UI. |

---

## ADR-005 — Storage de specs

| | |
| --- | --- |
| **Estado** | Provisional — default para el agente |
| **Contexto** | Dev local sin GCP vs deploy Cloud Run. |
| **Decisión** | Driver `local` (FS) en desarrollo; driver `gcs` (o compatible) en deploy. Interfaz de puerto única. |
| **Alternativas** | Solo GCS; solo repo git leído en runtime. |
| **Consecuencias** | `SPECS_DRIVER`, `SPECS_LOCAL_DIR`, `GCS_BUCKET`. Specs normalizadas a JSON en storage. |

---

## ADR-006 — Metadata de catálogo

| | |
| --- | --- |
| **Estado** | Provisional — default para el agente |
| **Contexto** | Hay que filtrar por audiencia sin montar un ERP. |
| **Decisión** | MVP: **archivo JSON de catálogo** (`CATALOG_PATH`) versionable. |
| **Alternativas** | Firestore; Postgres. |
| **Consecuencias** | Suficiente para 1–N APIs de la práctica; migrable a Firestore sin cambiar el puerto de dominio. |

---

## ADR-007 — Claims Keycloak / audiencias

| | |
| --- | --- |
| **Estado** | Abierta — MVP seguro |
| **Contexto** | Internos vs clientes externos. |
| **Decisión MVP** | Mientras no existan claims de cliente: todo usuario que autentica el toolbox ve APIs con audiencia `internal`. |
| **Decisión objetivo** | Audiencias `internal` y `client:<id>`; publish con rol/claim `docs:publish`. |
| **Consecuencias** | El agente implementa el filtro por audiencia desde el día 1; el mapeo de claims se configura por env/código cuando IAM lo defina. |
| **Bloqueante para clientes externos** | Definir realm/client y claims con el equipo de identidad. |

---

## ADR-008 — Proxy same-origin

| | |
| --- | --- |
| **Estado** | Aceptada |
| **Contexto** | Diagnóstico y logs ya usan proxy nginx/Vite. |
| **Decisión** | El navegador solo llama `/docs-api/...`; nginx/Vite reenvían a `DOCS_API_UPSTREAM`. |
| **Alternativas** | URL absoluta `VITE_DOCS_API_URL` en el bundle. |
| **Consecuencias** | Menor fricción CSP; misma validación de upstream que logs. |

---

## ADR-009 — No PDF como canal principal

| | |
| --- | --- |
| **Estado** | Aceptada |
| **Contexto** | El problema original es el reenvío de PDF. |
| **Decisión** | Fuente de verdad = OpenAPI en portal. Correo (later) solo con link. |
| **Alternativas** | Generar PDF desde OpenAPI y adjuntarlo. |
| **Consecuencias** | El agente no implementa generación/envío de PDF en el MVP. |

---

## Resumen para el agente

| ID | Acción al implementar |
| --- | --- |
| 001, 002, 008, 009 | Seguir sin preguntar |
| 003, 004, 005, 006 | Usar el **default** documentado; no bloquearse |
| 007 | Implementar filtro `audiences`; mapeo claims configurable; MVP = `internal` |
