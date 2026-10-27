# Feature: persistencia Postgres para `cm-docs-ms`

Sustituye el almacenamiento en disco (`data/catalog.json`, `data/specs/*`, `data/clients.json`) por **PostgreSQL**, reutilizando la **misma instancia** que `cm-toolbox-access-ms`, con **base (o esquema) separada**.

| Campo       | Valor                                                                   |
| ----------- | ----------------------------------------------------------------------- |
| Estado      | Implementado                                                            |
| MS          | `cm-docs-ms`                                                            |
| Front       | Sin cambios de contrato HTTP (solo sigue llamando `/docs-api`)          |
| Infra local | Postgres del compose de access (`localhost:5433`), DB `cm_toolbox_docs` |

---

## 1. Objetivo

1. Que catálogo, OpenAPI y (en local) clientes **sobrevivan** a recrear el contenedor del MS.
2. Permitir **varias réplicas** del MS sin discos divergentes.
3. **No** mezclar tablas de RBAC (`cm_toolbox_access`) con documentación.

---

## 2. Decisiones cerradas

| ID      | Decisión                                                                                                                                       |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| ADR-P01 | Misma instancia Postgres que access (compose: puerto host `5433`).                                                                             |
| ADR-P02 | Base dedicada `cm_toolbox_docs` (preferida) **o** esquema `docs` en otra DB — default: **base `cm_toolbox_docs`**.                             |
| ADR-P03 | Usuario de conexión propio del MS (mínimo privilegio solo sobre `cm_toolbox_docs`). No reutilizar el rol de access si se puede evitar.         |
| ADR-P04 | Redis **no** se usa para docs (access lo usa como caché de permisos).                                                                          |
| ADR-P05 | Driver `SPECS_DRIVER=postgres` (prod/local con PG). Driver `local` (JSON) se mantiene solo para tests unitarios / fallback de CI sin Postgres. |
| ADR-P06 | Clientes en prod: Keycloak (`CLIENTS_DRIVER=keycloak`). Tabla `doc_clients` = mirror/local para admin UI y demos; no sustituye identidades.    |
| ADR-P07 | OpenAPI en columna `JSONB` (o `TEXT` + parse). Tamaño máx. sigue 2 MiB en la capa de aplicación.                                               |

---

## 3. Qué migra y qué no

| Hoy (disco)                    | Destino                                             | Notas                                                            |
| ------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------- |
| `data/catalog.json` → apis     | Tabla `apis`                                        | Incluye `audiences text[]`                                       |
| `data/specs/<id>/current.json` | Tabla `api_specs` (o columna `spec_json` en `apis`) | Default: tabla aparte `api_specs` con `api_id` PK y `body jsonb` |
| `data/clients.json`            | Tabla `doc_clients`                                 | Solo si `CLIENTS_DRIVER=local` o como caché de listado admin     |
| Usuarios internos toolbox      | **No tocar** tablas de access                       | Siguen en `cm_toolbox_access.users`                              |
| Cuentas Keycloak clientes      | **No** en Postgres como fuente de auth              | Postgres no envía el correo de activación                        |

---

## 4. Esquema SQL propuesto

Archivo a crear en `cm-docs-ms/sql/` (y opcionalmente montarlo en un init del compose de access **solo** si se documenta crear la DB `cm_toolbox_docs`).

```sql
-- Ejecutar conectado a la base cm_toolbox_docs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS apis (
  id            VARCHAR(64) PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  version       VARCHAR(64) NOT NULL,
  audiences     TEXT[] NOT NULL DEFAULT '{}',
  updated_by    VARCHAR(255),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_apis_id_slug CHECK (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE IF NOT EXISTS api_specs (
  api_id     VARCHAR(64) PRIMARY KEY REFERENCES apis(id) ON DELETE CASCADE,
  body       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_openapi_version CHECK (
    (body->>'openapi') IS NOT NULL AND (body->>'openapi') LIKE '3.%'
  )
);

CREATE TABLE IF NOT EXISTS doc_clients (
  id          VARCHAR(64) PRIMARY KEY,  -- NIT / client id
  name        VARCHAR(200) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  status      VARCHAR(32) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'active', 'disabled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apis_audiences ON apis USING GIN (audiences);
```

Semilla: migrar el contenido actual de `data/catalog.json` + specs + `clients.json` a un `002_seed_docs.sql`.

---

## 5. Cambios en `cm-docs-ms`

### Puertos (dominio)

Mantener interfaces actuales:

- `CatalogRepository` → implementación `PostgresCatalogRepository`
- `SpecRepository` → `PostgresSpecRepository`
- Clientes (si ya existe puerto) → `PostgresClientsRepository` cuando `CLIENTS_DRIVER=local|postgres`

### Env nuevas

| Variable       | Ejemplo                                             | Uso                                |
| -------------- | --------------------------------------------------- | ---------------------------------- |
| `SPECS_DRIVER` | `postgres` \| `local`                               | Default en docker/prod: `postgres` |
| `DATABASE_URL` | `postgres://toolbox@localhost:5433/cm_toolbox_docs` | Connection string                  |
| `PG_POOL_MAX`  | `10`                                                | Opcional                           |

Si `SPECS_DRIVER=postgres` y falta `DATABASE_URL` → **fail-closed** al arrancar.

### Compose / ops

1. En el Postgres de access, crear DB: `CREATE DATABASE cm_toolbox_docs;`
2. Aplicar `sql/001_docs_schema.sql` + seed.
3. Documentar en README de ambos repos: puerto `5433`, DB distinta.
4. **No** añadir tablas docs dentro de `001_schema.sql` de access-ms (evitar acoplamiento de migraciones).

### Tests

- Unit con mock del repositorio **o** Testcontainers / Postgres de compose.
- Integración: crear API, listar por audiencia, publish actualiza `api_specs.body` y `apis.version`.
- Migración one-shot opcional: script que lea JSON y haga UPSERT (para pasar demos locales existentes).

---

## 6. Front

Ningún cambio de contrato. Si `admin-operacion.md` ya usa admin APIs, siguen igual; solo cambia el backend de persistencia.

---

## 7. Criterios de aceptación

| ID     | Criterio                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------- |
| CA-P01 | Con `SPECS_DRIVER=postgres` y DB vacía + seed, `GET /v1/apis` (internal) lista las APIs sembradas |
| CA-P02 | `POST` publish / crear API escribe en PG; reiniciar el proceso MS **sin** perder datos            |
| CA-P03 | Filtro por audiencia `client:demo` igual que con JSON                                             |
| CA-P04 | `SPECS_DRIVER=local` sigue pasando tests existentes (no romper CI sin Postgres)                   |
| CA-P05 | Ninguna query del docs-ms toca tablas de `cm_toolbox_access`                                      |
| CA-P06 | README docs-ms documenta creación de DB + `DATABASE_URL`                                          |

---

## 8. Orden de build

1. SQL schema + seed en `cm-docs-ms/sql/`.
2. Crear DB `cm_toolbox_docs` en el Postgres local de access.
3. Repos Postgres + wiring Inversify por `SPECS_DRIVER`.
4. Tests CA-P\*; conservar driver `local`.
5. Actualizar `.env.example`, README, [guia-operativa.md](./guia-operativa.md) y [runbook-local.md](./runbook-local.md).
6. Script opcional de import JSON → PG.

---

## 9. Fuera de alcance

- Meter docs en las tablas `apps` / `users` de access-ms.
- Usar Redis como store de OpenAPI.
- Migrar identidades de cliente fuera de Keycloak.
- GCS / object storage (sigue sin aplicar).
