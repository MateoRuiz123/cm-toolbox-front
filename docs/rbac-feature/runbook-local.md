# Runbook Local — Base de Datos, Backend RBAC y Frontend

Guía paso a paso para levantar, probar e inspeccionar todo el sistema de roles, permisos y estado de aplicaciones en tu máquina local, sin depender de Azure ni de servicios externos.

---

## 1. Mapa del entorno local

```text
/home/mateor/Escritorio/local/
├── cm-toolbox-front.code-workspace   # Workspace multi-root de Cursor
├── cm-toolbox-front/                 # Frontend (puerto :3000)
│   ├── sql/                          # Scripts maestros de diseño de BD
│   │   ├── 001_schema.sql            # Tablas, enums, triggers e índices
│   │   ├── 002_seed.sql              # Roles, apps, acciones y 3 usuarios de prueba
│   │   └── 003_views_and_queries.sql # Vista v_effective_user_app_permissions
│   └── docs/rbac-feature/            # Esta documentación técnica
└── cm-toolbox-access-ms/             # Backend RBAC (puerto :8083)
    ├── docker-compose.yml            # PostgreSQL 16 (:5432) + Redis 7 (:6379)
    ├── sql/                          # Copia montada automáticamente en Postgres
    └── src/                          # Código fuente Hexagonal + Inversify
```

---

## 2. Paso 1: Levantar PostgreSQL y Redis con Docker

```bash
cd /home/mateor/Escritorio/local/cm-toolbox-access-ms
docker compose up -d
```

Verificar que ambos contenedores estén `healthy`:

```bash
docker compose ps
```

---

## 3. Paso 2: Inspeccionar la Base de Datos y probar la lógica SQL

El contenedor `cm-toolbox-postgres` carga automáticamente `001_schema.sql`, `002_seed.sql` y `003_views_and_queries.sql` al crearse.

### Ver los roles y su jerarquía

```bash
docker exec -it cm-toolbox-postgres psql -U toolbox -d cm_toolbox_access -c "
SELECT id, name, hierarchy_level, can_manage_apps, can_manage_users
FROM roles
ORDER BY hierarchy_level DESC;
"
```

### Ver el catálogo de aplicaciones y su estado

```bash
docker exec -it cm-toolbox-postgres psql -U toolbox -d cm_toolbox_access -c "
SELECT id, name, route, status, display_order
FROM apps
ORDER BY display_order;
"
```

### Ver la matriz de permisos efectivos calculada por la vista SQL

```bash
docker exec -it cm-toolbox-postgres psql -U toolbox -d cm_toolbox_access -c "
SELECT email, role_id, app_id, app_status, action_code, is_effective_allowed
FROM v_effective_user_app_permissions
ORDER BY email, app_id, action_code;
"
```

### Re-aplicar los scripts de `sql/` si editas el modelo

Si modificas cualquier archivo en `/home/mateor/Escritorio/local/cm-toolbox-front/sql/`, sincronízalo y aplícalo en caliente con:

```bash
cp /home/mateor/Escritorio/local/cm-toolbox-front/sql/*.sql /home/mateor/Escritorio/local/cm-toolbox-access-ms/sql/
cat /home/mateor/Escritorio/local/cm-toolbox-front/sql/001_schema.sql \
    /home/mateor/Escritorio/local/cm-toolbox-front/sql/002_seed.sql \
    /home/mateor/Escritorio/local/cm-toolbox-front/sql/003_views_and_queries.sql \
  | docker exec -i cm-toolbox-postgres psql -U toolbox -d cm_toolbox_access
```

---

## 4. Paso 3: Levantar el microservicio `cm-toolbox-access-ms`

```bash
cd /home/mateor/Escritorio/local/cm-toolbox-access-ms
cp .env.example .env
pnpm dev
```

El servicio queda escuchando en `http://localhost:8083`.

---

## 5. Paso 4: Levantar el Frontend `cm-toolbox-front`

En otra terminal:

```bash
cd /home/mateor/Escritorio/local/cm-toolbox-front
cp .env.example .env
# Asegurar en .env: ACCESS_API_UPSTREAM=http://localhost:8083
pnpm dev
```

Abrir `http://localhost:3000`.

---

## 6. Pruebas de humo con `curl` (simulando distintos roles en local)

Con `AUTH_MODE=disabled` en local, puedes usar el header `x-dev-user-email` para probar los 3 usuarios semilla sin necesitar tokens de Keycloak:

| Caso de prueba                                                    | Comando `curl`                                                                                                                                                                       | Resultado esperado                                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **1. Healthcheck**                                                | `curl -s http://localhost:8083/health`                                                                                                                                               | `200` `{"status":"ok",...}`                                                                              |
| **2. Perfil de Admin (`dev.local`)**                              | `curl -s http://localhost:8083/v1/me/access`                                                                                                                                         | `roleId: "admin"`, `canManageApps: true`, acceso total                                                   |
| **3. Perfil de Operador (`operador.local`)**                      | `curl -s -H "x-dev-user-email: operador.local@coordinadora.com" http://localhost:8083/v1/me/access`                                                                                  | `roleId: "user"`, `canManageApps: false`, acceso a `diagnostico` (`view`) y `logs` (`view` por override) |
| **4. Sub-Admin intenta apagar una app**                           | `curl -s -X PATCH -H "Content-Type: application/json" -H "x-dev-user-email: subadmin.local@coordinadora.com" -d '{"status":"maintenance"}' http://localhost:8083/v1/admin/apps/logs` | `403` `FORBIDDEN_ROLE`                                                                                   |
| **5. Admin pone `logs` en mantenimiento**                         | `curl -s -X PATCH -H "Content-Type: application/json" -d '{"status":"maintenance"}' http://localhost:8083/v1/admin/apps/logs`                                                        | `200` con `status: "maintenance"` + evento en `audit_logs`                                               |
| **6. Verificar que `operador.local` ya no puede entrar a `logs`** | `curl -s -H "x-dev-user-email: operador.local@coordinadora.com" http://localhost:8083/v1/me/access`                                                                                  | En `logs` devuelve `canAccess: false`, mientras que para `dev.local` (`admin`) sigue `canAccess: true`   |

---

## 7. Troubleshooting común en local

| Síntoma                                                                                 | Causa probable                                            | Solución                                                                                                                                                          |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Puerto `5432` o `6379` ocupado al hacer `docker compose up`                             | Ya tienes otro Postgres o Redis corriendo en tu máquina   | Detener el servicio local (`sudo systemctl stop postgresql redis`) o cambiar el puerto expuesto en `docker-compose.yml` y `DATABASE_URL` / `REDIS_URL`.           |
| Cambio un permiso directamente en `psql` pero el endpoint sigue devolviendo el anterior | El perfil del usuario sigue en caché de Redis (TTL 5 min) | Ejecutar `docker exec -it cm-toolbox-redis redis-cli FLUSHALL` (cuando el cambio se hace por el API `PUT /v1/admin/users/:email`, la invalidación es automática). |
| Error `502 Bad Gateway` en `/access-api/*` desde el navegador                           | `cm-toolbox-access-ms` no está corriendo en `:8083`       | Iniciar `pnpm dev` en `/home/mateor/Escritorio/local/cm-toolbox-access-ms`.                                                                                       |
