# Seguridad — Feature documentación de APIs

Complementa [seguridad-tokens-y-csp.md](../seguridad-tokens-y-csp.md) con reglas específicas del módulo docs / `cm-docs-ms`.

---

## Objetivos

1. Solo identidades autenticadas consultan el catálogo y las specs.
2. Un cliente no enumera ni lee specs de otro.
3. Publicar (fase C) queda restringido a roles internos elevados.
4. No reintroducir el PDF como canal primario ni filtrar secretos en logs.

---

## AuthN

| Capa | Comportamiento |
| --- | --- |
| Front | `AuthGate` + Keycloak (igual que el resto del toolbox) |
| Back `/v1/*` | `Authorization: Bearer`; verificación JWKS |
| Back `/health*` | Público |
| `AUTH_MODE=disabled` | Solo no-producción; en prod fallo cerrado sin Keycloak |

El access token sigue en `localStorage` según la decisión vigente del portal. Esta feature **no** migra el modelo de tokens.

---

## AuthZ

| Recurso | Regla |
| --- | --- |
| Catálogo | Filtrar por `audiences` del API ∩ claims del token |
| Spec | Misma regla que catálogo; si no aplica → **404** genérico |
| Publish (C) | Requiere claim/rol `docs:publish` → si no, **403** |

### MVP de claims

Hasta definir clientes externos:

- Toda sesión válida del toolbox se trata como audiencia `internal`.
- Solo APIs marcadas `internal` (o sin restricción explícita de cliente) aparecen.

Cuando existan clientes:

- Claim o atributo mapeado a `client:<id>`.
- Internos con grupo tech pueden ver `internal` + opcionalmente todas.

---

## Enumeración

| Escenario | Respuesta |
| --- | --- |
| `apiId` inexistente | 404 + mensaje genérico |
| `apiId` existente sin audiencia | **Mismo** 404 + mismo mensaje |
| Lista | Solo ítems autorizados (nunca “existen 12 pero ves 2” en headers) |

Mensaje sugerido: `No se encontró la documentación solicitada.`

---

## CSP y red

- El navegador solo llama same-origin `/docs-api/`.
- No añadir hosts del docs-ms a `connect-src` del bundle; el proxy nginx absorbe.
- El visor OpenAPI (Scalar/Swagger) no debe requerir `unsafe-eval` si es evitable; validar CSP al integrar la librería.
- Prohibido `dangerouslySetInnerHTML` con contenido del spec sin sanitizar (el visor elegido debe usarse de forma soportada).

---

## Upload (fase C)

| Control | Valor |
| --- | --- |
| Tamaño máx. | 2 MiB |
| Tipos | YAML / JSON OpenAPI 3.x |
| Parse | Rechazar si no hay campo `openapi` 3.x |
| Path traversal | `apiId` validado como slug `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| Sobrescritura | Solo `current` del `apiId` autorizado |
| Virus/malware | Confiar en allowlist + parse; no ejecutar el archivo |

No aceptar ZIP ni HTML.

---

## Datos y PII

| Dato | Tratamiento |
| --- | --- |
| OpenAPI | Puede describir campos de negocio; es documentación, no datos personales de clientes finales |
| Token | No loguear |
| Email / subject | Opcional en audit de publish (C); nivel info mínimo |
| Spec body | No loguear completo en info; debug solo en no-prod |

Ley 1581: el portal docs no debe exponer datos personales de operación; solo contratos de API. Acceso de lectura acorde a roles.

---

## Rate limiting y abuso

- Rate limit por IP/token en `/v1/*` (misma orden de magnitud que `cm-logs-ms`).
- Publish con límite más estricto (ej. N req/hora).
- Timeouts en el cliente front (catálogo 15 s, openapi 30 s).

---

## Secretos e infraestructura

- Sin API keys en el repo front.
- Credenciales GCS vía ADC / Workload Identity en Cloud Run.
- `DOCS_API_UPSTREAM` solo en runtime del contenedor nginx / env de deploy.
- Service account del MS: mínimo privilegio sobre el bucket de specs.

---

## Checklist de revisión antes de merge

- [ ] Rutas `/v1/*` exigen JWT en modo keycloak
- [ ] Tests de 401 / 404 por audiencia
- [ ] Proxy same-origin; sin URL absoluta de docs-ms en el cliente
- [ ] CSP del toolbox sigue pasando con el visor elegido
- [ ] No hay `console.log` de tokens ni specs completas
- [ ] Fase C ausente **o** protegida por rol + límite de tamaño
