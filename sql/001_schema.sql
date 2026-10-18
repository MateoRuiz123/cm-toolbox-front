-- =============================================================================
-- 001_schema.sql
-- Diseño de Base de Datos Local: Roles, Permisos, Aplicaciones y Auditoría
-- Motor: PostgreSQL 16+
-- =============================================================================
BEGIN;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- 1. Estado operativo de cada aplicación en el Hub
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_type
  WHERE typname = 'app_status'
) THEN CREATE TYPE app_status AS ENUM (
  'active',
  -- Visible y accesible para quienes tengan permiso
  'maintenance',
  -- Visible con aviso; solo rol 'admin' puede entrar a probar
  'disabled' -- Apagada / En construcción; nadie puede entrar
);
END IF;
END $$;
-- 2. Trigger genérico para updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- 3. Tabla: roles
-- hierarchy_level define el rango: admin (100) > sub_admin (50) > user (10)
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  hierarchy_level SMALLINT NOT NULL CHECK (hierarchy_level > 0 AND hierarchy_level <= 100),
  can_manage_apps BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_users BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_role_id_slug CHECK (id ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$')
);
-- 4. Tabla: apps (Catálogo de herramientas del Toolbox)
CREATE TABLE IF NOT EXISTS apps (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  route VARCHAR(120) NOT NULL UNIQUE,
  icon VARCHAR(32) NOT NULL DEFAULT 'diagnostico',
  tags TEXT [] NOT NULL DEFAULT '{}',
  status app_status NOT NULL DEFAULT 'active',
  display_order SMALLINT NOT NULL DEFAULT 100,
  updated_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_app_id_slug CHECK (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
DROP TRIGGER IF EXISTS trg_apps_updated_at ON apps;
CREATE TRIGGER trg_apps_updated_at BEFORE
UPDATE ON apps FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- 5. Tabla: app_actions (Acciones granulares de cada aplicación)
CREATE TABLE IF NOT EXISTS app_actions (
  app_id VARCHAR(64) NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  action_code VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_id, action_code),
  CONSTRAINT chk_action_code_slug CHECK (action_code ~ '^[a-z0-9_]+$')
);
-- 6. Tabla: role_default_permissions (Permisos incluidos por defecto en cada rol)
CREATE TABLE IF NOT EXISTS role_default_permissions (
  role_id VARCHAR(32) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  app_id VARCHAR(64) NOT NULL,
  action_code VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, app_id, action_code),
  FOREIGN KEY (app_id, action_code) REFERENCES app_actions(app_id, action_code) ON DELETE CASCADE
);
-- 7. Tabla: users (Usuarios y su rol asignado)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(150),
  role_id VARCHAR(32) NOT NULL DEFAULT 'user' REFERENCES roles(id),
  is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  updated_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_users_email_lowercase CHECK (email = LOWER(email))
);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users (role_id);
CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users (is_blocked);
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE
UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- 8. Tabla: user_app_permissions (Excepciones / Permisos granulares por usuario)
-- is_allowed = TRUE (concede encima del rol), FALSE (revoca permiso del rol)
CREATE TABLE IF NOT EXISTS user_app_permissions (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_id VARCHAR(64) NOT NULL,
  action_code VARCHAR(64) NOT NULL,
  is_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, app_id, action_code),
  FOREIGN KEY (app_id, action_code) REFERENCES app_actions(app_id, action_code) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_app_permissions_app ON user_app_permissions (app_id);
DROP TRIGGER IF EXISTS trg_user_app_permissions_updated_at ON user_app_permissions;
CREATE TRIGGER trg_user_app_permissions_updated_at BEFORE
UPDATE ON user_app_permissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- 9. Tabla: audit_logs (Historial inmutable de cambios)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email VARCHAR(255) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  target_type VARCHAR(32) NOT NULL,
  target_id VARCHAR(255) NOT NULL,
  before_state JSONB,
  after_state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs (target_type, target_id);
COMMIT;
