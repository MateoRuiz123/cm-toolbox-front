# Control de Acceso y Estado de Aplicaciones — Back (`cm-toolbox-access-ms`)

Documento técnico **detallado** del microservicio de autorización, catálogo de aplicaciones y auditoría del Toolbox.

**Companion:** [front.md](./front.md)
**Índice:** [README.md](./README.md)
**Contrato:** [contrato-http.md](./contrato-http.md) · [decisiones.md](./decisiones.md) · [seguridad.md](./seguridad.md) · [runbook-local.md](./runbook-local.md)

| Campo                  | Valor                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Nombre servicio        | `cm-toolbox-access-ms`                                                                                              |
| Ubicación en workspace | `/home/mateor/Escritorio/local/cm-toolbox-access-ms`                                                                |
| Scripts SQL base       | `/home/mateor/Escritorio/local/cm-toolbox-front/sql/` (y copia sincronizada en `cm-toolbox-access-ms/sql/`)         |
| Puerto por defecto     | `8083` (evita choque con API internos `:8080`, logs `:8081` y docs `:8082`)                                         |
| Consumidor primario    | `cm-toolbox-front` vía proxy `/access-api/`                                                                         |
| Arquitectura           | Hexagonal (`@domain`, `@application`, `@infrastructure`, `@configuration`, `@util`) + Fastify 5 + InversifyJS + Joi |
| Persistencia           | PostgreSQL 16 (`pg` en puerto local `:5433`) + Redis 7 (`redis` en puerto local `:6380`)                            |

---

## 1. Objetivo del servicio

Ser la **única autoridad de autorización (AuthZ)** del ecosistema Toolbox:

1. Verificar la identidad del llamante validando el JWT de Keycloak (`Authorization: Bearer`) o inyectando el usuario mock en desarrollo local (`AUTH_MODE=disabled`).
2. Resolver el perfil efectivo del usuario (`GET /v1/me/access`) cruzando:
   - Lista de Super-Admins por variable de entorno (`SUPER_ADMIN_EMAILS`).
   - Registro del usuario en PostgreSQL (`users`).
   - Permisos base del rol (`role_default_permissions`).
   - Excepciones puntuales del usuario (`user_app_permissions` con `is_allowed = true | false`).
   - Estado operativo global de cada aplicación (`apps.status`: `active`, `maintenance`, `disabled`).
3. Administrar usuarios, roles, permisos y el estado global de aplicaciones con validaciones estrictas de jerarquía (`hierarchy_level`).
4. Registrar cada cambio administrativo en `audit_logs` dentro de la misma transacción SQL.
5. Acelerar las lecturas mediante Redis (`Cache-Aside`) con invalidación inmediata en cada escritura.

---

## 2. Flujos del Microservicio (`B-*`)

### Flujo B-A — Obtener acceso efectivo (`GET /v1/me/access`)

1. `AuthMiddleware` extrae el correo del token JWT (o `DEV_MOCK_EMAIL` si `AUTH_MODE=disabled` en entorno no productivo) y lo normaliza a minúsculas.
2. `GetEffectiveAccessService` busca en Redis:
   - `rbac:catalog:apps` (catálogo de `apps` + `app_actions` + `role_default_permissions`).
   - `rbac:user:<email>` (registro de `users` + `user_app_permissions`).
3. Si alguna clave no está en Redis (`MISS`), consulta PostgreSQL y guarda el resultado en Redis con TTL de `300 s`.
4. Si el usuario tiene `is_blocked = true` y **no** está en `SUPER_ADMIN_EMAILS`, lanza `ForbiddenError('USER_BLOCKED')` → `403`.
5. Invoca `evaluateEffectiveAccess` (función pura de dominio) y responde `200 OK` con `{ data: EffectiveUserAccess }`.

### Flujo B-B — Cambiar estado de una aplicación (`PATCH /v1/admin/apps/:appId`)

1. Verifica que el actor tenga `canManageApps === true` (rol efectivo `admin`). Si es `sub_admin` o `user` → `403 Forbidden`.
2. Valida con Zod que `:appId` sea un slug válido y que `status` sea `'active' | 'maintenance' | 'disabled'`.
3. En `PgAccessRepository.updateAppStatus`, abre transacción SQL (`BEGIN`):
   - Lee el estado actual de la fila en `apps` (`FOR UPDATE`). Si no existe → `404 NotFoundError`.
   - Actualiza `status`, `updated_by = actorEmail`, `updated_at = NOW()`.
   - Inserta fila en `audit_logs` con `event_type = 'APP_STATUS_CHANGED'`, `target_type = 'app'`, `target_id = appId`, `before_state` y `after_state`.
   - Hace `COMMIT`.
4. Ejecuta `cache.del('rbac:catalog:apps')` en Redis.
5. Responde `200 OK` con la aplicación actualizada.

### Flujo B-C — Crear o actualizar usuario y sus permisos (`PUT /v1/admin/users/:email`)

1. Verifica que el actor tenga `canManageUsers === true` (`admin` o `sub_admin`). Si es `user` → `403`.
2. Evalúa las reglas de protección jerárquica en dominio:
   - Si `targetEmail` pertenece a `SUPER_ADMIN_EMAILS` o ya tiene `is_super_admin = true` en BD → `403 SUPER_ADMIN_PROTECTED`.
   - Si `actorEmail === targetEmail` y el payload cambia su `roleId` o activa `isBlocked = true` → `400 SELF_LOCKOUT_PREVENTED`.
   - Si el actor es `sub_admin` (`hierarchy_level = 50`):
     - Si el usuario objetivo ya existe en BD con rol `admin` o `sub_admin` (`hierarchy_level >= 50`) → `403 INSUFFICIENT_ROLE_HIERARCHY`.
     - Si el payload intenta asignar `roleId` distinto de `'user'` → `403 INSUFFICIENT_ROLE_HIERARCHY`.
3. En `PgAccessRepository.upsertUserAccess`, abre transacción SQL (`BEGIN`):
   - Lee estado previo del usuario y sus `user_app_permissions`.
   - Hace `INSERT INTO users ... ON CONFLICT (email) DO UPDATE` actualizando `display_name`, `role_id`, `is_blocked`, `notes`, `updated_by`.
   - Reemplaza las filas de `user_app_permissions` del usuario con las enviadas en `permissions`.
   - Inserta en `audit_logs` (`event_type = 'USER_ACCESS_UPDATED'`, `before_state`, `after_state`).
   - Hace `COMMIT`.
4. Ejecuta `cache.del('rbac:user:' + targetEmail)` en Redis.
5. Responde `200 OK` con el detalle actualizado del usuario.

### Flujo B-D — Listar usuarios (`GET /v1/admin/users`)

1. Requiere `canManageUsers === true` (`admin` o `sub_admin`).
2. Consulta PostgreSQL uniendo `users`, `roles` y `user_app_permissions`, aplicando filtros opcionales `search` (ILIKE sobre `email` o `display_name`) y `roleId`.
3. Marca `isSuperAdmin: true` si el correo está en `SUPER_ADMIN_EMAILS` o en la columna `is_super_admin`.

### Flujo B-E — Consultar auditoría (`GET /v1/admin/audit`)

1. Requiere `canManageApps === true` (solo `admin`).
2. Consulta `audit_logs` ordenado por `created_at DESC` con `limit` (máx 100, default 50) y `offset` (default 0).

---

## 3. Reglas de negocio y dominio (`RB-*`)

| ID    | Regla                                                                                                                                                                                                                | Impacto |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| RB-01 | Todo correo se normaliza con `.trim().toLowerCase()` antes de consultar Redis, Postgres o `SUPER_ADMIN_EMAILS`.                                                                                                      | Crítico |
| RB-02 | `SUPER_ADMIN_EMAILS` tiene precedencia absoluta sobre la base de datos: nunca puede ser bloqueado ni degradado.                                                                                                      | Crítico |
| RB-03 | Ningún usuario puede cambiar su propio rol ni auto-bloquearse (`actorEmail === targetEmail`).                                                                                                                        | Alto    |
| RB-04 | Un actor solo puede administrar usuarios cuyo rol actual y rol nuevo tengan un `hierarchy_level` estrictamente menor al suyo, excepto `admin` (nivel 100) que puede gestionar otros `admin` que no sean Super-Admin. | Crítico |
| RB-05 | Cuando una app está en `maintenance`, solo `admin` recibe `canAccess: true`. Cuando está en `disabled`, todos reciben `canAccess: false`.                                                                            | Crítico |
| RB-06 | Para que una app tenga `canAccess: true`, la acción `'view'` debe estar presente en las acciones efectivas del usuario para esa app.                                                                                 | Alto    |
| RB-07 | Si un usuario tiene `user_app_permissions` con `is_allowed = false` para `'view'`, se le revoca el acceso a esa app aunque su rol base lo incluya.                                                                   | Alto    |
| RB-08 | Toda mutación en `apps` o `users` escribe en `audit_logs` en la misma transacción SQL.                                                                                                                               | Alto    |
| RB-09 | Fallos de conexión a Redis nunca abortan una petición: se loguean como advertencia y se resuelve contra PostgreSQL.                                                                                                  | Alto    |
| RB-10 | En `NODE_ENV=production`, `AUTH_MODE=disabled` lanza error fatal al iniciar el proceso.                                                                                                                              | Crítico |

---

## 4. Criterios de aceptación del Backend (`CA-B*`)

| ID     | Dado                                                                                | Cuando                                                                                          | Entonces                                                                                         | Bloqueante |
| ------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------- |
| CA-B01 | Servicio iniciado                                                                   | `GET /health`                                                                                   | `200 OK` con `{ status: "ok" }`                                                                  | Sí         |
| CA-B02 | `AUTH_MODE=keycloak` y petición sin Bearer                                          | `GET /v1/me/access`                                                                             | `401 Unauthorized`                                                                               | Sí         |
| CA-B03 | Correo en `SUPER_ADMIN_EMAILS`                                                      | `GET /v1/me/access`                                                                             | `200 OK` con `roleId: "admin"`, `isSuperAdmin: true` y acceso a todas las apps no deshabilitadas | Sí         |
| CA-B04 | Correo `@coordinadora.com` que no existe en tabla `users`                           | `GET /v1/me/access`                                                                             | `200 OK` con `roleId: "user"` y permisos por defecto del rol `user` (`diagnostico: ['view']`)    | Sí         |
| CA-B05 | Usuario `operador.local@coordinadora.com` (con override `logs:view = true` en seed) | `GET /v1/me/access`                                                                             | `200 OK` con `canAccess: true` tanto en `diagnostico` como en `logs`                             | Sí         |
| CA-B06 | Usuario con `is_blocked = true`                                                     | `GET /v1/me/access`                                                                             | `403 Forbidden` con `code: "USER_BLOCKED"`                                                       | Sí         |
| CA-B07 | App `logs` cambiada a `maintenance`                                                 | `GET /v1/me/access` para `operador.local` vs `dev.local`                                        | `operador.local` recibe `canAccess: false`; `dev.local` (`admin`) recibe `canAccess: true`       | Sí         |
| CA-B08 | Actor `subadmin.local@coordinadora.com` (`sub_admin`)                               | `PUT /v1/admin/users/operador.local@coordinadora.com` con `roleId: "user"` y nuevos permisos    | `200 OK`, persiste en BD, escribe en `audit_logs` e invalida Redis                               | Sí         |
| CA-B09 | Actor `subadmin.local@coordinadora.com` (`sub_admin`)                               | `PUT /v1/admin/users/nuevo@coordinadora.com` intentando poner `roleId: "sub_admin"` o `"admin"` | `403 Forbidden` (`INSUFFICIENT_ROLE_HIERARCHY`)                                                  | Sí         |
| CA-B10 | Actor `admin`                                                                       | `PUT /v1/admin/users/dev.local@coordinadora.com` (Super-Admin) intentando bloquearlo            | `403 Forbidden` (`SUPER_ADMIN_PROTECTED`)                                                        | Sí         |
| CA-B11 | Actor `admin`                                                                       | `PATCH /v1/admin/apps/diagnostico` con `{ status: "maintenance" }`                              | `200 OK`, actualiza tabla `apps`, registra `APP_STATUS_CHANGED` en `audit_logs` y borra caché    | Sí         |
| CA-B12 | Redis detenido                                                                      | Cualquier endpoint `/v1/*`                                                                      | Responde `200 OK` operando directamente contra PostgreSQL                                        | Sí         |

---

## 5. Arquitectura de carpetas en `cm-toolbox-access-ms`

```text
cm-toolbox-access-ms/
├── sql/
│   ├── 001_schema.sql
│   ├── 002_seed.sql
│   └── 003_views_and_queries.sql
├── src/
│   ├── domain/
│   │   ├── models/
│   │   │   └── AccessModels.ts            # RoleId, AppStatus, ToolApp, UserRecord, EffectiveUserAccess, AuditLogEntry
│   │   ├── ports/
│   │   │   └── AccessPorts.ts             # AccessRepository, AccessCache, TokenVerifier
│   │   ├── services/
│   │   │   └── AccessPolicyEvaluator.ts   # Evaluación pura de permisos efectivos y jerarquía de roles
│   │   └── errors/
│   │       └── DomainErrors.ts            # UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError
│   ├── application/
│   │   └── services/
│   │       ├── GetEffectiveAccessService.ts
│   │       ├── AdminAppsService.ts
│   │       ├── AdminUsersService.ts
│   │       └── AdminAuditService.ts
│   ├── infrastructure/
│   │   ├── auth/
│   │   │   ├── KeycloakTokenVerifier.ts   # Verificación JWKS con jose
│   │   │   └── DevTokenVerifier.ts        # Permite header x-dev-user-email en modo dev para probar roles fácil
│   │   ├── persistence/
│   │   │   ├── pg/
│   │   │   │   ├── PgPool.ts
│   │   │   │   └── PgAccessRepository.ts
│   │   │   └── redis/
│   │   │       └── RedisAccessCache.ts
│   │   └── api/
│   │       ├── middlewares/
│   │       │   ├── AuthMiddleware.ts
│   │       │   └── ErrorMiddleware.ts
│   │       ├── routers/
│   │       │   ├── MeAccessRouter.ts
│   │       │   └── AdminAccessRouter.ts
│   │       └── App.ts
│   └── setup/
│       ├── Envs.ts
│       ├── Types.ts
│       ├── Container.ts                   # InversifyJS Dependency Container
│       └── index.ts
├── test/
│   ├── AccessPolicyEvaluator.test.ts
│   └── ApiIntegration.test.ts
├── docker-compose.yml
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 6. Tip de productividad para pruebas locales (`x-dev-user-email`)

Cuando `AUTH_MODE=disabled` (solo permitido en `NODE_ENV !== 'production'`):

- Por defecto el middleware identifica al usuario como `DEV_MOCK_EMAIL` (`dev.local@coordinadora.com`).
- Si la petición incluye el header `x-dev-user-email: subadmin.local@coordinadora.com` (o `operador.local@coordinadora.com`), el `DevTokenVerifier` adopta ese correo.
- Esto permite probar en segundos cómo responde el backend para `admin`, `sub_admin` y `user` sin tener que iniciar sesión con 3 cuentas distintas de Google.

---

## 7. Orden de implementación recomendado (Back)

1. `DomainErrors.ts` y ampliación de `AccessModels.ts` / `AccessPorts.ts` / `AccessPolicyEvaluator.ts`.
2. Tests unitarios de `AccessPolicyEvaluator.test.ts` (cubriendo `admin`, `sub_admin`, `user`, `maintenance`, `disabled`, overrides `allow`/`deny` y jerarquía).
3. `PgPool.ts` y `PgAccessRepository.ts` usando las tablas de `sql/001_schema.sql`.
4. `RedisAccessCache.ts` con `ioredis` y manejo de errores silencioso.
5. Casos de uso en `src/application/services/`.
6. `KeycloakTokenVerifier.ts`, `DevTokenVerifier.ts`, `AuthMiddleware.ts`, routers Express y contenedor Inversify (`Container.ts`).
7. Levantar `docker compose up -d` y verificar con `curl` los endpoints contra los datos semilla de `sql/002_seed.sql`.
