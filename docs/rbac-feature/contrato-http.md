# Contrato HTTP — Control de Acceso y Aplicaciones (`cm-toolbox-access-ms`)

Especificación normativa de comunicación entre `cm-toolbox-front` y `cm-toolbox-access-ms`.

- **Base same-origin (navegador):** `/access-api`
- **Upstream (Vite / nginx):** `ACCESS_API_UPSTREAM` (por defecto `http://localhost:8083`).
- El proxy reescribe `/access-api/v1/*` → `/v1/*`.

---

## 1. Convenciones

| Aspecto            | Regla                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Autenticación      | `Authorization: Bearer <token_sigoo>` en todo `/v1/*` (en modo dev con `AUTH_MODE=disabled` acepta opcionalmente `x-dev-user-email` para simular roles) |
| Respuesta exitosa  | HTTP `200` con envelope `{ "data": ... }`                                                                                                               |
| Respuesta de error | HTTP `4xx`/`5xx` con `{ "code": string, "message": string }`                                                                                            |
| Fechas             | ISO-8601 UTC (`2026-10-18T00:00:00.000Z`)                                                                                                               |

---

## 2. Catálogo de códigos de error (`code`)

| HTTP  | `code`                        | Mensaje sugerido (`message`)                                                  | Cuándo ocurre                                                                                 |
| ----- | ----------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `400` | `VALIDATION_ERROR`            | Datos de entrada inválidos.                                                   | Fallo de validación Zod en body/params.                                                       |
| `400` | `SELF_LOCKOUT_PREVENTED`      | No puedes modificar tu propio rol ni bloquear tu propia cuenta.               | Un admin intenta cambiar su propio `roleId` o `isBlocked`.                                    |
| `401` | `UNAUTHORIZED`                | Sesión no válida o expirada.                                                  | Falta el header Bearer o la firma JWKS no es válida.                                          |
| `403` | `USER_BLOCKED`                | Tu cuenta tiene el acceso restringido en el portal.                           | El usuario tiene `is_blocked = true` en base de datos.                                        |
| `403` | `FORBIDDEN_ROLE`              | No tienes permisos administrativos para realizar esta acción.                 | Un `user` llama a `/v1/admin/*` o un `sub_admin` llama a endpoints exclusivos de `admin`.     |
| `403` | `INSUFFICIENT_ROLE_HIERARCHY` | Tu rol de Sub-Administrador solo permite gestionar usuarios con rol Operador. | Un `sub_admin` intenta editar a un `admin`/`sub_admin` o asignar un rol superior a `user`.    |
| `403` | `SUPER_ADMIN_PROTECTED`       | La cuenta de un Super-Administrador está protegida y no puede ser modificada. | Intento de editar o bloquear un correo en `SUPER_ADMIN_EMAILS` o con `is_super_admin = true`. |
| `404` | `NOT_FOUND`                   | El recurso solicitado no existe.                                              | `appId` inexistente en `PATCH /v1/admin/apps/:appId`.                                         |

---

## 3. Detalle de Endpoints

### 3.1. `GET /health`

- **Auth:** Público.
- **Respuesta `200 OK`:**

```json
{
  "status": "ok",
  "service": "cm-toolbox-access-ms"
}
```

---

### 3.2. `GET /v1/me/access`

- **Auth:** Cualquier usuario autenticado.
- **Respuesta `200 OK`:**

```json
{
  "data": {
    "email": "operador.local@coordinadora.com",
    "displayName": "Operador Soporte N1",
    "roleId": "user",
    "isSuperAdmin": false,
    "canManageApps": false,
    "canManageUsers": false,
    "apps": [
      {
        "id": "diagnostico",
        "name": "Diagnóstico de Migración",
        "description": "Auditoría integral y trazabilidad de remisiones y despachos en el flujo hacia CM. Permite evaluar checks y reintentar guías.",
        "route": "/diagnostico",
        "icon": "diagnostico",
        "tags": ["Remisiones", "Despachos", "Re-migración"],
        "status": "active",
        "displayOrder": 10,
        "canAccess": true,
        "allowedActions": ["view"]
      },
      {
        "id": "logs",
        "name": "Visor de Logs GKE",
        "description": "Auditoría en tiempo real de clusters, namespaces y cargas de trabajo en Kubernetes (Prod y Test).",
        "route": "/logs",
        "icon": "pubsub",
        "tags": ["Kubernetes", "Troubleshooting", "GCP"],
        "status": "active",
        "displayOrder": 20,
        "canAccess": true,
        "allowedActions": ["view"]
      },
      {
        "id": "auditoria",
        "name": "Auditoría de Facturación",
        "description": "Validación de coherencia en remesas facturadas frente a registros maestros de despachos.",
        "route": "/auditoria",
        "icon": "auditoria",
        "tags": ["Facturas", "Consistencia", "Auditoría"],
        "status": "disabled",
        "displayOrder": 30,
        "canAccess": false,
        "allowedActions": []
      }
    ]
  }
}
```

---

### 3.3. `GET /v1/admin/apps`

- **Auth:** `admin` o `sub_admin`.
- ** Propósito:** Obtener la lista de aplicaciones, su estado actual, las acciones configurables de cada una y qué permisos vienen por defecto en cada rol.
- **Respuesta `200 OK`:**

```json
{
  "data": [
    {
      "id": "diagnostico",
      "name": "Diagnóstico de Migración",
      "description": "Auditoría integral y trazabilidad de remisiones y despachos en el flujo hacia CM. Permite evaluar checks y reintentar guías.",
      "route": "/diagnostico",
      "icon": "diagnostico",
      "tags": ["Remisiones", "Despachos", "Re-migración"],
      "status": "active",
      "displayOrder": 10,
      "updatedBy": "system",
      "updatedAt": "2026-10-18T00:00:00.000Z",
      "actions": [
        {
          "actionCode": "view",
          "name": "Consultar diagnóstico",
          "description": "Permite entrar a /diagnostico y consultar guías/despachos.",
          "defaultRoles": ["admin", "sub_admin", "user"]
        },
        {
          "actionCode": "remigrate",
          "name": "Reintentar migración",
          "description": "Permite disparar re-migración de guías hacia Pub/Sub.",
          "defaultRoles": ["admin", "sub_admin"]
        }
      ]
    }
  ]
}
```

---

### 3.4. `PATCH /v1/admin/apps/:appId`

- **Auth:** Exclusivo `admin` (`canManageApps === true`).
- **Request Body:**

```json
{
  "status": "maintenance"
}
```

- **Respuesta `200 OK`:**

```json
{
  "data": {
    "id": "logs",
    "name": "Visor de Logs GKE",
    "route": "/logs",
    "status": "maintenance",
    "updatedBy": "dev.local@coordinadora.com",
    "updatedAt": "2026-10-18T00:15:00.000Z"
  }
}
```

---

### 3.5. `GET /v1/admin/users`

- **Auth:** `admin` o `sub_admin` (`canManageUsers === true`).
- **Query Params opcionales:** `?search=operador&roleId=user`
- **Respuesta `200 OK`:**

```json
{
  "data": [
    {
      "id": "b3d2ef20-1234-4a8e-9b22-112233445566",
      "email": "operador.local@coordinadora.com",
      "displayName": "Operador Soporte N1",
      "roleId": "user",
      "isSuperAdmin": false,
      "isBlocked": false,
      "notes": "Usuario estándar con permiso puntual para ver logs",
      "updatedBy": "system",
      "updatedAt": "2026-10-18T00:00:00.000Z",
      "permissions": [
        {
          "appId": "logs",
          "actionCode": "view",
          "isAllowed": true
        }
      ]
    }
  ]
}
```

---

### 3.6. `PUT /v1/admin/users/:email`

- **Auth:** `admin` o `sub_admin`.
- **URL Param:** `:email` (correo corporativo en minúsculas, ej. `operador.local@coordinadora.com`).
- **Request Body:**

```json
{
  "displayName": "Operador Soporte N1",
  "roleId": "user",
  "isBlocked": false,
  "notes": "Habilitado acceso a logs de prueba",
  "permissions": [
    {
      "appId": "logs",
      "actionCode": "view",
      "isAllowed": true
    }
  ]
}
```

- **Respuesta `200 OK`:** Devuelve el objeto `AdminUserItem` actualizado dentro de `{ "data": { ... } }`.

---

### 3.7. `GET /v1/admin/audit`

- **Auth:** Exclusivo `admin` (`canManageApps === true`).
- **Query Params opcionales:** `?limit=50&offset=0`
- **Respuesta `200 OK`:**

```json
{
  "data": {
    "total": 1,
    "items": [
      {
        "id": "9f8e7d6c-5b4a-3c2d-1e0f-123456789abc",
        "actorEmail": "dev.local@coordinadora.com",
        "eventType": "APP_STATUS_CHANGED",
        "targetType": "app",
        "targetId": "logs",
        "beforeState": { "status": "active" },
        "afterState": { "status": "maintenance" },
        "createdAt": "2026-10-18T00:15:00.000Z"
      }
    ]
  }
}
```

---

## 4. Esquemas Zod compartidos (Front y Back)

```ts
import { z } from "zod";

export const RoleIdSchema = z.enum(["admin", "sub_admin", "user"]);
export type RoleId = z.infer<typeof RoleIdSchema>;

export const AppStatusSchema = z.enum(["active", "maintenance", "disabled"]);
export type AppStatus = z.infer<typeof AppStatusSchema>;

export const EffectiveAppAccessSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  route: z.string(),
  icon: z.string(),
  tags: z.array(z.string()),
  status: AppStatusSchema,
  displayOrder: z.number(),
  canAccess: z.boolean(),
  allowedActions: z.array(z.string()),
});

export const EffectiveUserAccessSchema = z.object({
  email: z.string().email(),
  displayName: z.string().nullable().optional(),
  roleId: RoleIdSchema,
  isSuperAdmin: z.boolean(),
  canManageApps: z.boolean(),
  canManageUsers: z.boolean(),
  apps: z.array(EffectiveAppAccessSchema),
});

export const UpdateAppStatusBodySchema = z.object({
  status: AppStatusSchema,
});

export const UserPermissionOverrideInputSchema = z.object({
  appId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  actionCode: z.string().regex(/^[a-z0-9_]+$/),
  isAllowed: z.boolean(),
});

export const UpsertUserAccessBodySchema = z.object({
  displayName: z.string().trim().max(150).nullable().optional(),
  roleId: RoleIdSchema,
  isBlocked: z.boolean(),
  notes: z.string().trim().max(500).nullable().optional(),
  permissions: z.array(UserPermissionOverrideInputSchema),
});
```
