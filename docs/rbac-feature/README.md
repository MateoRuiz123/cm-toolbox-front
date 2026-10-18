# Feature: Control de Acceso Basado en Roles, Permisos y Estado de Aplicaciones (RBAC)

Paquete de diseño técnico **detallado** (arquitectura hexagonal, modelo relacional PostgreSQL en `sql/`, caché Redis, flujos paso a paso, criterios verificables, contratos HTTP, tipos TypeScript/Zod, mensajes de interfaz y seguridad) para construir el sistema de autorización propio del Toolbox sin depender del servicio externo de autorizaciones.

No requiere infraestructura corporativa ni Azure para su desarrollo y validación: todo está diseñado para levantarse y probarse primero en un entorno 100 % local.

| Campo                 | Valor                                                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI                    | `cm-toolbox-front` (`src/shared/auth/`, `src/features/hub/`, `src/features/admin/`)                                                                                    |
| API                   | `cm-toolbox-access-ms` (`/home/mateor/Escritorio/local/cm-toolbox-access-ms`, puerto `8083`)                                                                           |
| Scripts SQL           | [`sql/001_schema.sql`](../../sql/001_schema.sql), [`sql/002_seed.sql`](../../sql/002_seed.sql), [`sql/003_views_and_queries.sql`](../../sql/003_views_and_queries.sql) |
| Persistencia          | **PostgreSQL 16** (fuente de verdad + auditoría ACID) + **Redis 7** (caché Cache-Aside + invalidación activa)                                                          |
| Autenticación (AuthN) | Keycloak corporativo (`@itcoordinadora/cm-sigoo-temp-ui` en front + validación JWKS en back; bypass local en dev)                                                      |
| Autorización (AuthZ)  | Propia en `cm-toolbox-access-ms` (`admin`, `sub_admin`, `user` + permisos granulares + kill-switch de apps)                                                            |

---

## Orden de lectura (para implementación)

| #   | Documento                              | Qué contiene                                                                                                                                                             |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | [front.md](./front.md)                 | Flujos UI (`F-A`…`F-G`), criterios `CA-F01`…`CA-F10`, reglas `RF-*`, árbol de archivos a crear/modificar, estados de UI, textos/copy y orden de build                    |
| 2   | [back.md](./back.md)                   | Flujos del MS (`B-A`…`B-F`), criterios `CA-B01`…`CA-B12`, reglas `RB-*`, arquitectura Hexagonal + Inversify, puertos, SQL + Redis, variables de entorno y orden de build |
| 3   | [contrato-http.md](./contrato-http.md) | Especificación completa de los 7 endpoints (`/health`, `/v1/me/access`, `/v1/admin/*`), requests/responses JSON, matriz de errores HTTP y esquemas Zod/TS                |
| 4   | [seguridad.md](./seguridad.md)         | Separación AuthN/AuthZ, matriz de jerarquía (`admin` > `sub_admin` > `user`), anti-escalación, anti-lockout, protección `SUPER_ADMIN_EMAILS`, CSP y auditoría            |
| 5   | [decisiones.md](./decisiones.md)       | ADRs (`ADR-001`…`ADR-008`): Express+Inversify, PostgreSQL+Redis, modelo RBAC con overrides `allow`/`deny`, degradación si cae Redis o el MS                              |
| 6   | [runbook-local.md](./runbook-local.md) | Guía paso a paso para levantar Postgres + Redis + `cm-toolbox-access-ms` + `cm-toolbox-front`, simular distintos roles en local y correr pruebas de humo                 |

---

## Prompt sugerido al agente de implementación

```text
Implementa la feature de Control de Acceso (RBAC) y Gestión de Aplicaciones según docs/rbac-feature/ y sql/.
Lee primero docs/rbac-feature/README.md y sigue el orden de lectura.
Implementa primero el backend en /home/mateor/Escritorio/local/cm-toolbox-access-ms respetando back.md, contrato-http.md y los scripts de sql/.
Luego implementa la integración en cm-toolbox-front respetando front.md, el sistema de diseño SIGO Droop, AuthGate, lazy routes y el proxy /access-api.
```

---

## Alcance funcional

1. **Sistema de roles jerárquicos (`admin`, `sub_admin`, `user`):**
   - `admin` (nivel `100`): control total sobre aplicaciones, usuarios, roles y auditoría.
   - `sub_admin` (nivel `50`): administra permisos de usuarios operativos (`user`) sobre aplicaciones activas, sin poder alterar a otros `sub_admin`/`admin` ni apagar aplicaciones.
   - `user` (nivel `10`): consume las herramientas activas según los permisos por defecto de su rol más las excepciones puntuales asignadas a su correo.
2. **Permisos por aplicación y por acción (`view`, `remigrate`, `view_prod`):**
   - Controla tanto quién puede entrar a una ruta (`/diagnostico`, `/logs`) como quién puede disparar botones críticos dentro de la herramienta.
3. **Kill-switch / Estado operativo de aplicaciones (`active`, `maintenance`, `disabled`):**
   - Gobernado en caliente desde el panel `/admin` sin redesplegar el frontend.
   - En modo `maintenance`, la herramienta permanece abierta para `admin` (pruebas en vivo) y bloqueada con aviso para el resto.
4. **Bitácora de auditoría (`audit_logs`):**
   - Registro automático e inmutable de quién cambió el estado de una app o los permisos de un usuario, guardando el estado anterior y nuevo en formato `JSONB`.

## Fuera de alcance

- Modificar el flujo de login de Keycloak o depender del servicio externo SIGO Autorizaciones.
- Creación de aplicaciones nuevas desde la UI (el alta de una ruta de código requiere desarrollo; desde la UI se gobierna su estado `active`/`maintenance`/`disabled` y sus permisos).

---

## Estado del paquete

| Entregable                                            | Estado |
| ----------------------------------------------------- | ------ |
| Scripts de Base de Datos (`sql/001`, `002`, `003`)    | Listo  |
| Documentación técnica (`docs/rbac-feature/*`)         | Listo  |
| Esqueleto repo `cm-toolbox-access-ms` + Workspace     | Listo  |
| Implementación completa Back (`cm-toolbox-access-ms`) | Listo  |
| Implementación completa Front (`cm-toolbox-front`)    | Listo  |
