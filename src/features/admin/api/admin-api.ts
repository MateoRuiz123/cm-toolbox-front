import {
  AccessApiError,
  buildAccessHeaders,
} from "../../../shared/auth/access-api";
import type {
  AppIconType,
  AppStatus,
  RoleId,
} from "../../../shared/auth/access-types";

const ADMIN_BASE_PATH = "/access-api/v1/admin";

export interface AdminAppActionItem {
  readonly actionCode: string;
  readonly name: string;
  readonly description: string | null;
  readonly defaultRoles: readonly RoleId[];
}

export interface AdminAppItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly route: string;
  readonly icon: AppIconType;
  readonly tags: readonly string[];
  readonly status: AppStatus;
  readonly displayOrder: number;
  readonly updatedBy: string | null;
  readonly updatedAt: string;
  readonly actions: readonly AdminAppActionItem[];
}

export interface UpsertAdminAppPayload {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly route: string;
  readonly icon: AppIconType;
  readonly tags: readonly string[];
  readonly status: AppStatus;
  readonly displayOrder: number;
  readonly actions: readonly AdminAppActionItem[];
}

export interface RoleDefaultPermissionItem {
  readonly appId: string;
  readonly actionCode: string;
}

export interface AdminRoleItem {
  readonly id: RoleId;
  readonly name: string;
  readonly description: string;
  readonly hierarchyLevel: number;
  readonly canManageApps: boolean;
  readonly canManageUsers: boolean;
  readonly isSystemRole: boolean;
  readonly usersCount: number;
  readonly defaultPermissions: readonly RoleDefaultPermissionItem[];
}

export interface UpsertAdminRolePayload {
  readonly name: string;
  readonly description: string;
  readonly hierarchyLevel: number;
  readonly canManageApps: boolean;
  readonly canManageUsers: boolean;
  readonly defaultPermissions: readonly RoleDefaultPermissionItem[];
}

export interface UserPermissionOverrideItem {
  readonly appId: string;
  readonly actionCode: string;
  readonly isAllowed: boolean;
}

export interface AdminUserItem {
  readonly id: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly roleId: RoleId;
  readonly isSuperAdmin: boolean;
  readonly isBlocked: boolean;
  readonly notes: string | null;
  readonly updatedBy: string | null;
  readonly updatedAt: string;
  readonly permissions: readonly UserPermissionOverrideItem[];
}

export interface UpsertAdminUserPayload {
  readonly displayName: string | null;
  readonly roleId: RoleId;
  readonly isBlocked: boolean;
  readonly notes: string | null;
  readonly permissions: readonly UserPermissionOverrideItem[];
}

export interface AuditLogItem {
  readonly id: string;
  readonly actorEmail: string;
  readonly eventType: string;
  readonly targetType: "app" | "user" | "role";
  readonly targetId: string;
  readonly beforeState: Record<string, unknown> | null;
  readonly afterState: Record<string, unknown>;
  readonly createdAt: string;
}

const parseJsonOrThrow = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let code = "ADMIN_API_ERROR";
    let message = `Error HTTP ${response.status} en el servicio de administración.`;
    try {
      const body = (await response.json()) as {
        code?: string;
        message?: string;
      };
      if (body.code) code = body.code;
      if (body.message) message = body.message;
    } catch {
      // Ignorar fallo de parseo
    }
    throw new AccessApiError(response.status, code, message);
  }

  const payload = (await response.json()) as { data: T };
  return payload.data;
};

export const fetchAdminApps = async (): Promise<readonly AdminAppItem[]> => {
  const response = await fetch(`${ADMIN_BASE_PATH}/apps`, {
    method: "GET",
    headers: buildAccessHeaders(false),
  });
  return parseJsonOrThrow<readonly AdminAppItem[]>(response);
};

export const upsertAdminApp = async (
  payload: UpsertAdminAppPayload,
): Promise<AdminAppItem> => {
  const response = await fetch(`${ADMIN_BASE_PATH}/apps`, {
    method: "POST",
    headers: buildAccessHeaders(true),
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow<AdminAppItem>(response);
};

export const updateAdminAppStatus = async (
  appId: string,
  status: AppStatus,
): Promise<AdminAppItem> => {
  const response = await fetch(
    `${ADMIN_BASE_PATH}/apps/${encodeURIComponent(appId)}`,
    {
      method: "PATCH",
      headers: buildAccessHeaders(true),
      body: JSON.stringify({ status }),
    },
  );
  return parseJsonOrThrow<AdminAppItem>(response);
};

export const fetchAdminRoles = async (): Promise<readonly AdminRoleItem[]> => {
  const response = await fetch(`${ADMIN_BASE_PATH}/roles`, {
    method: "GET",
    headers: buildAccessHeaders(false),
  });
  return parseJsonOrThrow<readonly AdminRoleItem[]>(response);
};

export const upsertAdminRole = async (
  roleId: RoleId,
  payload: UpsertAdminRolePayload,
): Promise<AdminRoleItem> => {
  const response = await fetch(
    `${ADMIN_BASE_PATH}/roles/${encodeURIComponent(roleId.trim().toLowerCase())}`,
    {
      method: "PUT",
      headers: buildAccessHeaders(true),
      body: JSON.stringify(payload),
    },
  );
  return parseJsonOrThrow<AdminRoleItem>(response);
};

export const deleteAdminRole = async (
  roleId: RoleId,
): Promise<{ readonly id: string; readonly deleted: boolean }> => {
  const response = await fetch(
    `${ADMIN_BASE_PATH}/roles/${encodeURIComponent(roleId.trim().toLowerCase())}`,
    {
      method: "DELETE",
      headers: buildAccessHeaders(false),
    },
  );
  return parseJsonOrThrow<{ readonly id: string; readonly deleted: boolean }>(
    response,
  );
};

export const fetchAdminUsers = async (filter?: {
  readonly search?: string;
  readonly roleId?: RoleId;
}): Promise<readonly AdminUserItem[]> => {
  const query = new URLSearchParams();
  if (filter?.search?.trim()) query.set("search", filter.search.trim());
  if (filter?.roleId) query.set("roleId", filter.roleId);
  const qs = query.toString() ? `?${query.toString()}` : "";

  const response = await fetch(`${ADMIN_BASE_PATH}/users${qs}`, {
    method: "GET",
    headers: buildAccessHeaders(false),
  });
  return parseJsonOrThrow<readonly AdminUserItem[]>(response);
};

export const upsertAdminUser = async (
  email: string,
  payload: UpsertAdminUserPayload,
): Promise<AdminUserItem> => {
  const response = await fetch(
    `${ADMIN_BASE_PATH}/users/${encodeURIComponent(email.trim().toLowerCase())}`,
    {
      method: "PUT",
      headers: buildAccessHeaders(true),
      body: JSON.stringify(payload),
    },
  );
  return parseJsonOrThrow<AdminUserItem>(response);
};

export const fetchAdminAuditLogs = async (
  limit = 50,
  offset = 0,
): Promise<{ readonly total: number; readonly items: readonly AuditLogItem[] }> => {
  const response = await fetch(
    `${ADMIN_BASE_PATH}/audit?limit=${limit}&offset=${offset}`,
    {
      method: "GET",
      headers: buildAccessHeaders(false),
    },
  );
  return parseJsonOrThrow<{
    readonly total: number;
    readonly items: readonly AuditLogItem[];
  }>(response);
};
