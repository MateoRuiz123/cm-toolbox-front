# Decisiones de Arquitectura (ADRs) — RBAC y Gestión de Aplicaciones

Registro de decisiones técnicas cerradas para que la implementación de `cm-toolbox-access-ms` y `cm-toolbox-front` sea directa y sin ambigüedades.

---

## ADR-001 — Separación estricta entre AuthN (Keycloak) y AuthZ (`cm-toolbox-access-ms`)

| Campo             | Detalle                                                                                                                                                                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Estado**        | Aceptada                                                                                                                                                                                                                                                                                              |
| **Contexto**      | El proyecto nació usando `@itcoordinadora/cm-sigoo-temp-ui` (`hook.zip`), que originalmente consultaba `obtenerPermisos(email, 'sigo')`. Sin embargo, pedir cambios de roles, alta de herramientas o permisos granulares al equipo externo de autenticación genera dependencia y bloqueos operativos. |
| **Decisión**      | Usar `@itcoordinadora/cm-sigoo-temp-ui` / Keycloak **únicamente** para autenticar la identidad del correo `@coordinadora.com` (AuthN), y delegar toda la autorización (roles, permisos por app/acción y estado de herramientas) al nuevo microservicio propio `cm-toolbox-access-ms`.                 |
| **Consecuencias** | Autonomía total del equipo del Toolbox para crear roles, habilitar usuarios y apagar/encender herramientas en tiempo real.                                                                                                                                                                            |

---

## ADR-002 — Repositorio independiente en el mismo Workspace local

| Campo             | Detalle                                                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Estado**        | Aceptada                                                                                                                                                                                                           |
| **Contexto**      | Se necesita desarrollar y probar la base de datos, el backend y el frontend de forma integrada en entorno local sin mezclar los historiales de Git ni acoplar el servidor Node/Postgres dentro del bundle de Vite. |
| **Decisión**      | Ubicar el backend en `/home/mateor/Escritorio/local/cm-toolbox-access-ms` como repositorio Git independiente y vincularlo en `/home/mateor/Escritorio/local/cm-toolbox-front.code-workspace`.                      |
| **Consecuencias** | Visualización unificada en Cursor con separación limpia de dependencias y ciclos de vida.                                                                                                                          |

---

## ADR-003 — PostgreSQL como fuente de verdad + Scripts versionados en `sql/`

| Campo             | Detalle                                                                                                                                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Estado**        | Aceptada                                                                                                                                                                                                                                        |
| **Contexto**      | El modelo de acceso requiere integridad referencial entre roles, aplicaciones, acciones por aplicación, permisos por defecto del rol, excepciones por usuario y auditoría transaccional.                                                        |
| **Decisión**      | Usar **PostgreSQL 16** sin ORMs pesados (consultas SQL parametrizadas con `pg` en `PgAccessRepository`) y mantener el diseño de tablas, semillas y vistas en la carpeta `sql/` (`001_schema.sql`, `002_seed.sql`, `003_views_and_queries.sql`). |
| **Consecuencias** | Control total del esquema SQL, fácil inspección local con `psql` y transacciones ACID garantizadas al guardar cambios + auditoría.                                                                                                              |

---

## ADR-004 — Caché Redis con estrategia Cache-Aside e invalidación activa

| Campo             | Detalle                                                                                                                                                                                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Estado**        | Aceptada                                                                                                                                                                                                                                                                                                                           |
| **Contexto**      | `GET /v1/me/access` se invoca en cada carga del portal. Consultar múltiples tablas en PostgreSQL en cada recarga añade latencia innecesaria, pero cachear sin invalidación haría que un cambio de permisos tarde minutos en reflejarse.                                                                                            |
| **Decisión**      | Cachear en **Redis 7** el catálogo (`rbac:catalog:apps`) y los accesos por usuario (`rbac:user:<email>`) con TTL de 300 segundos, ejecutando `DEL` inmediato sobre la clave correspondiente en cada `PATCH /v1/admin/apps/:appId` o `PUT /v1/admin/users/:email`. Si Redis falla, el sistema degrada silenciosamente a PostgreSQL. |
| **Consecuencias** | Lecturas en `< 2 ms`, cambios administrativos reflejados al instante y alta disponibilidad si Redis se reinicia.                                                                                                                                                                                                                   |

---

## ADR-005 — Modelo híbrido: Permisos por defecto de Rol + Overrides por Usuario (`allow` / `deny`)

| Campo             | Detalle                                                                                                                                                                                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Estado**        | Aceptada                                                                                                                                                                                                                                                                                                            |
| **Contexto**      | Si solo existen roles rígidos, darle permiso de ver logs a un operador específico obligaría a subirlo a `sub_admin`. Si solo existen permisos individuales por usuario, habría que configurar manualmente a cada empleado nuevo de la empresa.                                                                      |
| **Decisión**      | Definir permisos base por rol en `role_default_permissions` (todo usuario nuevo `@coordinadora.com` hereda el rol `user` con consulta de Diagnóstico) y permitir excepciones por usuario en `user_app_permissions` con `is_allowed = TRUE` (concede permiso extra) o `is_allowed = FALSE` (revoca permiso del rol). |
| **Consecuencias** | Cero fricción para usuarios nuevos y máxima flexibilidad para casos especiales desde el panel `/admin`.                                                                                                                                                                                                             |

---

## ADR-006 — Tres estados operativos por aplicación (`active`, `maintenance`, `disabled`)

| Campo             | Detalle                                                                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Estado**        | Aceptada                                                                                                                                                                                  |
| **Contexto**      | Un simple booleano `activo/inactivo` no permite a los administradores probar una herramienta en producción o durante una contingencia sin abrírsela al mismo tiempo a todos los usuarios. |
| **Decisión**      | Soportar 3 estados en `apps.status`: `active` (abierta según permisos), `maintenance` (bloqueada para `user` y `sub_admin`, pero abierta para `admin`) y `disabled` (apagada para todos). |
| **Consecuencias** | Despliegues seguros y pruebas en caliente controladas por los administradores.                                                                                                            |

---

## ADR-007 — Proxy Same-Origin (`/access-api`) en Vite y Nginx

| Campo             | Detalle                                                                                                                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Estado**        | Aceptada                                                                                                                                                                                                  |
| **Contexto**      | El navegador aplica una política CSP estricta (`connect-src 'self' ${KEYCLOAK_UPSTREAM}`). Exponer la URL del backend de accesos al navegador obligaría a abrir CORS y modificar el CSP en cada ambiente. |
| **Decisión**      | El frontend consume siempre `/access-api/v1/*` en su mismo origen; Vite (en dev) y Nginx (en contenedor) reenvían las peticiones a `ACCESS_API_UPSTREAM` (por defecto `http://localhost:8083`).           |
| **Consecuencias** | Cero cambios de CSP en el navegador y alineación total con `/migracion` y `/logs-api`.                                                                                                                    |
