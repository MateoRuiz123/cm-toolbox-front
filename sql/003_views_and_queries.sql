-- =============================================================================
-- 003_views_and_queries.sql
-- Vistas y consultas útiles para resolver los permisos efectivos de un usuario
-- =============================================================================
BEGIN;
-- Vista que resuelve la matriz de permisos efectivos combinando:
-- 1. El rol del usuario (role_default_permissions)
-- 2. Las excepciones puntuales del usuario (user_app_permissions: allow / deny)
-- 3. El estado global de la aplicación (active, maintenance, disabled)
CREATE OR REPLACE VIEW v_effective_user_app_permissions AS WITH all_possible AS (
    SELECT u.id AS user_id,
      u.email,
      u.role_id,
      u.is_super_admin,
      u.is_blocked,
      a.id AS app_id,
      a.name AS app_name,
      a.route AS app_route,
      a.status AS app_status,
      aa.action_code
    FROM users u
      CROSS JOIN apps a
      JOIN app_actions aa ON aa.app_id = a.id
  ),
  evaluated AS (
    SELECT ap.*,
      (rdp.role_id IS NOT NULL) AS granted_by_role,
      uap.is_allowed AS user_override
    FROM all_possible ap
      LEFT JOIN role_default_permissions rdp ON rdp.role_id = ap.role_id
      AND rdp.app_id = ap.app_id
      AND rdp.action_code = ap.action_code
      LEFT JOIN user_app_permissions uap ON uap.user_id = ap.user_id
      AND uap.app_id = ap.app_id
      AND uap.action_code = ap.action_code
  )
SELECT user_id,
  email,
  role_id,
  is_super_admin,
  is_blocked,
  app_id,
  app_name,
  app_route,
  app_status,
  action_code,
  CASE
    WHEN is_blocked THEN FALSE
    WHEN app_status = 'disabled' THEN FALSE
    WHEN app_status = 'maintenance'
    AND role_id <> 'admin'
    AND NOT is_super_admin THEN FALSE
    WHEN is_super_admin
    OR role_id = 'admin' THEN TRUE
    WHEN user_override IS NOT NULL THEN user_override
    ELSE granted_by_role
  END AS is_effective_allowed
FROM evaluated;
COMMIT;
