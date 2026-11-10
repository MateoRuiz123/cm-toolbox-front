import { createContext } from "react";
import {
  buildFallbackAccessProfile,
  type EffectiveAppAccess,
  type EffectiveUserAccess,
  type RoleId,
} from "./access-types";

export interface AccessContextValue {
  readonly profile: EffectiveUserAccess;
  readonly roleId: RoleId;
  readonly isSuperAdmin: boolean;
  readonly canManageApps: boolean;
  readonly canManageUsers: boolean;
  readonly apps: readonly EffectiveAppAccess[];
  readonly loadingAccess: boolean;
  readonly isUserBlocked: boolean;
  readonly blockedMessage: string | null;
  readonly devImpersonatedEmail: string | null;
  readonly canAccessApp: (appId: string) => boolean;
  readonly canPerformAction: (appId: string, actionCode: string) => boolean;
  readonly refreshAccess: () => Promise<void>;
  readonly switchDevUser: (email: string | null) => Promise<void>;
}

export const createContextValueFromProfile = (
  profile: EffectiveUserAccess,
  overrides: Partial<AccessContextValue> = {},
): AccessContextValue => ({
  profile,
  roleId: profile.roleId,
  isSuperAdmin: profile.isSuperAdmin,
  canManageApps: profile.canManageApps,
  canManageUsers: profile.canManageUsers,
  apps: profile.apps,
  loadingAccess: false,
  isUserBlocked: false,
  blockedMessage: null,
  devImpersonatedEmail: null,
  canAccessApp: (appId: string) => {
    const app = profile.apps.find((a) => a.id === appId);
    return app ? app.canAccess : false;
  },
  canPerformAction: (appId: string, actionCode: string) => {
    const app = profile.apps.find((a) => a.id === appId);
    if (!app || !app.canAccess) return false;
    return app.allowedActions.includes(actionCode);
  },
  refreshAccess: async () => undefined,
  switchDevUser: async () => undefined,
  ...overrides,
});

export const DEFAULT_CONTEXT_VALUE = createContextValueFromProfile(
  buildFallbackAccessProfile(),
);

export const AccessContext = createContext<AccessContextValue>(
  DEFAULT_CONTEXT_VALUE,
);
