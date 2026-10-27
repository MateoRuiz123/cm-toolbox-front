# Local como test/prod (Keycloak test + MS locales)

Configuración aplicada en los `.env` (excepto api-internos / diagnóstico, que se dejó como estaba).

## Qué apunta a qué

| Pieza | Origen |
| --- | --- |
| Login Google | `getLoginKeycloak(VITE_KEYCLOAK_ENV)` → cmautenticacion-test (sin URL en `.env`) |
| Access / Docs / Logs | localhost :8083/:8082/:8081; issuer/JWKS derivados de `ENV=test` (sin URL en `.env`) |
| Permisos de docs | docs-ms consulta `GET /me/access` de access-ms (misma fuente que el front) |
| Postgres + Redis | Compose de `cm-toolbox-access-ms` (`:5433`, `:6380`) |
| Docs data | DB `cm_toolbox_docs` |
| Diagnóstico / api-internos | **Sin cambiar** (sigue tu URL de testing) |

## Arranque (un solo comando)

Desde el front (hermanos `cm-toolbox-access-ms`, `cm-docs-ms`, `cm-logs-ms` en la misma carpeta `local/`):

```bash
cd ~/Escritorio/local/cm-toolbox-front
pnpm install   # solo la primera vez
pnpm dev
```

Eso hace, en orden:

1. `docker compose -f docker-compose.dev.yml up` → Postgres `:5433` + Redis `:6380`
2. Crea/aplica DB `cm_toolbox_docs` (schema + seed)
3. Arranca access (`8083`), docs (`8082`), logs (`8081`)
4. Arranca Vite en `http://localhost:3000`

Solo el front (sin MS): `pnpm dev:front`.

## Primer login

1. Abre `http://localhost:3000` → Google corporativo (ya no hay bypass).
2. Si ves sin acceso / hub vacío: tu email no está en `cm_toolbox_access.users`.

```bash
docker exec -i cm-toolbox-postgres psql -U toolbox -d cm_toolbox_access <<'SQL'
INSERT INTO users (email, display_name, role_id, is_super_admin, is_blocked, notes, updated_by)
VALUES (
  'TU.CORREO@coordinadora.com',
  'Tu nombre',
  'admin',
  TRUE,
  FALSE,
  'Alta local contra Keycloak test',
  'system'
) ON CONFLICT (email) DO UPDATE
  SET role_id = 'admin', is_super_admin = TRUE, is_blocked = FALSE;
SQL
```

3. Recarga el front. Deberías ver Docs (y manage si eres admin).

## Puerta `/cliente`

Hasta que exista `toolbox-docs-clientes` en Keycloak, el login de clientes en modo Keycloak fallará. Mientras tanto los clientes de demo viven en Postgres (`CLIENTS_DRIVER=postgres`); la activación por correo real requiere el driver Keycloak + secretos de admin.

## Volver a bypass local

Front: `VITE_AUTH_FORCE_KEYCLOAK=false`
Access / docs / logs: `AUTH_MODE=disabled`

## Acceso total

En Administración → editar usuario, un super-admin ve el check **Acceso total (super-administrador)**. Equivale a `SUPER_ADMIN_EMAILS` pero se guarda en BD (`users.is_super_admin`). Con Keycloak entras con tu correo real; `dev.local` solo existe en modo sin login.
