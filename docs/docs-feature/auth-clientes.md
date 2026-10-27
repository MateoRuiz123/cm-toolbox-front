# Fase clientes — Acceso persistente a documentación

Documento de diseño para la **fase clientes** de la feature Docs. Complementa el MVP interno (opción B con Google) sin cambiar el contrato HTTP ni el filtro `audiences` de `cm-docs-ms`.

**Prerrequisito:** opción B interna usable (catálogo + visor + proxy).
**Companions:** [front.md](./front.md) · [back.md](./back.md) · [seguridad.md](./seguridad.md) · [decisiones.md](./decisiones.md) · [runbook-local.md](./runbook-local.md)

| Campo       | Valor                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estado      | **Código listo** (sesión OIDC, callback, refresh, guards, 401); provisión Keycloak **pendiente identidad** — [peticion-iam-keycloak.md](./peticion-iam-keycloak.md) |
| Auth diaria | Usuario + clave (Keycloak); en local “Entrar (dev)” → `client:demo`                                                                                                 |
| Correo      | Solo alta / activación / “olvidé mi clave” (cuando IAM lo active)                                                                                                   |
| Puerta      | Rutas `/cliente/*` (mismo SPA, sin hub)                                                                                                                             |
| Operación   | [guia-operativa.md](./guia-operativa.md)                                                                                                                            |

---

## 1. Objetivo

Que un cliente externo:

1. Tenga una **cuenta permanente** (no un link que vence para consultar cada día).
2. Entre por una **puerta distinta** al login Google de empleados.
3. Vea **solo** las APIs con audiencia `client:<id>` (ej. `client:900123456`).
4. **No** vea hub, logs, diagnóstico, admin ni docs solo-`internal`.

---

## 2. Actores

| Actor              | Cómo autentica                                 | Qué ve                                                        |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------------- |
| Empleado (interno) | Keycloak + Google (flujo actual)               | Hub + `/docs` con audiencia `internal` (+ lo que IAM permita) |
| Cliente externo    | Keycloak client OIDC distinto, usuario + clave | Solo `/cliente/docs` y `/cliente/docs/:apiId`                 |
| IAM / identidad    | Alta, baja, reset                              | Fuera del repo front; bloqueante operativo                    |
| `cm-docs-ms`       | Valida JWT + filtra `audiences`                | Misma API `/v1/*` para ambos                                  |

---

## 3. Matriz puerta / rutas / menú / claims

| Puerta  | Rutas permitidas                                          | Shell / menú                               | Claims mínimos en token                                        |
| ------- | --------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| Interna | `/`, `/docs`, `/docs/:apiId`, resto hub                   | Hub completo                               | Audiencia efectiva `internal` (MVP B); opcional `docs:publish` |
| Cliente | `/cliente/login`, `/cliente/docs`, `/cliente/docs/:apiId` | Shell mínimo (logo, título, cerrar sesión) | Al menos un `client:<id>`                                      |

Reglas:

- Token de cliente que navega a `/` o `/docs` → redirigir a `/cliente/docs` (o 403 UI).
- Token interno que entra a `/cliente/*` → redirigir a `/docs` (o mensaje “usa el acceso interno”).
- Sin sesión en `/cliente/docs` → `/cliente/login`.
- Sin sesión en `/docs` → login Google existente (`AuthGate`).

---

## 4. Flujos

### Flujo C-A — Alta (operación IAM)

1. Operaciones / IAM crea usuario cliente en Keycloak (client OIDC de clientes).
2. Asigna atributo `client_id` (o equivalente) = NIT / id estable → se mapea a claim `client:<id>`.
3. Dispara correo de **activación** (establecer contraseña). El link del correo puede vencer; la **cuenta** no.
4. Hasta activar, el login diario falla con mensaje de cuenta no activada (copy Keycloak / pantalla propia).

### Flujo C-B — Primer acceso

1. Cliente abre el link de activación → define clave.
2. Redirige a `/cliente/login` (o login Keycloak del client OIDC clientes).
3. Ingresa usuario (NIT o email según IAM) + clave.
4. Keycloak emite access token con claim de audiencia `client:<id>`.
5. Front guarda sesión del client OIDC clientes (mismo patrón de storage que el portal, **instancia Keycloak distinta** / `clientId` distinto).
6. Navega a `/cliente/docs` → `GET /docs-api/v1/apis` con Bearer.
7. Ve solo APIs cuya `audiences` intersecta `client:<id>`.

### Flujo C-C — Login diario (feliz)

1. Cliente abre `/cliente/login` (bookmark o URL que le dieron).
2. Usuario + clave → token → `/cliente/docs`.
3. Abre una card → `/cliente/docs/:apiId` → visor (mismo componente que internos, otra ruta).
4. Cerrar sesión limpia tokens del client OIDC clientes y vuelve a `/cliente/login`.

### Flujo C-D — Olvidé mi clave

1. En `/cliente/login`, enlace “¿Olvidaste tu contraseña?”.
2. Flujo nativo Keycloak (reset por correo).
3. Tras reset, login diario igual que C-C.
4. El link de reset **no** sirve como acceso permanente a la documentación.

### Flujo C-E — Baja / revocación

1. IAM deshabilita o elimina el usuario (o quita el atributo `client:<id>`).
2. Nuevos logins fallan; tokens ya emitidos caducan según TTL Keycloak.
3. Catálogo vacío o 401 según estado del token; no hay bypass en el MS.

### Flujo C-F — Aislamiento A vs B

1. Usuario `client:a` llama `GET /v1/apis` → solo APIs con `client:a` (y no solo-`internal`).
2. Usuario `client:a` pide openapi de API solo `client:b` o solo `internal` → **404** genérico.
3. Mismo mensaje que “no existe” ([seguridad.md](./seguridad.md)).

### Flujo C-G — Sesión perdida (401)

1. MS responde 401.
2. Portal cliente: cerrar sesión local y redirigir a `/cliente/login`.
3. **No** redirigir al login Google de internos.

---

## 5. Criterios de aceptación (CA-C\*)

| ID     | Dado                         | Cuando                                      | Entonces                                        | Bloqueante |
| ------ | ---------------------------- | ------------------------------------------- | ----------------------------------------------- | ---------- |
| CA-C01 | Cliente con cuenta activada  | Login usuario+clave en puerta cliente       | Entra a `/cliente/docs` con catálogo filtrado   | Sí         |
| CA-C02 | Token `client:a`             | `GET /v1/apis`                              | Solo APIs con audiencia `client:a`              | Sí         |
| CA-C03 | Token `client:a`             | OpenAPI de API solo `client:b` o `internal` | 404 genérico                                    | Sí         |
| CA-C04 | Cliente autenticado          | Intenta abrir `/` o `/docs` del hub         | No ve herramientas internas; redirect o bloqueo | Sí         |
| CA-C05 | Pantalla `/cliente/login`    | Se muestra                                  | No hay botón “Iniciar sesión con Google”        | Sí         |
| CA-C06 | Empleado con Google          | Usa flujo interno                           | Login Google y `/docs` siguen iguales           | Sí         |
| CA-C07 | Usuario deshabilitado en IAM | Intenta login o usa token viejo             | No obtiene catálogo autorizado                  | Sí         |
| CA-C08 | Reset password               | Completa flujo correo                       | Puede volver a entrar con clave nueva           | Sí         |
| CA-C09 | Cliente sin APIs asignadas   | Carga catálogo                              | Empty state (mismo copy que internos)           | Sí         |
| CA-C10 | Publish (fase C)             | Token solo cliente                          | 403; UI cliente **no** muestra publish          | Sí         |

---

## 6. Contrato con IAM (bloqueante)

Definir con el equipo de identidad **antes** de codear la fase en prod:

| Tema                  | Requisito                                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Client OIDC           | Distinto al del toolbox interno (ej. `toolbox-docs-clientes`)                                                     |
| IdP Google            | **Deshabilitado** en ese client; solo username/password (o federación acordada no-Google-corporativo)             |
| Claim audiencia       | Atributo usuario → claim JWT, valor `client:<id>` (formato fijo)                                                  |
| Identificador login   | NIT y/o email — documentar cuál es username canónico                                                              |
| Activación / reset    | Flujos Keycloak (execute actions / reset credentials)                                                             |
| Issuer / audience JWT | El MS debe aceptar tokens del client de clientes **o** mismo realm con `azp`/`aud` configurado; documentar en env |
| TTL access token      | Alineado al portal interno salvo decisión contraria                                                               |

Variables MS sugeridas (fase clientes):

| Variable                      | Uso                                                              |
| ----------------------------- | ---------------------------------------------------------------- |
| `DOCS_CLIENT_AUDIENCE_CLAIM`  | Nombre del claim (ej. `docs_audiences` o `client_id`)            |
| `DOCS_CLIENT_AUDIENCE_PREFIX` | Prefijo si el claim trae solo el id (`900123` → `client:900123`) |
| `KEYCLOAK_AUDIENCE` / lista   | Auds aceptados (interno + client OIDC clientes)                  |

Hasta que IAM entregue el claim, **no** se despliega la puerta `/cliente` a producción.

---

## 7. Copy (español) — puerta cliente

| Clave                | Texto                                                                               |
| -------------------- | ----------------------------------------------------------------------------------- |
| login_title          | Documentación para clientes                                                         |
| login_subtitle       | Ingresa con el usuario y la contraseña que te asignaron.                            |
| login_user_label     | Usuario                                                                             |
| login_password_label | Contraseña                                                                          |
| login_submit         | Entrar                                                                              |
| login_forgot         | ¿Olvidaste tu contraseña?                                                           |
| login_error          | No pudimos iniciar sesión. Revisa usuario y contraseña.                             |
| shell_title          | Documentación de APIs                                                               |
| shell_logout         | Cerrar sesión                                                                       |
| empty_catalog        | No hay documentación disponible para tu usuario.                                    |
| error_not_found      | No se encontró la documentación solicitada.                                         |
| error_generic        | No pudimos cargar la documentación. Intenta de nuevo.                               |
| back_catalog         | Volver al catálogo                                                                  |
| wrong_door_internal  | Este acceso es solo para clientes. Usa el portal interno con tu cuenta corporativa. |

No incluir textos ni botones de Google en esta puerta.

---

## 8. Front — alcance de implementación

### Crear

```text
src/features/docs-cliente/
  cliente-login-page.tsx
  cliente-shell.tsx              # layout mínimo
  cliente-docs-page.tsx          # reutiliza lista o wrapper de docs-page
  cliente-docs-viewer-page.tsx
  auth/
    cliente-keycloak-client.ts   # clientId / init distinto al interno
    cliente-auth-gate.tsx
```

Reutilizar `src/features/docs/api/docs-api.ts` y el visor; no duplicar contrato HTTP.

### Modificar

| Archivo             | Cambio                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/app/app.tsx`   | Rutas `/cliente/login`, `/cliente/docs`, `/cliente/docs/:apiId` **fuera** del shell hub / AuthGate Google |
| `.env.example`      | `VITE_KEYCLOAK_CLIENT_ID_CLIENTES=…` (y vars que ya use el portal)                                        |
| `use-page-title.ts` | Títulos `/cliente/*`                                                                                      |

### No hacer

- Mostrar tarjeta hub a clientes.
- Reutilizar `LoginScreen` con Google en la puerta cliente.
- Filtrar catálogo “a mano” en React como authz real.

---

## 9. Back — alcance de implementación

1. Mapeo configurable claim → `TokenClaims.audiences` (sustituye MVP “todo token = internal”).
2. Reglas:
   - Token interno (sin `client:*`, con marca interna acordada) → `['internal']` (+ extras IAM).
   - Token con `client:x` → `['client:x']` (y **no** añadir `internal` por defecto).
3. Seed local con al menos:
   - API solo `internal`
   - API `client:demo`
   - API `client:otro` (para prueba negativa)
4. Tests unitarios CA-C02, CA-C03, CA-C10.
5. `canPublish` solo con claim publish; tokens cliente → `false`.

Detalle de capas: [back.md](./back.md).

---

## 10. Orden de build

| #   | Paso                                                                       | Dueño     |
| --- | -------------------------------------------------------------------------- | --------- |
| 1   | B interno en verde (CA-F / CA-B)                                           | Dev       |
| 2   | Acuerdo IAM: client OIDC + claim `client:<id>` + activate/reset            | IAM + Dev |
| 3   | MS: mapeo claims + tests aislamiento + seed                                | Dev back  |
| 4   | Front: AuthGate cliente + rutas + shell + reuso docs API/visor             | Dev front |
| 5   | Humo: Google interno intacto; cliente A/B; revocación; 401 → login cliente | QA / Dev  |
| 6   | Documentar URLs definitivas para operaciones (qué link dar al cliente)     | Dev / Ops |

---

## 11. Fuera de alcance de esta fase

- PDF por correo como canal de consulta.
- Magic link como login diario.
- Multi-NIT en un mismo usuario (salvo que IAM lo modele después; MVP = un `client:<id>` por usuario).
- Portal clientes en otro dominio/SPA (posible later; default = mismo deploy).
- Opción C (upload): solo internos; ver [check-opcion-c.md](./check-opcion-c.md).

---

## 12. Definición de hecho (fase clientes)

- [ ] CA-C01 … CA-C10 cumplidos en ambiente con Keycloak real (IAM)
- [x] CA-C04 / C-G en código: guards cruzados + 401 → `/cliente/login`
- [x] Sesión OIDC clientes: init único, callback en `/cliente/docs`, refresh, logout IdP
- [x] ADR-007 / ADR-010 / ADR-011 reflejados en código y env (claim/aud documentados)
- [x] Runbook sección clientes + petición IAM
- [x] Ningún botón Google en `/cliente/login`
- [x] Empleado sigue entrando solo con Google al hub
