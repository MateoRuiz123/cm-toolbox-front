# Documentación de APIs — Front (`cm-toolbox-front`)

Documento técnico **detallado** para implementar el módulo en el SPA. Un agente debe poder construir sin adivinar estados, rutas, mensajes ni archivos.

**Companion:** [back.md](./back.md)
**Índice:** [README.md](./README.md)
**Contrato:** [contrato-http.md](./contrato-http.md) · [decisiones.md](./decisiones.md) · [seguridad.md](./seguridad.md) · [check-opcion-c.md](./check-opcion-c.md) · [runbook-local.md](./runbook-local.md)

| Campo | Valor |
| --- | --- |
| Estado | Diseño previo a implementación |
| Arquitectura | **B** (obligatoria) |
| Opción C | Solo si [check](./check-opcion-c.md) = GO |
| Stack | React 19, Vite, TS, Tailwind, Keycloak, React Router, SIGO Droop |

---

## 1. Objetivo

Reemplazar la consulta/reenvío de documentación de APIs en PDF por un módulo del hub que:

1. Liste las APIs que el usuario puede ver.
2. Muestre el OpenAPI vigente en un visor embebido.
3. Reutilice auth, layout y proxy del toolbox (igual que Diagnóstico y Logs).

El front **no** guarda la verdad del contrato ni decide permisos en serio: consume `cm-docs-ms` vía `/docs-api/`.

---

## 2. Actores (vista front)

| Actor | Cómo entra | Qué hace en UI |
| --- | --- | --- |
| Usuario interno (tech) | Keycloak / Google (AuthGate actual) | Ve catálogo `internal`, abre visor |
| Usuario sin sesión | — | No llega a `/docs` (AuthGate → login) |
| Usuario sin acceso al portal | Auth `sin_acceso` | Pantalla existente; no entra al hub |
| Publicador (fase C) | Mismo login + rol publish en token | Ve acción “Actualizar spec” si el back no responde 403 |

Clientes externos: **fuera del MVP** hasta definir claims (ver decisiones ADR-007). La UI debe estar preparada para catálogo vacío o reducido.

---

## 3. Historias / flujos de uso

### Flujo F-A — Abrir catálogo (feliz)

1. Usuario autenticado está en `/` (hub).
2. Ve la tarjeta **Documentación de APIs** con badge Disponible.
3. Clic en “Abrir herramienta” → navega a `/docs`.
4. La página muestra skeleton/loading.
5. `GET /docs-api/v1/apis` con Bearer.
6. Se renderizan cards (nombre, descripción, versión, fecha).
7. Título document: `Documentación de APIs | Coordinadora Toolbox`.

### Flujo F-B — Abrir visor (feliz)

1. En `/docs`, clic en una API (o “Ver documentación”).
2. Navega a `/docs/:apiId` (ej. `/docs/api-demo`).
3. Loading del spec + del chunk del visor.
4. `GET /docs-api/v1/apis/:apiId/openapi`.
5. Visor renderiza paths/schemas.
6. Link “Volver al catálogo” → `/docs`.

### Flujo F-C — Catálogo vacío

1. Token válido; back responde `{ "data": [] }`.
2. UI muestra estado vacío (no error): texto del tipo *No hay documentación disponible para tu usuario.*
3. No se muestra visor.

### Flujo F-D — Error de red / 5xx

1. Fallo al listar o al cargar openapi.
2. UI error con mensaje del body `message` si existe; si no, mensaje genérico.
3. Botón “Reintentar” vuelve a disparar el fetch.

### Flujo F-E — Spec no encontrada / sin permiso (404)

1. Usuario entra a `/docs/api-inexistente` o API sin audiencia.
2. Back 404 con mensaje genérico.
3. UI: no revelar si “no existe” vs “prohibido”; mismo copy.
4. CTA volver al catálogo.

### Flujo F-F — Sesión perdida (401)

1. API responde 401.
2. Comportamiento alineado al resto del toolbox (relogin / cerrar sesión según patrón de diagnóstico/logs). **No inventar** un flujo distinto: reutilizar helpers de auth existentes si ya hay manejo 401 en clientes API.

### Flujo F-G — Publish (solo fase C)

1. Usuario con permiso en detalle `/docs/:apiId`.
2. Ve sección/botón “Actualizar especificación”.
3. Selecciona `.yaml` / `.yml` / `.json` ≤ 2 MiB.
4. `POST /docs-api/v1/apis/:apiId/specs`.
5. Éxito 201 → toast/banner con nueva `version`; refrescar visor.
6. 403 → ocultar o deshabilitar acción y mensaje *No tienes permiso para publicar.*
7. 400 → mostrar `message` del back (YAML inválido, etc.).

---

## 4. Criterios de aceptación (verificables)

| ID | Dado | Cuando | Entonces | Bloqueante |
| --- | --- | --- | --- | --- |
| CA-F01 | Usuario autenticado en hub | Ve la tarjeta docs | Badge Disponible, CTA abre `/docs` | Sí |
| CA-F02 | Back devuelve 2 APIs autorizadas | Carga `/docs` | Se listan exactamente esas 2 (id/name/version) | Sí |
| CA-F03 | Back devuelve `data: []` | Carga `/docs` | Estado vacío, sin crash | Sí |
| CA-F04 | Usuario en `/docs/api-demo` con acceso | Spec 200 | Visor muestra contenido OpenAPI | Sí |
| CA-F05 | `apiId` sin acceso | GET openapi 404 | Mensaje genérico + volver a catálogo | Sí |
| CA-F06 | Upstream caído | Carga lista | Error + Reintentar | Sí |
| CA-F07 | Navegación | Usa hub / docs / docs/:id | Header/footer/theme iguales al resto del portal | Sí |
| CA-F08 | Build producción | `pnpm build` | Chunk del visor no rompe CSP ni el bundle principal de forma bloqueante | Sí |
| CA-F09 | Fase C GO + rol publish | Sube YAML válido | 201 y visor refleja cambio | No (solo si C) |
| CA-F10 | Fase C GO sin rol | Intenta publish | 403; UI no engaña con éxito | No (solo si C) |

---

## 5. Reglas de UI / negocio en el cliente

| ID | Regla | Dónde |
| --- | --- | --- |
| RF-01 | No hardcodear lista de APIs en el front | Solo respuesta del back |
| RF-02 | No filtrar por email en React como authz real | Back es autoridad |
| RF-03 | `apiId` en ruta: slug `^[a-z0-9]+(?:-[a-z0-9]+)*$`; si no, tratar como 404 UI | Router / page |
| RF-04 | Timeout lista 15 s; openapi 30 s | Cliente HTTP |
| RF-05 | Bearer desde el mismo mecanismo que diagnóstico/logs | `docs-api.ts` |
| RF-06 | Same-origin únicamente (`/docs-api/...`) | Sin `VITE_DOCS_API_URL` absoluto en MVP |
| RF-07 | Lazy load del visor | No cargar Scalar/Swagger en el hub |
| RF-08 | Copy de error 404 único | No distinguir existencia vs permiso |
| RF-09 | No ofrecer descarga/envío de PDF | Fuera de alcance |
| RF-10 | Fase C: input `accept` YAML/JSON; validar tamaño en cliente antes de subir | Admin UI |

---

## 6. Rutas y metadata

| Ruta | Página | Título sugerido |
| --- | --- | --- |
| `/docs` | Catálogo | Documentación de APIs \| Coordinadora Toolbox |
| `/docs/:apiId` | Visor | `{name} \| Documentación de APIs` (si se conoce name) o `Documentación \| Coordinadora Toolbox` |
| `/docs/admin` | **No** en MVP; si C, preferir sección en detalle | — |

Actualizar `src/shared/lib/use-page-title.ts` con `/docs` y prefijo `/docs/`.

Analytics: `trackPageView` ya corre por pathname; no requiere API nueva.

---

## 7. Hub — tarjeta

En `src/features/hub/hub-page.tsx`, nueva `AppCard`:

| Prop | Valor |
| --- | --- |
| `titulo` | Documentación de APIs |
| `descripcion` | Consulta la especificación OpenAPI vigente de las APIs de integración, con acceso controlado. Reemplaza el envío de archivos PDF. |
| `ruta` | `/docs` |
| `estado` | `disponible` |
| `tags` | `['OpenAPI', 'Integraciones', 'Catálogo']` |
| `icono` | Extender union de iconos (p. ej. `'docs'`) o reutilizar `'auditoria'` temporalmente; preferible icono documento nuevo en `renderIcono` |

Orden sugerido en el grid: Diagnóstico, Logs, **Documentación de APIs**, Auditoría (próximamente).

---

## 8. Estructura de archivos a crear/modificar

### Crear

```text
src/features/docs/
  docs-page.tsx                 # Catálogo
  docs-viewer-page.tsx          # Visor por apiId
  api-card.tsx                  # Card del catálogo (opcional si inline)
  empty-state.tsx               # Vacío / error reutilizable
  api/
    docs-api.ts                 # getCatalog, getOpenApi, publishSpec?
    types.ts                    # Tipos del contrato
  admin/                        # Solo fase C
    publish-spec-form.tsx
```

### Modificar

| Archivo | Cambio |
| --- | --- |
| `src/app/app.tsx` | `lazy` DocsPage + DocsViewer; routes `/docs` y `/docs/:apiId` |
| `src/features/hub/hub-page.tsx` | AppCard |
| `src/shared/lib/use-page-title.ts` | Metadata |
| `vite.config.ts` | Proxy `/docs-api` |
| `.env.example` | `DOCS_API_UPSTREAM=` |
| `nginx/default.conf.template` (+ validación env) | `location /docs-api/` |
| `README.md` del repo | Mencionar la app y la variable |

### Tests sugeridos

```text
test/features/docs/api/docs-api.test.ts
test/features/docs/docs-page.test.tsx   # estados loading/vacío/error/lista
e2e/… (opcional humo /docs)             # cuando exista MS
```

---

## 9. Cliente HTTP (`docs-api.ts`)

Responsabilidades:

| Función | Método | Path | Retorno |
| --- | --- | --- | --- |
| `fetchDocsCatalog(signal?)` | GET | `/docs-api/v1/apis` | `DocsApiSummary[]` |
| `fetchOpenApi(apiId, signal?)` | GET | `/docs-api/v1/apis/:apiId/openapi` | `unknown` (JSON OpenAPI) |
| `publishSpec(apiId, file)` | POST | `/docs-api/v1/apis/:apiId/specs` | Solo C |

Comportamiento:

- Headers: `Authorization: Bearer <token>`, `Accept: application/json`.
- Éxito catálogo: exigir `data` array; si falta → error tipado *El API respondió sin datos de catálogo.*
- Éxito openapi: body con propiedad `openapi` (string 3.x); si no → error *La especificación recibida no es OpenAPI válida.*
- Error: leer `message`; fallback genérico.
- AbortSignal + timeout (patrón diagnóstico).

Tipos: ver [contrato-http.md](./contrato-http.md).

---

## 10. Estados de UI (matriz)

| Estado | Catálogo `/docs` | Visor `/docs/:apiId` |
| --- | --- | --- |
| Loading inicial | Skeleton de 3 cards | Skeleton / spinner a ancho completo |
| Éxito con datos | Grid de cards | Visor montado |
| Vacío | Empty state | N/A (redirigir o empty si 404) |
| Error red/5xx | Alert + Reintentar | Alert + Reintentar + Volver |
| 404 | N/A | Empty/error genérico + Volver |
| 401 | Delegar a auth | Delegar a auth |

Diseño visual: tokens existentes (`surface`, `border-default`, `color-primary`, badges como hub). Sin layout “producto docs” ajeno.

---

## 11. Visor OpenAPI

| Decisión | Default |
| --- | --- |
| Librería | **Scalar** (ver [decisiones.md](./decisiones.md)) |
| Carga | `React.lazy` / `import()` dinámico |
| Fallback | Mensaje “Cargando visor…” |
| Si Scalar rompe CSP | Cambiar a Redoc o Swagger UI sin cambiar rutas ni contrato |

Props mínimas: pasar el documento JSON ya fetched (no pedir al visor que llame al back por su cuenta, para no saltarse Bearer/proxy).

---

## 12. Proxy y variables

| Variable | Dónde | Uso |
| --- | --- | --- |
| `DOCS_API_UPSTREAM` | Env servidor / Vite proxy / nginx runtime | Host del MS, ej. `http://localhost:8082` |

Rewrite: `/docs-api/v1/apis` → `{UPSTREAM}/v1/apis` (strip `/docs-api`).

Validación nginx: mismo espíritu que logs (esquema http(s), no recursivo).

---

## 13. Fase C en front (detalle)

Solo si check GO:

1. En `docs-viewer-page`, sección colapsable “Administración”.
2. Visible si… **opción simple MVP C:** siempre mostrar a internos y dejar que 403 confirme; **opción mejor:** endpoint o claim expuesto (si no existe, no inventar `/me` — mostrar y manejar 403).
3. `PublishSpecForm`: input file, botón, disabled mientras `publishing`.
4. Tras 201: invalidar query/refetch openapi + actualizar versión en header de la página.

No implementar correo ni editor WYSIWYG.

---

## 14. Mensajes de copy (español)

| Clave | Texto |
| --- | --- |
| empty_catalog | No hay documentación disponible para tu usuario. |
| error_generic | No pudimos cargar la documentación. Intenta de nuevo. |
| error_not_found | No se encontró la documentación solicitada. |
| error_invalid_spec | La especificación recibida no es OpenAPI válida. |
| retry | Reintentar |
| back_catalog | Volver al catálogo |
| publish_ok | Especificación actualizada correctamente. |
| publish_forbidden | No tienes permiso para publicar. |
| publish_invalid | El archivo no es una especificación OpenAPI válida. |

---

## 15. Orden de implementación (front)

1. Tipos + `docs-api.ts` + tests unitarios (mock fetch).
2. Rutas lazy + páginas placeholder.
3. Tarjeta hub.
4. Proxy Vite + `.env.example`.
5. Catálogo real (estados UI).
6. Visor lazy + fetch openapi.
7. Metadata títulos.
8. nginx / Docker env.
9. (Check C) formulario publish.
10. README repo.

---

## 16. Definición de hecho (front)

- [ ] CA-F01 … CA-F08 cumplidos
- [ ] Misma auth/shell que el resto del portal
- [ ] Sin URL del MS en el bundle
- [ ] Tests del cliente API en verde
- [ ] C ausente o gated por check documentado

---

## 17. Preguntas abiertas (front)

1. ¿Confirmamos Scalar o preferimos Redoc/Swagger desde el día 1?
2. ¿Manejo 401 idéntico a `diagnostico` — qué helper reutilizar?
3. ¿Orden exacto de cards en el hub?
4. ¿Fase C: ¿ocultar admin sin claim o mostrar y fallar con 403?
