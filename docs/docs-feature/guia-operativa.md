# Guía operativa — Documentación de APIs

Qué tienes que **tener en cuenta** y **hacer tú** (o pedir a otros) ahora que la feature ya está implementada en código. No es un diseño: es la lista de trabajo pendiente / operativo.

**Repos:** [`cm-toolbox-front`](../../) + [`cm-docs-ms`](file:///home/mateor/Escritorio/local/cm-docs-ms) (hermano en `Escritorio/local`).

---

## 1. Qué ya está hecho (no lo vuelvas a pedir)

| Pieza                                               | Dónde                                           |
| --------------------------------------------------- | ----------------------------------------------- |
| MS catálogo + OpenAPI + publish                     | `cm-docs-ms`                                    |
| Hub → `/docs` + visor + upload YAML/JSON            | `src/features/docs/`                            |
| Puerta clientes `/cliente/login` y `/cliente/docs*` | `src/features/docs-cliente/`                    |
| Proxy `/docs-api` (Vite + nginx)                    | `vite.config.ts`, `nginx/default.conf.template` |
| Seed demo local                                     | `cm-docs-ms/data/`                              |
| Docs de diseño                                      | este directorio `docs/docs-feature/`            |

---

## 2. Cómo correrlo en tu máquina

```bash
# Terminal 1 — API
cd ~/Escritorio/local/cm-docs-ms
pnpm install && cp -n .env.example .env && pnpm dev

# Terminal 2 — Front
cd ~/Escritorio/local/cm-toolbox-front
# en .env: DOCS_API_UPSTREAM=http://localhost:8082
pnpm install && pnpm dev
```

| Quién         | URL                                                      | Qué esperar                          |
| ------------- | -------------------------------------------------------- | ------------------------------------ |
| Interno       | `http://localhost:3000` → tarjeta Documentación de APIs  | Ve `api-demo` (audiencia `internal`) |
| Cliente (dev) | `http://localhost:3000/cliente/login` → **Entrar (dev)** | Ve solo `api-cliente-demo`           |
| Publish       | En `/docs/api-demo`, sección “Actualizar especificación” | Sube OpenAPI ≤ 2 MiB                 |

En local el MS usa `AUTH_MODE=disabled`. El botón **Entrar (dev)** manda `X-Dev-Audiences: client:demo` al MS (no hace falta Keycloak).

Detalle de curls y troubleshooting: [runbook-local.md](./runbook-local.md).

---

## 2b. Admin operación

Crear documentación, asignar audiencias y alta de clientes: UI en `/docs/admin*` y APIs `/v1/admin/*`. Detalle: [admin-operacion.md](./admin-operacion.md).

### Persistencia

Catálogo, specs y clientes demo pueden vivir en:

| Modo                    | Cómo                                                                       |
| ----------------------- | -------------------------------------------------------------------------- |
| `SPECS_DRIVER=local`    | Archivos bajo `cm-docs-ms/data/` (tests / CI sin Postgres)                 |
| `SPECS_DRIVER=postgres` | Base `cm_toolbox_docs` en la misma instancia que access (`localhost:5433`) |

Crear DB y aplicar SQL: ver `cm-docs-ms/README.md` y [persistencia-postgres.md](./persistencia-postgres.md).

```bash
docker exec cm-toolbox-postgres \
  psql -U toolbox -d postgres \
  -c "CREATE DATABASE cm_toolbox_docs OWNER toolbox;"
```

---

## 3. Lo que **tú** debes hacer / cuidar

### A. Variables en el front

En `.env` (no lo subas a git):

```bash
DOCS_API_UPSTREAM=http://localhost:8082
# Cuando identidad entregue el client OIDC de clientes:
# VITE_KEYCLOAK_CLIENT_ID_CLIENTES=toolbox-docs-clientes
```

En Docker/nginx: misma `DOCS_API_UPSTREAM` (ver `docker-compose.yml` y `nginx/05-validate-env.sh`).

### B. Catálogo y specs

| Destino                                                                        | Rol                                           |
| ------------------------------------------------------------------------------ | --------------------------------------------- |
| Postgres `apis` + `api_specs` (o `data/catalog.json` + `data/specs/` en local) | Lista de APIs + OpenAPI vigente + `audiences` |

Para agregar una API de prueba en local con driver JSON: edita el catálogo, pon el JSON OpenAPI en `data/specs/...`. Con Postgres: usa la UI admin (`/docs/admin/nueva`) o SQL seed.

Para “publicar” en local: usa la UI de upload en `/docs/:apiId` (con sesión interna / bypass).

### C. Pedir a identidad (Keycloak) — **bloqueante para prod clientes**

Sin esto, `/cliente` en producción no autentica de verdad. El SPA ya procesa callback OIDC, refresh y logout; el MS acepta varios `aud`.

**Copia y envía:** [peticion-iam-keycloak.md](./peticion-iam-keycloak.md).

Resumen:

1. Client OIDC **distinto** al del toolbox (ej. `toolbox-docs-clientes`).
2. **Sin** login Google en ese client (solo usuario + clave).
3. Atributo/claim → `client:<id>` (NIT u otro id).
4. Flujos activar cuenta / olvidé mi clave.
5. Rol o claim `docs:publish` para quien sube specs (solo internos).

Cuando lo tengan:

```bash
# Front (.env / deploy)
VITE_KEYCLOAK_CLIENT_ID_CLIENTES=toolbox-docs-clientes

# cm-docs-ms
AUTH_MODE=keycloak
KEYCLOAK_ISSUER=https://auth.coordinadora.com/realms/coordinadora
KEYCLOAK_AUDIENCE=<client-interno>,toolbox-docs-clientes
DOCS_CLIENT_AUDIENCE_CLAIM=<claim-acordado>
```

Checklist ampliado: [auth-clientes.md](./auth-clientes.md) §6 y README de `cm-docs-ms`.

### D. Access / hub en ambientes con `cm-toolbox-access-ms`

En local el fallback del front y el seed `sql/002_seed.sql` ya incluyen la app `docs`.

Si un ambiente se sembró **antes** de existir `docs`, ejecuta en Postgres del access-ms:

```bash
psql "$DATABASE_URL" -f sql/005_seed_docs_app.sql
```

(Idempotente: `ON CONFLICT DO NOTHING`.)

Alta manual si hace falta:

- `id`: `docs`
- `route`: `/docs`
- acciones: al menos `view`; `publish` si aplica

### E. No mezclar puertas

| Puerta            | No hacer                                  |
| ----------------- | ----------------------------------------- |
| Internos (Google) | No mandar a clientes al hub               |
| `/cliente`        | No poner botón Google; no mostrar publish |

### F. Seguridad cotidiana

- No loguear tokens ni el body completo del OpenAPI.
- No poner secretos en el repo.
- Un cliente no debe ver docs de otro: prueba con `X-Dev-Audiences: client:demo` vs `client:otro` (runbook §6b).

---

## 4. Qué **no** tienes que hacer (fuera de esta entrega)

- Montar bucket GCS / Cloud Storage (storage = Postgres o local).
- Mantener un repo aparte de OpenAPI de negocio.
- Provisionar Keycloak tú mismo si no eres identidad (pídelo).
- Reimplementar la feature: ya está; solo operar y cablear identidad/prod.
- Meter tablas docs dentro del schema de `cm_toolbox_access`.
- Usar Redis para OpenAPI.

---

## 5. Checklist rápido antes de mostrar / demo

- [ ] `cm-docs-ms` en `:8082` (`curl localhost:8082/health`)
- [ ] Front con `DOCS_API_UPSTREAM` apuntando al MS
- [ ] Hub muestra “Documentación de APIs”
- [ ] `/docs` lista `api-demo`
- [ ] `/cliente/login` → Entrar (dev) → solo API cliente demo
- [ ] Publish de un YAML/JSON válido en `/docs/api-demo` (opcional en la demo)

---

## 6. Dónde leer más

| Documento                              | Para qué                      |
| -------------------------------------- | ----------------------------- |
| [README.md](./README.md)               | Índice y estado de la feature |
| [runbook-local.md](./runbook-local.md) | Comandos y humo               |
| [auth-clientes.md](./auth-clientes.md) | Puerta clientes / IAM         |
| [seguridad.md](./seguridad.md)         | AuthZ y checklist             |
| [contrato-http.md](./contrato-http.md) | API del MS                    |
| `cm-docs-ms/README.md`                 | Arranque del microservicio    |
