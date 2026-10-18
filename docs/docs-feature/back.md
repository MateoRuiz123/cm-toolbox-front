# Documentación de APIs — Back (`cm-docs-ms`)

Documento técnico **detallado** del microservicio. Un agente debe poder crear el repo e implementar B (y C si aplica) sin inventar contratos ni capas.

**Companion:** [front.md](./front.md)
**Índice:** [README.md](./README.md)
**Contrato normativo:** [contrato-http.md](./contrato-http.md)
**Otros:** [decisiones.md](./decisiones.md) · [seguridad.md](./seguridad.md) · [check-opcion-c.md](./check-opcion-c.md) · [runbook-local.md](./runbook-local.md)

| Campo | Valor |
| --- | --- |
| Nombre servicio | `cm-docs-ms` |
| Consumidor | `cm-toolbox-front` vía `/docs-api/` |
| Arquitectura | Hexagonal + Inversify |
| Runtime default | Express (como `cm-logs-ms`) |
| Opción | **B** obligatoria; **C** solo con check GO |

---

## 1. Objetivo del servicio

Ser la **única autoridad** de:

1. Catálogo de APIs documentadas.
2. Autorización de lectura por audiencia.
3. Entrega del OpenAPI vigente.
4. (C) Publicación de una nueva versión del spec.

No modifica APIs de negocio. No genera PDF. No es CMS de texto libre.

---

## 2. Actores y responsabilidades

| Actor | Interacción con el MS |
| --- | --- |
| SPA toolbox | Llama `/v1/*` con Bearer |
| nginx toolbox | Proxy, `TRUST_PROXY=1` |
| Publicador (C) | `POST .../specs` con rol |
| CI (later) | Puede escribir al storage sin pasar por POST (alternativa a C UI) |
| Probe k8s/Cloud Run | `GET /health*` sin auth |

---

## 3. Flujos

### Flujo B-A — Listar catálogo

1. Request `GET /v1/apis` + Bearer.
2. Middleware valida JWT (o bypass solo si `AUTH_MODE=disabled` y no-prod).
3. Extrae subject + audiencias efectivas del token (MVP: `['internal']`).
4. Lee catálogo (JSON/Firestore).
5. Filtra APIs cuya `audiences` intersecta.
6. Responde `{ data: DocsApiSummary[] }` sin exponer `objectKey` ni secrets.

### Flujo B-B — Obtener OpenAPI

1. `GET /v1/apis/:apiId/openapi` + Bearer.
2. Valida `apiId` slug.
3. Busca metadata; si no hay o sin audiencia → **404** genérico.
4. Lee blob `current` del storage; si falta archivo → 404/500 según caso (archivo faltante con metadata = 500 + log error).
5. Responde JSON OpenAPI (sin envelope `data`).

### Flujo B-C — Health

1. `GET /health` → 200 rápido, sin I/O pesado a GCS.
2. No exige auth.

### Flujo C-A — Publish (solo check GO)

1. `POST /v1/apis/:apiId/specs` + Bearer + claim `docs:publish`.
2. Sin claim → 403.
3. Valida tamaño ≤ 2 MiB, parse YAML/JSON, exige OpenAPI 3.x.
4. Normaliza a JSON; escribe storage `current`; actualiza `version`/`updatedAt`/`updatedBy` en catálogo.
5. 201 `{ data: { apiId, version, updatedAt } }`.

---

## 4. Criterios de aceptación (back)

| ID | Dado | Cuando | Entonces | Bloqueante |
| --- | --- | --- | --- | --- |
| CA-B01 | MS arriba | `GET /health` | 200 | Sí |
| CA-B02 | Sin Authorization | `GET /v1/apis` | 401 | Sí |
| CA-B03 | Token válido, 2 APIs internal | `GET /v1/apis` | 200 con esas 2 | Sí |
| CA-B04 | Token sin audiencia a `api-x` | `GET .../openapi` | 404 mismo mensaje que inexistente | Sí |
| CA-B05 | Token con acceso | `GET .../openapi` | 200 body con `openapi: "3.x"` | Sí |
| CA-B06 | `apiId` inválido (`../etc`) | cualquier ruta | 400 o 404; sin path traversal | Sí |
| CA-B07 | `AUTH_MODE=keycloak` sin config en prod | Boot | Fail-closed (no arranca) | Sí |
| CA-B08 | Driver local + catalog seed | Dev | Flujos B-A/B-B OK sin GCP | Sí |
| CA-B09 | Publish sin rol (C) | POST specs | 403 | No (solo C) |
| CA-B10 | YAML OpenAPI válido + rol (C) | POST specs | 201; GET openapi refleja cambio | No (solo C) |
| CA-B11 | Archivo no OpenAPI (C) | POST specs | 400 con `message` | No (solo C) |

---

## 5. Reglas de negocio / dominio

| ID | Regla | Impacto |
| --- | --- | --- |
| RB-01 | Formato canónico = OpenAPI 3.x | Crítico |
| RB-02 | Authz por `audiences[]` en metadata | Crítico |
| RB-03 | Sin audiencia → respuesta idéntica a “no existe” (404) | Alto |
| RB-04 | MVP audiencias efectivas = `internal` para todo token válido del toolbox | Alto |
| RB-05 | Publish solo con `docs:publish` | Alto (C) |
| RB-06 | Spec en storage normalizada a JSON | Medio |
| RB-07 | `apiId` slug `^[a-z0-9]+(?:-[a-z0-9]+)*$` | Alto |
| RB-08 | No loguear Bearer ni body completo del spec en info | Alto |
| RB-09 | Rate limit en `/v1/*` | Medio |
| RB-10 | PDF / email no son responsabilidad de este MS | Crítico (fuera) |

---

## 6. Estructura del repo (crear)

```text
cm-docs-ms/
  src/
    domain/
      models/
        ApiDoc.ts              # id, name, description?, version, audiences, objectKey, updatedAt, updatedBy?
      ports/
        CatalogRepository.ts
        SpecRepository.ts
        TokenClaims.ts         # subject, audiences[], canPublish
    application/
      services/
        ListApisService.ts
        GetApiDetailService.ts
        GetOpenApiService.ts
        PublishSpecService.ts  # solo C
      errors/
        NotFoundError.ts
        ForbiddenError.ts
        ValidationError.ts
        UnauthorizedError.ts
    infrastructure/
      api/
        Server.ts
        Microservice.ts
        routers/v1/DocsRouter.ts
        routers/HealthRouter.ts
        middlewares/AuthMiddleware.ts
        middlewares/ErrorMiddleware.ts
        middlewares/CommonMiddleware.ts
        middlewares/RateLimitMiddleware.ts
        helpers/AsyncHandler.ts
        helpers/SchemasValidators.ts
      auth/
        KeycloakTokenVerifier.ts
        DevAuthBypass.ts
      catalog/
        JsonFileCatalogRepository.ts
      storage/
        LocalFsSpecRepository.ts
        GcsSpecRepository.ts   # deploy
    setup/
      Envs.ts
      Types.ts
      DependencyContainer.ts
      index.ts
  data/                        # gitignore specs reales si hace falta; seed demo OK
    catalog.json
    specs/api-demo/current.json
  test/
  docs/
  Dockerfile
  docker-compose.yml
  .env.example
  package.json
  tsconfig.json
  README.md
```

---

## 7. Puertos e implementaciones

### `CatalogRepository`

```ts
listAll(): Promise<ApiDoc[]>
findById(id: string): Promise<ApiDoc | null>
save(doc: ApiDoc): Promise<void>  // C / seed
```

### `SpecRepository`

```ts
readCurrent(objectKey: string): Promise<Buffer | string>
writeCurrent(objectKey: string, content: string): Promise<void>  // C
```

### `TokenClaims` (extraído del JWT)

```ts
{
  subject: string
  audiences: string[]   // MVP: ['internal']
  canPublish: boolean   // claim docs:publish
}
```

Servicios aplican: `filter(doc => doc.audiences.some(a => claims.audiences.includes(a)))`.

---

## 8. Modelo de catálogo (archivo)

`data/catalog.json` ejemplo:

```json
{
  "apis": [
    {
      "id": "api-demo",
      "name": "API Demo",
      "description": "Spec de prueba local",
      "version": "1.0.0",
      "audiences": ["internal"],
      "objectKey": "api-demo/current.json",
      "updatedAt": "2026-10-10T00:00:00.000Z",
      "updatedBy": null
    }
  ]
}
```

Reglas:

- `objectKey` nunca se serializa al cliente en el catálogo público.
- `version` en publish: si el body OpenAPI trae `info.version`, usarla; si no, incrementar patch semver del catálogo o timestamp — **default: usar `info.version` del OpenAPI si existe; si no, `updatedAt` ISO como version label**.

---

## 9. Endpoints (resumen)

Detalle completo: [contrato-http.md](./contrato-http.md).

| Método | Path | Auth | Opción |
| --- | --- | --- | --- |
| GET | `/health` | No | B |
| GET | `/health/live` | No | B |
| GET | `/v1/apis` | Bearer | B |
| GET | `/v1/apis/:apiId` | Bearer | B |
| GET | `/v1/apis/:apiId/openapi` | Bearer | B |
| POST | `/v1/apis/:apiId/specs` | Bearer + publish | C |

Mensaje 404 fijo: `No se encontró la documentación solicitada.`

---

## 10. Auth middleware — comportamiento

| `AUTH_MODE` | NODE_ENV/prod | Comportamiento |
| --- | --- | --- |
| `disabled` | no-prod | Inyecta claims MVP `internal`, `canPublish=true` (solo dev) |
| `disabled` | producción | **No arrancar** |
| `keycloak` | cualquiera | JWKS; sin token → 401; token malo → 401 |

Mapeo claim publish: configurable por env `DOCS_PUBLISH_CLAIM=docs:publish` (nombre exacto pendiente IAM).

---

## 11. Validaciones

| ID | Validación | Error |
| --- | --- | --- |
| VAL-01 | Header Authorization presente (modo keycloak) | 401 |
| VAL-02 | `apiId` slug | 400 o 404 |
| VAL-03 | OpenAPI parse + campo `openapi` ~ `^3\.` | 400 (C) |
| VAL-04 | Tamaño ≤ 2 MiB | 413 (C) |
| VAL-05 | Content-Type / extensión allowlist | 415 (C) |
| VAL-06 | `canPublish` | 403 (C) |

---

## 12. Variables de entorno

| Variable | Default | Notas |
| --- | --- | --- |
| `PORT` | `8082` | Evitar choque con logs `:8081` |
| `CORS_ORIGINS` | `http://localhost:3000` | Lista coma-separada |
| `AUTH_MODE` | `disabled` dev / `keycloak` prod | |
| `KEYCLOAK_ISSUER` | — | |
| `KEYCLOAK_AUDIENCE` | — | |
| `KEYCLOAK_JWKS_URL` | `{issuer}/protocol/openid-connect/certs` | |
| `DOCS_PUBLISH_CLAIM` | `docs:publish` | |
| `TRUST_PROXY` | `0` local / `1` detrás nginx | |
| `SPECS_DRIVER` | `local` \| `gcs` | |
| `SPECS_LOCAL_DIR` | `./data/specs` | |
| `GCS_BUCKET` | — | Si gcs |
| `CATALOG_PATH` | `./data/catalog.json` | |
| `RATE_LIMIT_WINDOW_MS` | p.ej. `60000` | |
| `RATE_LIMIT_MAX` | p.ej. `120` | Más bajo en POST |

---

## 13. Observabilidad

| Evento | Nivel | Campos |
| --- | --- | --- |
| request `/v1/apis` | info | method, path, status, durationMs, subject (hash/id) |
| openapi 404 authz | info | apiId, subject |
| openapi 500 missing blob | error | apiId, objectKey |
| publish success | info | apiId, version, subject |
| publish rejected | warn | apiId, reason (validation/forbidden) |

No loguear: Authorization, body del spec, PII de clientes finales.

---

## 14. Seguridad (puntero)

Cumplir [seguridad.md](./seguridad.md): enumeración, rate limit, fail-closed, ADC/Workload Identity, sin secretos en repo.

---

## 15. Pruebas mínimas (MS)

| Suite | Casos |
| --- | --- |
| Unit | Filter audiencias; slug validation; OpenAPI parse |
| Integration HTTP | CA-B01…CA-B08 con supertest/jest |
| C | CA-B09…CA-B11 si GO |

---

## 16. Orden de implementación (back)

1. Skeleton Express + Inversify + health + Envs (copiar hábitos `cm-logs-ms`).
2. Auth middleware + bypass dev.
3. JsonFileCatalog + LocalFsSpec + seed `api-demo`.
4. `ListApisService` + `GetOpenApiService` + router.
5. Error middleware unificado `{ message }`.
6. Tests integración B.
7. Dockerfile + `.env.example` + README.
8. Adapter GCS.
9. (Check C) PublishSpecService + POST + tests.
10. Cablear proxy en toolbox ([front.md](./front.md) §12).

---

## 17. Definición de hecho (back)

- [ ] CA-B01 … CA-B08
- [ ] README con curl de humo
- [ ] Driver local usable sin GCP
- [ ] Listo para `DOCS_API_UPSTREAM`
- [ ] C implementada o diferida con nota en check-opcion-c.md

---

## 18. Preguntas abiertas (back)

1. ¿IAM confirma Express o exige Fastify plantilla?
2. ¿Nombre del claim publish y de audiencias cliente?
3. ¿Bucket GCS y SA disponibles en el ambiente de práctica?
4. ¿Semilla inicial: solo `api-demo` o una API real de integración?
5. ¿Historial de versiones en storage desde el día 1 o solo `current`?
