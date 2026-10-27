# Operación admin — crear docs, asignar y clientes

Responde las preguntas de producto que el código de lectura/publish **aún no cubre**. Esta fase se implementa encima de B+C+puerta clientes.

| Pregunta | Respuesta de producto |
| --- | --- |
| ¿Cómo creo una documentación nueva? | Admin/super-admin en `/docs/admin` → “Nueva documentación” (nombre, id, archivo OpenAPI, audiencias). |
| ¿Cómo se la asigno a un cliente? | En el detalle de la API, sección “Quién puede verla”: marcas `internal` y/o clientes existentes. |
| ¿Cómo creo un cliente y mando el link de activación? | En `/docs/admin/clientes` → alta (NIT, correo, nombre) → el sistema crea la cuenta y envía (o muestra) el link para definir clave. |

**Fuera:** editor WYSIWYG, PDF, correo con el OpenAPI adjunto.

---

## 1. Quién puede operar

| Actor toolbox | Puede |
| --- | --- |
| `super_admin` o `admin` (access-ms) **o** acción `manage` en app `docs` | Crear docs, asignar audiencias, crear/reenviar clientes |
| Usuario interno sin `manage` | Solo leer catálogo `internal` y, si tiene `publish`, actualizar spec de una API que ya existe |
| Cliente | Solo leer lo suyo; sin admin |

El front usa `isSuperAdmin` o `canPerformAction("docs", "manage")`. El MS exige claim/rol `docs:manage` (env `DOCS_MANAGE_CLAIM`, default `docs:manage`). En `AUTH_MODE=disabled`, header `X-Dev-Can-Manage: true` (el bypass de admin del front lo envía).

`docs:publish` sigue sirviendo para **reemplazar** el archivo de una API existente. Crear API nueva y cambiar audiencias exigen `docs:manage`.

---

## 2. Crear una documentación nueva

### UI — `/docs/admin/nueva`

Campos:

| Campo | Regla |
| --- | --- |
| Nombre | Obligatorio |
| Id (slug) | `^[a-z0-9]+(?:-[a-z0-9]+)*$`; si vacío, derivar del nombre |
| Descripción | Opcional |
| Archivo | YAML/JSON OpenAPI 3.x, ≤ 2 MiB |
| Audiencias iniciales | Por defecto `internal`. Checkboxes de clientes + “Solo internos”. |

Éxito → navega a `/docs/:apiId` y la card aparece en el catálogo de quien tenga audiencia.

### API

`POST /v1/admin/apis` (`multipart/form-data`)

| Parte | Tipo |
| --- | --- |
| `id` | string slug |
| `name` | string |
| `description` | string opcional |
| `audiences` | JSON array string, ej. `["internal","client:900123"]` |
| `file` | OpenAPI |

| HTTP | Cuándo |
| --- | --- |
| 201 | `{ "data": { "id", "name", "version", "audiences" } }` |
| 403 | Sin `docs:manage` |
| 409 | `id` ya existe |
| 400 | OpenAPI inválido / slug inválido |
| 413 | > 2 MiB |

Efecto: inserta fila en catálogo + escribe `data/specs/<id>/current.json`.

Actualizar archivo de una API ya creada sigue siendo `POST /v1/apis/:apiId/specs` (publish).

---

## 3. Asignar la documentación a cada cliente

La asignación **no** es un correo con el PDF. Es la lista `audiences` de la API.

### UI — en `/docs/:apiId` (solo quien tiene `manage`)

Sección **“Quién puede ver esta documentación”**:

- Checkbox “Internos” ↔ audiencia `internal`
- Un checkbox por cliente dado de alta ↔ `client:<nit>`
- Guardar → `PATCH /v1/admin/apis/:apiId`

El cliente, la próxima vez que entre a `/cliente/docs`, ve la API si su token trae ese `client:<id>`. Si se le quita el check, deja de verla (404 genérico si pega la URL).

### API

`PATCH /v1/admin/apis/:apiId`

```json
{ "audiences": ["internal", "client:900123456"] }
```

| HTTP | Cuándo |
| --- | --- |
| 200 | `{ "data": DocsApiDetail }` |
| 403 | Sin manage |
| 404 | API inexistente |
| 400 | Audiencia con formato inválido (debe ser `internal` o `client:<id>`) |

`GET /v1/admin/clients` alimenta los checkboxes.

---

## 4. Crear clientes y link de activación

### UI — `/docs/admin/clientes`

| Acción | Qué ve el admin |
| --- | --- |
| Listar | NIT, nombre, correo, estado (`pendiente` / `activo` / `deshabilitado`) |
| Crear | NIT (id), correo, nombre → botón “Crear y enviar activación” |
| Reenviar | “Reenviar link de activación” |
| Deshabilitar | Deja de poder entrar; no borra las asignaciones de audiencias |

Copy de éxito: *Se envió el enlace para que el cliente cree su contraseña.*

### Reglas

- Un cliente = un NIT = una audiencia `client:<nit>`.
- Username de login = NIT. Correo = destino del link.
- El link **solo** sirve para definir/resetear clave (Keycloak). Después entra en `/cliente/login`.
- No se adjunta OpenAPI en ese correo.

### API

`GET /v1/admin/clients` → `{ "data": Client[] }`

`POST /v1/admin/clients`

```json
{ "id": "900123456", "email": "integraciones@cliente.com", "name": "Cliente Demo" }
```

`POST /v1/admin/clients/:id/activation` → reenvía el link. 204.

`PATCH /v1/admin/clients/:id` body `{ "status": "disabled" | "active" }`.

### Cómo se envía el link

| Modo | Comportamiento |
| --- | --- |
| `CLIENTS_DRIVER=local` (default dev) | Guarda `data/clients.json`. No llama a Keycloak. La respuesta 201 incluye `activationUrl` (URL del realm de reset **o** un token local de un solo uso). La UI lo muestra una vez para copiar (“en local no hay SMTP”). |
| `CLIENTS_DRIVER=keycloak` | Admin API de Keycloak: crear usuario (username=NIT, email, atributo que mapea a `client:<id>`), `execute-actions-email` con `UPDATE_PASSWORD`, lifespan configurable (`KEYCLOAK_ACTION_LIFESPAN_SEC`, default 72 h). El correo lo manda **Keycloak**, no el toolbox. |

Variables Keycloak admin (solo runtime, nunca en el repo):

| Variable | Uso |
| --- | --- |
| `KEYCLOAK_ADMIN_BASE_URL` | URL del realm admin |
| `KEYCLOAK_ADMIN_REALM` | Realm |
| `KEYCLOAK_ADMIN_CLIENT_ID` / `KEYCLOAK_ADMIN_CLIENT_SECRET` | Client confidential con permiso `manage-users` |
| `KEYCLOAK_CLIENTS_CLIENT_ID` | Client OIDC de la puerta `/cliente` (redirect del action) |
| `DOCS_CLIENT_USER_ATTRIBUTE` | Atributo de usuario, default `docs_audiences`, valor `client:<nit>` o solo el NIT si el MS aplica prefijo |

Sin esas variables, el driver queda en `local`.

---

## 5. Criterios

| ID | Dado | Cuando | Entonces |
| --- | --- | --- | --- |
| CA-A01 | Admin | Crea API con OpenAPI válido | 201; aparece en `GET /v1/apis` para `internal` si esa audiencia va incluida |
| CA-A02 | Sin manage | `POST /v1/admin/apis` | 403 |
| CA-A03 | Admin | PATCH audiences a `client:900` | Cliente `900` la lista; `client:otro` no |
| CA-A04 | Admin | POST cliente nuevo (driver local) | 201 con `activationUrl`; queda en el listado `pendiente` |
| CA-A05 | Admin | Reenvía activación | 204 (local: nueva URL) |
| CA-A06 | Cliente deshabilitado | Login / token | No obtiene catálogo (401 o usuario disabled en Keycloak) |
| CA-A07 | UI admin | Usuario sin manage | No ve “Nueva documentación” ni “Clientes” |

---

## 6. Front — archivos

```text
src/features/docs/admin/
  docs-admin-page.tsx          # índice: nueva + link a clientes
  new-api-form.tsx
  edit-api-form.tsx             # editar nombre/desc/audiencias si manage
  clients-page.tsx
  client-form.tsx
```

Rutas (dentro del AuthGate interno, `AppAccessGuard` app `docs`):

| Ruta | Página |
| --- | --- |
| `/docs/admin` | Índice admin |
| `/docs/admin/nueva` | Crear documentación |
| `/docs/admin/clientes` | Alta y reenvío |

Entrada: botón “Administrar” en `/docs` solo si `manage`.

---

## 7. Orden de build

1. MS: `docs:manage` + POST crear API + PATCH audiences + tests CA-A01…A03.
2. MS: clientes driver `local` + tests CA-A04…A06.
3. Front: pantallas admin + ocultar si no hay manage.
4. Driver `keycloak` (mismo puerto) cuando existan las variables admin; no bloquear el 1–3.
5. Humo: crear API → asignar a `client:demo` → entrar como cliente dev → verla.

---

## 8. Qué no cambia

- El cliente no publica ni administra.
- Mismos `GET /v1/apis` para leer.
- Sin PDF ni correo con la especificación.
