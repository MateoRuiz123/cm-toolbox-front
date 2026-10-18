# Contrato HTTP — Documentación de APIs

Contrato entre `cm-toolbox-front` (`src/features/docs/api/`) y `cm-docs-ms`.  
Estilo alineado a [diagnostico-api-contrato.md](../diagnostico-api-contrato.md).

**Base same-origin (navegador):** `/docs-api`  
**Upstream:** `DOCS_API_UPSTREAM` (nginx/Vite proxea y no se hornea en el bundle).

El MS expone rutas bajo `/v1`. El proxy del toolbox debe reenviar `/docs-api/*` al host del MS de forma que el servicio reciba `/v1/*` (strip del prefijo `/docs-api` o configuración equivalente documentada en el runbook).

---

## Convenciones

| Tema | Regla |
| --- | --- |
| Éxito | HTTP 2xx con envelope `{ "data": ... }` salvo OpenAPI raw |
| Error | `{ "message": string }` |
| Auth | Header `Authorization: Bearer <access_token>` en `/v1/*` |
| Content-Type request JSON | `application/json` |
| OpenAPI response | `application/json` (preferido); YAML opcional con `Accept: application/yaml` |
| IDs | slug kebab-case: `api-guia` |
| Fechas | ISO-8601 UTC |

---

## Health (público)

### `GET /health`

| Campo | Valor |
| --- | --- |
| Auth | No |
| 200 | `{ "status": "ok" }` o equivalente simple del MS |

### `GET /health/live`

Misma semántica que health para probes.

---

## Catálogo

### `GET /v1/apis`

Lista las APIs visibles para el subject del token.

| Campo | Valor |
| --- | --- |
| Auth | Bearer |
| Query | ninguna en MVP |
| Timeout cliente sugerido | 15 s |

#### Respuesta 200

```json
{
  "data": [
    {
      "id": "api-guia",
      "name": "API Guías",
      "description": "Integración de guías para clientes",
      "version": "1.4.0",
      "updatedAt": "2026-10-10T15:00:00.000Z"
    }
  ]
}
```

| Campo | Tipo | Requerido |
| --- | --- | --- |
| `data[].id` | string | sí |
| `data[].name` | string | sí |
| `data[].description` | string | no |
| `data[].version` | string | sí |
| `data[].updatedAt` | string (ISO) | sí |

#### Errores

| HTTP | Cuándo |
| --- | --- |
| 401 | Sin token / token inválido / expirado |
| 500 | Fallo interno |

---

### `GET /v1/apis/:apiId`

Metadata de un API (opcional para el front; útil para detalle).

| Campo | Valor |
| --- | --- |
| Auth | Bearer |

#### Respuesta 200

```json
{
  "data": {
    "id": "api-guia",
    "name": "API Guías",
    "description": "Integración de guías para clientes",
    "version": "1.4.0",
    "updatedAt": "2026-10-10T15:00:00.000Z",
    "audiences": ["internal", "client:acme"]
  }
}
```

Nota: el front **no debe** depender de `audiences` para autorizar; es informativo para internos. Clientes externos pueden recibir el campo omitido o filtrado.

#### Errores

| HTTP | Cuándo |
| --- | --- |
| 401 | Auth inválida |
| 404 | No existe **o** sin audiencia (mensaje genérico) |

---

## Spec OpenAPI

### `GET /v1/apis/:apiId/openapi`

| Campo | Valor |
| --- | --- |
| Auth | Bearer |
| Timeout cliente sugerido | 30 s |

#### Respuesta 200 (JSON)

Body = documento OpenAPI 3.x **sin** envelope `data` (el visor necesita el root `openapi` / `paths`).

Headers sugeridos:

- `Content-Type: application/json`
- `Cache-Control: private, max-age=60` (ajustable)

#### Respuesta 200 (YAML) — opcional

Si `Accept: application/yaml` o `application/x-yaml`, devolver YAML. El front MVP puede pedir solo JSON.

#### Errores

| HTTP | Cuándo |
| --- | --- |
| 401 | Auth inválida |
| 404 | No existe o sin permiso (mismo mensaje) |
| 406 | `Accept` no soportado (si se implementa negociación) |

Mensaje 404 sugerido: `No se encontró la documentación solicitada.`

---

## Publicación (fase C — solo si check verde)

### `POST /v1/apis/:apiId/specs`

| Campo | Valor |
| --- | --- |
| Auth | Bearer + claim/rol `docs:publish` |
| Body | `multipart/form-data` campo `file` **o** raw YAML/JSON |
| Tamaño máx. sugerido | 2 MiB |
| Extensiones | `.yaml`, `.yml`, `.json` |

#### Multipart

```http
POST /v1/apis/api-guia/specs
Authorization: Bearer ...
Content-Type: multipart/form-data; boundary=...

--...
Content-Disposition: form-data; name="file"; filename="openapi.yaml"
Content-Type: application/yaml

openapi: 3.0.3
...
```

#### Respuesta 201

```json
{
  "data": {
    "apiId": "api-guia",
    "version": "1.4.1",
    "updatedAt": "2026-10-10T16:00:00.000Z"
  }
}
```

#### Errores

| HTTP | Cuándo |
| --- | --- |
| 400 | Archivo vacío, no parsea, no es OpenAPI 3.x |
| 401 | Auth inválida |
| 403 | Sin rol publish |
| 404 | `apiId` desconocido |
| 413 | Excede tamaño |
| 415 | Content-Type no permitido |

---

## Tipos TypeScript (front)

Ubicar en `src/features/docs/api/types.ts`:

```ts
export type DocsApiSummary = {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly version: string
  readonly updatedAt: string
}

export type DocsCatalogResponse = {
  readonly data: readonly DocsApiSummary[]
}

export type DocsApiDetail = DocsApiSummary & {
  readonly audiences?: readonly string[]
}

export type DocsPublishResponse = {
  readonly data: {
    readonly apiId: string
    readonly version: string
    readonly updatedAt: string
  }
}

export type DocsErrorBody = {
  readonly message: string
}
```

El OpenAPI se tipa como `unknown` o `Record<string, unknown>` al recibirlo; el visor valida/consume.

---

## Matriz de pruebas mínimas

| Caso | Esperado |
| --- | --- |
| Sin Authorization en `/v1/apis` | 401 |
| Token válido, catálogo vacío | 200 `{ "data": [] }` |
| Token sin audiencia a `apiId` | 404 en openapi |
| Token con acceso | 200 OpenAPI con campo `openapi` |
| Publish sin rol (si C) | 403 |
| Publish YAML inválido (si C) | 400 |

---

## Versionado del contrato

- Prefijo `/v1` inmutable para breaking changes.
- Campos nuevos en catálogo: aditivos y opcionales.
- Cualquier cambio breaking → `/v2` + actualización de este archivo y del cliente front.
