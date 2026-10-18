# Control de Acceso y Estado de Aplicaciones — Front (`cm-toolbox-front`)

Documento técnico **detallado** para implementar el sistema de roles, permisos granulares, Hub dinámico y panel de administración `/admin` en el SPA.

**Companion:** [back.md](./back.md)
**Índice:** [README.md](./README.md)
**Contrato:** [contrato-http.md](./contrato-http.md) · [decisiones.md](./decisiones.md) · [seguridad.md](./seguridad.md) · [runbook-local.md](./runbook-local.md)

| Campo             | Valor                                                                               |
| ----------------- | ----------------------------------------------------------------------------------- |
| Estado            | Diseño técnico cerrado                                                              |
| Stack             | React 19, Vite, TypeScript, Tailwind CSS v4, React Router, SIGO Droop Design System |
| Proxy same-origin | `/access-api/*` → `ACCESS_API_UPSTREAM` (default `http://localhost:8083`)           |
| Ruta nueva        | `/admin` (lazy-loaded, protegida por rol `admin` o `sub_admin`)                     |

---

## 1. Objetivo en el Frontend

Pasar de un portal donde todas las tarjetas del Hub están hardcodeadas y cualquier usuario autenticado puede entrar a cualquier ruta, a un portal gobernado dinámicamente por el perfil efectivo devuelto por `cm-toolbox-access-ms`:

1. Cargar el perfil de acceso (`GET /access-api/v1/me/access`) tras autenticar la sesión en `AuthProvider`.
2. Renderizar las tarjetas del `HubPage` reflejando en tiempo real el estado global de cada app (`active`, `maintenance`, `disabled`) y si el usuario tiene acceso (`canAccess`).
3. Proteger la navegación directa por URL mediante `<AppAccessGuard appId="...">`.
4. Proteger acciones sensibles dentro de cada herramienta (`remigrate` en Diagnóstico, `view_prod` en Visor de Logs) mediante `canPerformAction(appId, actionCode)`.
5. Proveer la herramienta `/admin` para gestionar usuarios, permisos puntuales y el estado operativo de las aplicaciones.

---

## 2. Actores y vistas en UI

| Actor             | Rol (`roleId`)                 | Qué ve en `HubPage` (`/`)                                                                                                             | Qué ve en `AppHeader`                        | Qué puede hacer en `/admin`                                                             |
| ----------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| Usuario bloqueado | Cualquiera (`isBlocked: true`) | No llega al Hub (`AuthGate` muestra `SinAccesoScreen`)                                                                                | —                                            | Nada                                                                                    |
| Usuario operativo | `user`                         | Apps `active` con permiso como **Disponible**; apps sin permiso como **Sin permiso**; apps en `maintenance` como **En mantenimiento** | Email, terminal, badge de rol `Operador`     | No puede entrar (`403` / redirige a Hub)                                                |
| Sub-Administrador | `sub_admin`                    | Igual que `user` según sus permisos                                                                                                   | Badge `Sub-Admin` + botón **Administración** | Pestaña **Usuarios y Permisos** (solo gestiona usuarios con rol `user`)                 |
| Administrador     | `admin`                        | Todas las apps `active` y `maintenance` habilitadas (en `maintenance` ve badge **Mantenimiento · Acceso Admin**)                      | Badge `Admin` + botón **Administración**     | Todas las pestañas: **Usuarios y Permisos**, **Estado de Aplicaciones** y **Auditoría** |

---

## 3. Flujos de uso paso a paso (`F-*`)

### Flujo F-A — Carga inicial del perfil de acceso

1. El usuario inicia sesión en Keycloak (o entra con `useDevAuth` en `pnpm dev`).
2. `AccessProvider` (montado dentro de `AuthGate` o integrado con `AuthProvider`) ejecuta `GET /access-api/v1/me/access` enviando `Authorization: Bearer <token_sigoo>`.
3. Mientras responde, `AuthGate` mantiene el spinner de verificación corporativa.
4. Si responde `200 OK`, guarda `EffectiveUserAccess` en estado de React y permite el renderizado del portal.
5. Si responde `403` con `code === 'USER_BLOCKED'`, pasa `estadoAuth` a `sin_acceso` mostrando el motivo de cuenta suspendida.
6. **Fallback de resiliencia en desarrollo:** si en `pnpm dev` el microservicio `:8083` está apagado, o ocurre un error de red, se muestra un banner con opción de **Reintentar** (o fallback configurable en tests E2E para no romper suites existentes).

### Flujo F-B — Hub dinámico (`HubPage`)

1. El usuario autenticado entra a `/` o `/hub`.
2. `HubPage` lee `apps` desde `useAccess()`.
3. Cada `AppCard` determina su estado visual según la combinación `(app.status, app.canAccess)`:
   - `status === 'active'` y `canAccess === true`: badge verde **Disponible**, botón primario `Abrir herramienta`.
   - `status === 'maintenance'` y `canAccess === true` (solo `admin`): badge ámbar **En mantenimiento (Admin)**, botón primario `Probar herramienta`.
   - `status === 'maintenance'` y `canAccess === false`: badge ámbar **En mantenimiento**, tarjeta atenuada, botón deshabilitado `En mantenimiento`.
   - `status === 'active'` y `canAccess === false`: badge gris/rojo suave **Acceso restringido**, botón deshabilitado `Sin permiso asignado`.
   - `status === 'disabled'`: badge gris **Próximamente**, botón deshabilitado `En construcción`.
4. El botón hero superior (`Abrir Diagnóstico`) solo se habilita si `canAccessApp('diagnostico')` es `true`.

### Flujo F-C — Bloqueo de ruta directa (`AppAccessGuard`)

1. Un usuario `user` sin permiso `view` en `logs` escribe manualmente `/logs` en el navegador.
2. `<AppAccessGuard appId="logs">` evalúa `canAccessApp('logs')`.
3. Al ser `false`, no monta `LogsPage` (ni siquiera descarga llamadas del API de logs) y renderiza `AppRestrictedState` con explicación clara (distinguiendo si está en mantenimiento o si requiere solicitar permiso a un administrador) y CTA **Volver al portal**.

### Flujo F-D — Control de acciones dentro de una herramienta (`canPerformAction`)

1. En `src/features/diagnostico/resultado-diagnostico.tsx` y `guia-detalle-modal.tsx`:
   - Se consulta `const puedeRemigrar = canPerformAction('diagnostico', 'remigrate')`.
   - Si `puedeRemigrar === false`, los botones de **Reintentar seleccionadas** y **Reintentar guía** se muestran deshabilitados con `title="Tu perfil solo tiene permiso de consulta en Diagnóstico"`.
2. En `src/features/logs/logs-page.tsx`:
   - Se consulta `const puedeVerProd = canPerformAction('logs', 'view_prod')`.
   - Si `puedeVerProd === false`, la opción del cluster `prod` aparece deshabilitada indicando que requiere permiso `view_prod`.

### Flujo F-E — Administración de Usuarios y Permisos (`/admin` → Pestaña Usuarios)

1. Un `admin` o `sub_admin` navega a `/admin`.
2. La vista carga `GET /access-api/v1/admin/users` y `GET /access-api/v1/admin/apps`.
3. Puede buscar por correo o filtrar por rol (`Todos`, `Admin`, `Sub-Admin`, `Usuario`).
4. Al hacer clic en **Agregar usuario** o **Editar** sobre una fila:
   - Se abre el modal `UserPermissionsModal`.
   - Permite definir `email` (`@coordinadora.com`), `displayName`, `roleId` (`sub_admin` solo ve la opción `user`), switch `isBlocked` y notas.
   - Muestra una matriz de aplicaciones y sus acciones (`view`, `remigrate`, `view_prod`) con selector de 3 estados por acción: **Heredar del rol**, **Permitir explícitamente (`allow`)** o **Revocar (`deny`)** (o switches directos calculados sobre el rol).
5. Si la fila corresponde a un `isSuperAdmin === true` o a un usuario de rango igual/superior al de un `sub_admin`, los controles aparecen en modo solo lectura con etiqueta **Protegido por jerarquía**.
6. Al guardar (`PUT /access-api/v1/admin/users/:email`), se actualiza la lista y, si el admin editó permisos, el cambio impacta en caliente.

### Flujo F-F — Kill-Switch / Estado de Aplicaciones (`/admin` → Pestaña Aplicaciones)

1. Exclusiva para `canManageApps === true` (`admin`).
2. Muestra cada herramienta (`diagnostico`, `logs`, `auditoria`) con su ruta, acciones registradas, último editor (`updatedBy`) y selector de estado:
   - **Activa (`active`)**
   - **En mantenimiento (`maintenance`)**
   - **Desactivada (`disabled`)**
3. Al cambiar el estado y confirmar (`PATCH /access-api/v1/admin/apps/:appId`), llama a `refetchAccessProfile()` para que el propio Hub refleje el nuevo estado de inmediato.

### Flujo F-G — Consulta de Bitácora de Auditoría (`/admin` → Pestaña Auditoría)

1. Exclusiva para `canManageApps === true` (`admin`).
2. Consulta `GET /access-api/v1/admin/audit?limit=50&offset=0`.
3. Muestra tabla cronológica con fecha, actor (`actorEmail`), evento (`APP_STATUS_CHANGED`, `USER_UPDATED`), recurso afectado (`targetId`) y botón para inspeccionar el diff JSON (`beforeState` → `afterState`) reutilizando el estilo de `JsonModal`.

---

## 4. Criterios de aceptación verificables (`CA-F*`)

| ID     | Dado                                                                    | Cuando                                           | Entonces                                                                                                                                                      | Bloqueante |
| ------ | ----------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| CA-F01 | Usuario autenticado con rol `admin`                                     | Carga el portal                                  | Ve en `AppHeader` el enlace a `/admin` y todas las apps `active`/`maintenance` disponibles en el Hub                                                          | Sí         |
| CA-F02 | Usuario con rol `user` sin permiso en `logs`                            | Entra a `/` (Hub)                                | La tarjeta `Visor de Logs GKE` muestra badge `Acceso restringido` y su CTA está deshabilitado                                                                 | Sí         |
| CA-F03 | Usuario con rol `user` sin permiso en `logs`                            | Navega directo a `/logs`                         | `AppAccessGuard` impide montar `LogsPage` y muestra vista de acceso restringido con link a `/`                                                                | Sí         |
| CA-F04 | Usuario con rol `user` con `view` pero sin `remigrate` en `diagnostico` | Diagnostica una guía con veredicto `NO_MIGRABLE` | Ve el detalle completo pero los botones de re-migración están deshabilitados                                                                                  | Sí         |
| CA-F05 | Admin cambia `logs` a `maintenance` en `/admin`                         | Usuario `user` recarga el Hub                    | La tarjeta `Visor de Logs GKE` muestra `En mantenimiento` y no permite el ingreso                                                                             | Sí         |
| CA-F06 | Admin cambia `logs` a `maintenance` en `/admin`                         | El propio `admin` va al Hub y entra a `/logs`    | Ve badge `En mantenimiento (Admin)` y puede abrir y usar `/logs` normalmente                                                                                  | Sí         |
| CA-F07 | Usuario `sub_admin` entra a `/admin`                                    | Visualiza el panel                               | Ve la pestaña **Usuarios y Permisos**, los botones de editar sobre otros `admin`/`sub_admin` están deshabilitados, y no puede mutar el estado de aplicaciones | Sí         |
| CA-F08 | Usuario con `isBlocked = true`                                          | Inicia sesión                                    | `AuthGate` muestra `SinAccesoScreen` y no permite navegar a ninguna ruta                                                                                      | Sí         |
| CA-F09 | Diseño institucional y accesibilidad                                    | Se inspecciona `/admin` en modo claro y oscuro   | Usa exclusivamente tokens SIGO Droop (`var(--surface-card)`, `var(--color-primary)`, etc.) y `SmoothTitleAccent` en el `h1`                                   | Sí         |
| CA-F10 | Suite de tests existentes (`pnpm test`)                                 | Se ejecuta Vitest                                | El mock por defecto de `useAccess` mantiene compatibilidad para no romper los tests actuales de Diagnóstico, Logs y Hub                                       | Sí         |

---

## 5. Reglas de UI y negocio en el cliente (`RF-*`)

| ID    | Regla                                                                                                                                                                                                                                                                                                                   | Dónde aplica                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| RF-01 | El estado de las apps y los permisos nunca se deciden hardcodeando correos en componentes React; siempre provienen de `useAccess()`.                                                                                                                                                                                    | Todo `src/`                  |
| RF-02 | Las llamadas al microservicio siempre van al mismo origen (`/access-api/v1/...`), nunca a una URL absoluta `http://localhost:8083` desde el navegador.                                                                                                                                                                  | `access-api.ts`              |
| RF-03 | `AdminPage` debe importarse con `lazy()` en `src/app/app.tsx` para no incrementar el bundle inicial de los operadores estándar.                                                                                                                                                                                         | `src/app/app.tsx`            |
| RF-04 | Un usuario nunca puede editar su propio rol ni su propio switch `isBlocked` en `UserPermissionsModal` (el formulario deshabilita esos dos controles si `target.email === currentUser.email`).                                                                                                                           | `user-permissions-modal.tsx` |
| RF-05 | En `pnpm dev` (cuando `esAuthBypassActivo()` es `true`), si `/access-api` no responde porque el contenedor backend no está encendido, `AccessProvider` puede caer a un perfil mock local de desarrollo (`admin` completo) registrando un `console.warn`, para que el desarrollador de front pueda trabajar sin bloqueo. | `access-context.tsx`         |

---

## 6. Estructura de archivos a crear y modificar en `cm-toolbox-front`

### Archivos nuevos a crear

```text
src/
├── shared/
│   └── auth/
│       ├── access-types.ts               # Esquemas Zod y tipos TS (EffectiveUserAccess, RoleId, AppStatus)
│       ├── access-context.tsx            # AccessProvider, hook useAccess() y fallback dev
│       ├── access-api.ts                 # Cliente HTTP para /access-api/v1/me/access
│       └── app-access-guard.tsx          # Componente <AppAccessGuard appId="..."> para rutas
└── features/
    └── admin/
        ├── admin-page.tsx                # Página principal /admin con pestañas (Usuarios, Apps, Auditoría)
        ├── users-permissions-tab.tsx     # Tabla de usuarios, buscador y filtros
        ├── user-permissions-modal.tsx    # Modal para crear/editar usuario, rol y permisos por app
        ├── apps-status-tab.tsx           # Panel de kill-switch (active / maintenance / disabled)
        ├── audit-logs-tab.tsx            # Tabla de auditoría con visor de diff JSON
        └── api/
            └── admin-api.ts              # Cliente HTTP para /access-api/v1/admin/*
```

### Archivos existentes a modificar

| Archivo                                              | Cambio                                                                                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/app.tsx`                                    | Envolver rutas con `AccessProvider`, proteger `/diagnostico/*` y `/logs` con `<AppAccessGuard>`, y registrar `/admin` con `lazy()`. |
| `src/features/hub/hub-page.tsx`                      | Consumir `apps` desde `useAccess()` para renderizar estados `active`, `maintenance`, `disabled` y `Acceso restringido`.             |
| `src/shared/ui/app-header.tsx`                       | Mostrar badge del rol actual y botón de acceso a `/admin` cuando `canManageUsers \|\| canManageApps`.                               |
| `src/features/diagnostico/resultado-diagnostico.tsx` | Evaluar `canPerformAction('diagnostico', 'remigrate')` en los botones de re-migración.                                              |
| `src/features/diagnostico/guia-detalle-modal.tsx`    | Evaluar `canPerformAction('diagnostico', 'remigrate')` en el botón individual de reintento.                                         |
| `src/features/logs/logs-page.tsx`                    | Evaluar `canPerformAction('logs', 'view_prod')` en el selector de ambiente productivo.                                              |
| `src/shared/lib/use-page-title.ts`                   | Agregar título para `/admin` (`Administración y Permisos \| Coordinadora Toolbox`).                                                 |
| `vite.config.ts`                                     | Agregar proxy `'/access-api'` hacia `ACCESS_API_UPSTREAM` (default `http://localhost:8083`).                                        |
| `nginx/default.conf.template`                        | Agregar bloque `location /access-api/` con rewrite a `$access_api`.                                                                 |
| `.env.example`                                       | Documentar `ACCESS_API_UPSTREAM=http://localhost:8083`.                                                                             |

---

## 7. Matriz de estados visuales de `AppCard` en `HubPage`

| `app.status`  | `app.canAccess` | Rol usuario          | Badge superior                  | Estilo de tarjeta              | Texto del botón CTA   | Estado botón        |
| ------------- | --------------- | -------------------- | ------------------------------- | ------------------------------ | --------------------- | ------------------- |
| `active`      | `true`          | Cualquiera           | `Disponible` (verde)            | Borde normal + hover elevación | `Abrir herramienta`   | Habilitado (`Link`) |
| `active`      | `false`         | `user` / `sub_admin` | `Sin acceso` (gris/ámbar)       | Opacidad 75%                   | `Permiso requerido`   | Deshabilitado       |
| `maintenance` | `true`          | `admin`              | `Mantenimiento (Admin)` (ámbar) | Borde ámbar suave + hover      | `Abrir en modo Admin` | Habilitado (`Link`) |
| `maintenance` | `false`         | `user` / `sub_admin` | `En mantenimiento` (ámbar)      | Opacidad 75%, borde punteado   | `En mantenimiento`    | Deshabilitado       |
| `disabled`    | `false`         | Cualquiera           | `Próximamente` (gris)           | Opacidad 75%, borde punteado   | `En construcción`     | Deshabilitado       |

---

## 8. Mensajes de copy oficiales (Español)

| Clave                     | Texto exacto                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `admin_title`             | Administración de Accesos y Aplicaciones                                                                           |
| `guard_maintenance_title` | Herramienta en mantenimiento operativo                                                                             |
| `guard_maintenance_desc`  | Esta aplicación se encuentra temporalmente en mantenimiento por un administrador. Intenta más tarde.               |
| `guard_forbidden_title`   | Permiso requerido para esta herramienta                                                                            |
| `guard_forbidden_desc`    | Tu cuenta no tiene habilitado el permiso de acceso para esta aplicación. Solicítalo a un administrador del portal. |
| `remigrate_disabled_hint` | Tu perfil tiene acceso de solo lectura. No tienes permiso para re-encolar guías.                                   |
| `prod_logs_disabled_hint` | Requiere el permiso "Ver logs de Producción" (view_prod).                                                          |
| `super_admin_badge`       | Super Admin (Protegido)                                                                                            |

---

## 9. Orden de implementación recomendado (Front)

1. Configurar proxy `/access-api` en `vite.config.ts` y `.env.example`.
2. Crear `access-types.ts`, `access-api.ts` y `access-context.tsx` (con fallback a perfil dev si el MS no está levantado en tests).
3. Crear `app-access-guard.tsx` y conectarlo en `src/app/app.tsx`.
4. Actualizar `HubPage` y `AppHeader` para consumir `useAccess()`.
5. Conectar `canPerformAction` en Diagnóstico y Visor de Logs.
6. Construir `src/features/admin/` (`admin-page.tsx` y sus 3 pestañas + modal).
7. Agregar tests unitarios en `test/shared/auth/` y `test/features/admin/`.
