# Feature: Documentación de APIs

Diseño técnico + **estado de implementación**. Guía de “qué hacer tú”: **[guia-operativa.md](./guia-operativa.md)**.

|          |                                                                                            |
| -------- | ------------------------------------------------------------------------------------------ |
| UI       | `cm-toolbox-front`                                                                         |
| API      | `cm-docs-ms` en `~/Escritorio/local/cm-docs-ms`                                            |
| Opciones | **B** (lectura) + **C** (publish) + **puerta clientes** implementadas en código            |
| Storage  | Postgres (`cm_toolbox_docs`, misma instancia que access) o `SPECS_DRIVER=local` para tests |

## Orden de lectura

| #   | Doc                                                    | Qué sacar                                                        |
| --- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| 0   | [guia-operativa.md](./guia-operativa.md)               | **Empieza aquí** si vas a correr / demos / pedir IAM             |
| 1   | [front.md](./front.md)                                 | UI, rutas, CA-F\*, archivos                                      |
| 2   | [back.md](./back.md)                                   | MS, CA-B\*, capas, seed                                          |
| 3   | [contrato-http.md](./contrato-http.md)                 | Paths y payloads                                                 |
| 4   | [decisiones.md](./decisiones.md)                       | ADRs                                                             |
| 5   | [seguridad.md](./seguridad.md)                         | AuthN/Z                                                          |
| 6   | [runbook-local.md](./runbook-local.md)                 | Humo local                                                       |
| 7   | [auth-clientes.md](./auth-clientes.md)                 | Fase clientes / identidad                                        |
| 8   | [check-opcion-c.md](./check-opcion-c.md)               | Publish (GO — ya implementado)                                   |
| 9   | [peticion-iam-keycloak.md](./peticion-iam-keycloak.md) | Texto para pedir el client OIDC a identidad                      |
| 10  | [admin-operacion.md](./admin-operacion.md)             | Crear doc, asignar, clientes y link de activación (implementado) |
| 11  | [persistencia-postgres.md](./persistencia-postgres.md) | Persistencia en Postgres (`cm_toolbox_docs`)                     |

## Objetivo de producto

Portal para consultar OpenAPI vigente con acceso controlado (internos y clientes), en lugar de reenviar PDF.

## Qué se implementó

### `cm-docs-ms`

- Express + Inversify + hexagonal
- `GET /health`, `GET /v1/apis`, `GET /v1/apis/:apiId`, `GET .../openapi`, `POST .../specs`, admin `/v1/admin/*`
- Persistencia: `SPECS_DRIVER=postgres` → DB `cm_toolbox_docs` (misma instancia access `:5433`); `local` → `data/`
- Auth: `AUTH_MODE=disabled` (dev) con `X-Dev-Audiences` / `X-Dev-Can-Publish` / `X-Dev-Can-Manage`; Keycloak JWKS listo por env
- Claims: `internal` por defecto; `client:<id>` vía claim configurable; publish/manage
- Seed: SQL `sql/002_seed_docs.sql` (+ JSON en `data/` para driver local)
- Tests Jest de audiencias + HTTP (local) + CA-P\* (Postgres)

### `cm-toolbox-front`

| Ruta                               | Comportamiento                                                           |
| ---------------------------------- | ------------------------------------------------------------------------ |
| Hub + `/docs`, `/docs/:apiId`      | Catálogo, visor OpenAPI ligero, publish (solo internos)                  |
| `/cliente/login`, `/cliente/docs*` | Shell mínimo, sin Google; en bypass local “Entrar (dev)” → `client:demo` |
| Proxy `/docs-api`                  | Vite + nginx → `DOCS_API_UPSTREAM` (default `:8082`)                     |

Archivos clave:

- `src/features/docs/` — API client, páginas, publish form, visor
- `src/features/docs-cliente/` — login, shell, guards, token propio
- `src/shared/auth/access-types.ts` — app `docs` en catálogo fallback
- `vite.config.ts`, `nginx/default.conf.template`, `.env.example`

### Visor OpenAPI

Se usó un **visor ligero** (`openapi-viewer.tsx`) que lista paths/métodos, para no romper CSP. Sustituible por Scalar/Redoc sin cambiar rutas ni contrato (ADR-004).

## Fuera de alcance (sigue fuera)

- PDF por correo como fuente de verdad
- Editor WYSIWYG
- Repo aparte de specs de negocio
- Bucket GCS
- Provisionar Keycloak corporativo (lo hace identidad)

## Estado

| Ítem                                    | Estado                                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Diseño                                  | Listo                                                                                                    |
| Implementación B                        | **Hecha**                                                                                                |
| Implementación C                        | **Hecha** (check = GO)                                                                                   |
| Puerta clientes (código)                | **Hecha**                                                                                                |
| Keycloak client OIDC clientes (prod)    | **Pendiente identidad** — código listo; pedir con [peticion-iam-keycloak.md](./peticion-iam-keycloak.md) |
| Cableado OIDC clientes (SPA + MS)       | **Hecho** (sesión/callback/refresh; `KEYCLOAK_AUDIENCE` multi-aud)                                       |
| Alta app `docs` en access-ms            | **Hecha** en seed + `sql/005_seed_docs_app.sql` (ambientes viejos)                                       |
| Gaps 401 + guards cruzados (CA-C04/C-G) | **Hechos** en front                                                                                      |
| Guía operativa                          | [guia-operativa.md](./guia-operativa.md)                                                                 |
| Crear doc / asignar / clientes / mail   | **Hecha** — [admin-operacion.md](./admin-operacion.md)                                                   |
| Persistencia Postgres                   | **Hecha** — [persistencia-postgres.md](./persistencia-postgres.md) (DB `cm_toolbox_docs` en `:5433`)     |

## Prompt para mantenimiento (agente)

```text
La feature Docs ya está implementada (B+C+clientes).
Lee docs/docs-feature/guia-operativa.md y el README.
No reimplementes desde cero; corrige o extiende sobre cm-docs-ms y src/features/docs*.
Respeta contrato-http.md y audiencias. Storage local. Sin GCS ni PDF.
```
