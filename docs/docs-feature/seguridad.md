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

| Capa                 | Comportamiento                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Front internos       | `AuthGate` + Keycloak + Google (igual que el resto del toolbox)                                                                                   |
| Front clientes       | Puerta `/cliente/login`: Keycloak **client OIDC distinto**, usuario + clave; **sin** Google ([auth-clientes.md](./auth-clientes.md), ADR-010/011) |
| Back `/v1/*`         | `Authorization: Bearer`; verificación JWKS (aud/issuer acordados para ambos clients)                                                              |
| Back `/health*`      | Público                                                                                                                                           |
| `AUTH_MODE=disabled` | Solo no-producción; en prod fallo cerrado sin Keycloak                                                                                            |

El access token sigue en `localStorage` / patrón vigente del portal **por instancia de auth**. Esta feature **no** migra el modelo de tokens; la puerta cliente usa su propio `clientId` Keycloak.

Correo al cliente: solo activación / reset de clave. No es canal de consulta diaria ni magic link permanente.

---

## AuthZ

| Recurso                     | Regla                                                                             |
| --------------------------- | --------------------------------------------------------------------------------- |
| Catálogo                    | Filtrar por `audiences` del API ∩ claims del token                                |
| Spec                        | Misma regla que catálogo; si no aplica → **404** genérico                         |
| Publish (C)                 | Requiere claim/rol `docs:publish` → si no, **403**; tokens cliente nunca publican |
| Hub / herramientas internas | Solo sesión interna; cliente autenticado no enumera ni usa el hub                 |

### MVP de claims (B interno)

- Toda sesión válida del toolbox **interno** se trata como audiencia `internal`.
- Solo APIs marcadas `internal` (o sin restricción explícita de cliente) aparecen.

### Fase clientes

- Claim/atributo mapeado a `client:<id>` (env `DOCS_CLIENT_AUDIENCE_CLAIM` + prefijo).
- Token solo-cliente → audiencias efectivas `['client:<id>']` (**sin** `internal` por defecto).
- Internos: `internal` (+ extras que IAM defina después).
- Detalle de flujos y CA: [auth-clientes.md](./auth-clientes.md).

---

## Enumeración

| Escenario                       | Respuesta                                                         |
| ------------------------------- | ----------------------------------------------------------------- |
| `apiId` inexistente             | 404 + mensaje genérico                                            |
| `apiId` existente sin audiencia | **Mismo** 404 + mismo mensaje                                     |
| Lista                           | Solo ítems autorizados (nunca “existen 12 pero ves 2” en headers) |

Mensaje sugerido: `No se encontró la documentación solicitada.`

---

## CSP y red

- El navegador solo llama same-origin `/docs-api/`.
- No añadir hosts del docs-ms a `connect-src` del bundle; el proxy nginx absorbe.
- El visor OpenAPI (Scalar/Swagger) no debe requerir `unsafe-eval` si es evitable; validar CSP al integrar la librería.
- Prohibido `dangerouslySetInnerHTML` con contenido del spec sin sanitizar (el visor elegido debe usarse de forma soportada).

---

## Upload (fase C)

| Control        | Valor                                                   |
| -------------- | ------------------------------------------------------- |
| Tamaño máx.    | 2 MiB                                                   |
| Tipos          | YAML / JSON OpenAPI 3.x                                 |
| Parse          | Rechazar si no hay campo `openapi` 3.x                  |
| Path traversal | `apiId` validado como slug `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| Sobrescritura  | Solo `current` del `apiId` autorizado                   |
| Virus/malware  | Confiar en allowlist + parse; no ejecutar el archivo    |

No aceptar ZIP ni HTML.

---

## Datos y PII

| Dato            | Tratamiento                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------- |
| OpenAPI         | Puede describir campos de negocio; es documentación, no datos personales de clientes finales |
| Token           | No loguear                                                                                   |
| Email / subject | Opcional en audit de publish (C); nivel info mínimo                                          |
| Spec body       | No loguear completo en info; debug solo en no-prod                                           |

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

### Checklist adicional — fase clientes

- [x] `/cliente/login` sin botón Google
- [x] Rutas `/cliente/docs*` fuera del shell hub / AuthGate Google
- [x] 401 en puerta cliente → `/cliente/login` (no login interno)
- [ ] Tests: `client:a` no lista ni abre APIs de `client:b` ni solo-`internal` (cubierto en MS con `X-Dev-Audiences`; Keycloak real pendiente IAM)
- [x] Token cliente → `canPublish=false` / 403 en publish (UI sin publish + MS)
- [x] Login Google de empleados sin regresión (guards cruzados CA-C04)
