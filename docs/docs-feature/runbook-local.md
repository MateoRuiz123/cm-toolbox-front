# Runbook local — Documentación de APIs

Pasos para desarrollar y validar la feature en local. El agente debe poder seguir este documento sin contexto de chat.

---

## Arquitectura local

```text
Browser :3000  →  Vite (cm-toolbox-front)
                    ├─ /docs          → SPA
                    └─ /docs-api/*    → proxy → cm-docs-ms :8082
```

---

## Prerrequisitos

- Node 20+ (front) / según engines del MS
- pnpm 9.x
- (Opcional) Docker si se corre el MS containerizado
- Spec OpenAPI 3.x de prueba (archivo local)

---

## 1. Levantar `cm-docs-ms` (cuando exista el repo)

```bash
cd /path/to/cm-docs-ms
pnpm install
cp .env.example .env
```

`.env` mínimo:

```bash
PORT=8082
CORS_ORIGINS=http://localhost:3000
AUTH_MODE=disabled
SPECS_DRIVER=local
SPECS_LOCAL_DIR=./data/specs
CATALOG_PATH=./data/catalog.json
```

Semilla de ejemplo `data/catalog.json`:

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
      "updatedAt": "2026-10-10T00:00:00.000Z"
    }
  ]
}
```

Colocar el OpenAPI en `data/specs/api-demo/current.json`.

```bash
pnpm dev
curl -s http://localhost:8082/health
```

Con `AUTH_MODE=disabled`, las rutas `/v1/*` aceptan requests sin Bearer **solo en desarrollo**. En cuanto se pruebe auth real:

```bash
AUTH_MODE=keycloak
KEYCLOAK_ISSUER=...
KEYCLOAK_AUDIENCE=...
```

---

## 2. Levantar `cm-toolbox-front`

```bash
cd /path/to/cm-toolbox-front
pnpm install
cp .env.example .env
```

Añadir / verificar:

```bash
DOCS_API_UPSTREAM=http://localhost:8082
```

(El proxy Vite debe mapear `/docs-api` → `DOCS_API_UPSTREAM`, haciendo strip del prefijo para que el MS vea `/v1/...` — implementar igual que `/logs-api`.)

```bash
pnpm dev
```

Abrir `http://localhost:3000`.

- Auth bypass local: comportamiento actual del toolbox (`pnpm dev` sin forzar Keycloak, salvo `VITE_AUTH_FORCE_KEYCLOAK=true`).
- Navegar Hub → Documentación de APIs → `/docs` → `/docs/api-demo`.

---

## 3. Proxy Vite (implementación esperada)

En `vite.config.ts`, bloque análogo a logs:

```ts
// Pseudocódigo — alinear al proxy real de LOGS_API_UPSTREAM
'/docs-api': {
  target: env.DOCS_API_UPSTREAM,
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/docs-api/, ''),
}
```

Verificar:

```bash
curl -s http://localhost:3000/docs-api/v1/apis
```

---

## 4. nginx / Docker compose (toolbox)

Cuando se cablee producción local con `docker compose` del front:

1. Variable `DOCS_API_UPSTREAM` (ej. `http://host.docker.internal:8082`).
2. `location /docs-api/` en el template nginx (mismo patrón que `/logs-api/`).
3. Validación de arranque: esquema `http(s)://`, no recursivo.

---

## 5. Pruebas humo

| Paso | Comando / acción | OK si |
| --- | --- | --- |
| Health MS | `curl :8082/health` | 200 |
| Catálogo vía proxy | `curl :3000/docs-api/v1/apis` | JSON `data` |
| UI lista | Abrir `/docs` | Cards visibles |
| UI visor | Abrir `/docs/api-demo` | Paths del OpenAPI renderizados |
| Unit front | `pnpm test` (cliente docs) | Verde |
| Unit MS | `pnpm test` en cm-docs-ms | Verde |

---

## 6. Auth real (opcional en local)

```bash
# front .env
VITE_AUTH_FORCE_KEYCLOAK=true
# + variables Keycloak del entorno dev

# ms .env
AUTH_MODE=keycloak
KEYCLOAK_ISSUER=...
KEYCLOAK_AUDIENCE=...
```

Repetir humo: sin login no hay `/docs`; con login el Bearer llega al MS.

---

## 7. Fase C (solo si check GO)

1. Usuario con rol publish.
2. UI admin o:

```bash
curl -X POST http://localhost:3000/docs-api/v1/apis/api-demo/specs \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./openapi.yaml"
```

3. Recargar visor y confirmar `version` / contenido nuevo.

---

## 8. Troubleshooting

| Síntoma | Revisar |
| --- | --- |
| 502 en `/docs-api` | MS caído; `DOCS_API_UPSTREAM`; rewrite del proxy |
| Catálogo vacío | `catalog.json`; audiencias `internal`; driver local |
| 401 con auth | Token no enviado; issuer/audience del MS |
| Visor en blanco | Spec inválida; CSP; error de import del visor |
| CORS en dev directo al :8082 | Usar siempre el proxy `:3000/docs-api`, no el host del MS desde el browser |

---

## 9. Definición de listo para pasar al agente de implementación

El agente puede empezar cuando existan:

- [x] Este paquete `docs/docs-feature/*`
- [ ] Repo `cm-docs-ms` creado (o instrucción de crearlo desde plantilla logs)
- [ ] Una spec real o `api-demo` de prueba

Orden de trabajo recomendado del agente: **MS B → proxy front → UI lista → visor → tests → (check C)**.
