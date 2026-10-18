-- =============================================================================
-- 002_seed.sql
-- Semilla de roles, aplicaciones, acciones y usuarios para pruebas locales
-- =============================================================================
BEGIN;
-- 1. Roles jerárquicos
INSERT INTO roles (
    id,
    name,
    description,
    hierarchy_level,
    can_manage_apps,
    can_manage_users
  )
VALUES (
    'admin',
    'Administrador',
    'Control total: activa/desactiva aplicaciones, entra a apps en mantenimiento y administra cualquier usuario.',
    100,
    TRUE,
    TRUE
  ),
  (
    'sub_admin',
    'Sub-Administrador',
    'Delega y asigna permisos a usuarios operativos sobre aplicaciones activas sin apagar apps ni modificar admins.',
    50,
    FALSE,
    TRUE
  ),
  (
    'user',
    'Usuario Operativo',
    'Accede a las aplicaciones activas según los permisos de su rol o asignaciones puntuales.',
    10,
    FALSE,
    FALSE
  ) ON CONFLICT (id) DO
UPDATE
SET name = EXCLUDED.name,
  description = EXCLUDED.description,
  hierarchy_level = EXCLUDED.hierarchy_level,
  can_manage_apps = EXCLUDED.can_manage_apps,
  can_manage_users = EXCLUDED.can_manage_users;
-- 2. Aplicaciones del Toolbox
INSERT INTO apps (
    id,
    name,
    description,
    route,
    icon,
    tags,
    status,
    display_order,
    updated_by
  )
VALUES (
    'diagnostico',
    'Diagnóstico de Migración',
    'Auditoría integral y trazabilidad de remisiones y despachos en el flujo hacia CM. Permite evaluar checks y reintentar guías.',
    '/diagnostico',
    'diagnostico',
    ARRAY ['Remisiones', 'Despachos', 'Re-migración'],
    'active',
    10,
    'system'
  ),
  (
    'logs',
    'Visor de Logs GKE',
    'Auditoría en tiempo real de clusters, namespaces y cargas de trabajo en Kubernetes (Prod y Test).',
    '/logs',
    'pubsub',
    ARRAY ['Kubernetes', 'Troubleshooting', 'GCP'],
    'active',
    20,
    'system'
  ),
  (
    'auditoria',
    'Auditoría de Facturación',
    'Validación de coherencia en remesas facturadas frente a registros maestros de despachos.',
    '/auditoria',
    'auditoria',
    ARRAY ['Facturas', 'Consistencia', 'Auditoría'],
    'disabled',
    30,
    'system'
  ) ON CONFLICT (id) DO NOTHING;
-- 3. Acciones por aplicación
INSERT INTO app_actions (app_id, action_code, name, description)
VALUES (
    'diagnostico',
    'view',
    'Consultar diagnóstico',
    'Permite entrar a /diagnostico y consultar guías/despachos.'
  ),
  (
    'diagnostico',
    'remigrate',
    'Reintentar migración',
    'Permite disparar re-migración de guías hacia Pub/Sub.'
  ),
  (
    'logs',
    'view',
    'Ver logs de Test',
    'Permite abrir /logs y consultar clusters de prueba.'
  ),
  (
    'logs',
    'view_prod',
    'Ver logs de Producción',
    'Permite consultar pods y logs del cluster productivo.'
  ),
  (
    'auditoria',
    'view',
    'Consultar auditoría',
    'Permite abrir el módulo de auditoría de facturación.'
  ) ON CONFLICT (app_id, action_code) DO NOTHING;
-- 4. Permisos por defecto de cada rol
INSERT INTO role_default_permissions (role_id, app_id, action_code)
SELECT 'admin',
  app_id,
  action_code
FROM app_actions ON CONFLICT DO NOTHING;
INSERT INTO role_default_permissions (role_id, app_id, action_code)
VALUES ('sub_admin', 'diagnostico', 'view'),
  ('sub_admin', 'diagnostico', 'remigrate'),
  ('sub_admin', 'logs', 'view') ON CONFLICT DO NOTHING;
INSERT INTO role_default_permissions (role_id, app_id, action_code)
VALUES ('user', 'diagnostico', 'view') ON CONFLICT DO NOTHING;
-- 5. Usuarios locales de prueba
INSERT INTO users (
    email,
    display_name,
    role_id,
    is_super_admin,
    is_blocked,
    notes,
    updated_by
  )
VALUES (
    'dev.local@coordinadora.com',
    'Desarrollador Local (Super Admin)',
    'admin',
    TRUE,
    FALSE,
    'Usuario por defecto en pnpm dev',
    'system'
  ),
  (
    'subadmin.local@coordinadora.com',
    'Sub-Admin de Prueba',
    'sub_admin',
    FALSE,
    FALSE,
    'Puede asignar permisos a usuarios estándar',
    'system'
  ),
  (
    'operador.local@coordinadora.com',
    'Operador Soporte N1',
    'user',
    FALSE,
    FALSE,
    'Usuario estándar con permiso puntual para ver logs',
    'system'
  ) ON CONFLICT (email) DO NOTHING;
-- 6. Ejemplo de permiso específico (grant) para el operador
INSERT INTO user_app_permissions (
    user_id,
    app_id,
    action_code,
    is_allowed,
    granted_by
  )
SELECT id,
  'logs',
  'view',
  TRUE,
  'subadmin.local@coordinadora.com'
FROM users
WHERE email = 'operador.local@coordinadora.com' ON CONFLICT (user_id, app_id, action_code) DO NOTHING;
COMMIT;
