import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AccessApiError,
  fetchMyAccess,
  getDevImpersonatedEmail,
  setDevImpersonatedEmail,
} from "./access-api";
import {
  buildFallbackAccessProfile,
  type EffectiveAppAccess,
  type EffectiveUserAccess,
  type RoleId,
} from "./access-types";
import { useAuth } from "./use-auth";

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

const createContextValueFromProfile = (
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

const DEFAULT_CONTEXT_VALUE = createContextValueFromProfile(
  buildFallbackAccessProfile(),
);

export const AccessContext = createContext<AccessContextValue>(
  DEFAULT_CONTEXT_VALUE,
);

export const AccessProvider = ({ children }: { readonly children: ReactNode }) => {
  const { estadoAuth, email } = useAuth();
  const [profile, setProfile] = useState<EffectiveUserAccess>(() =>
    buildFallbackAccessProfile(email || "dev.local@coordinadora.com"),
  );
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [devImpersonatedEmail, setDevImpersonatedEmailState] = useState<
    string | null
  >(() => getDevImpersonatedEmail());

  const loadAccess = useCallback(async () => {
    if (estadoAuth !== "autenticado") return;

    setLoadingAccess(true);
    try {
      const remoteProfile = await fetchMyAccess();
      setProfile(remoteProfile);
      setIsUserBlocked(false);
      setBlockedMessage(null);
    } catch (error) {
      if (error instanceof AccessApiError && error.code === "USER_BLOCKED") {
        setIsUserBlocked(true);
        setBlockedMessage(error.message);
        return;
      }
      // RF-05: Si el MS de accesos no está disponible en local/tests, se usa el perfil fallback
      setProfile(
        buildFallbackAccessProfile(email || "dev.local@coordinadora.com"),
      );
      setIsUserBlocked(false);
      setBlockedMessage(null);
    } finally {
      setLoadingAccess(false);
    }
  }, [estadoAuth, email]);

  useEffect(() => {
    void loadAccess();
  }, [loadAccess]);

  const switchDevUser = useCallback(
    async (nextEmail: string | null) => {
      setDevImpersonatedEmail(nextEmail);
      setDevImpersonatedEmailState(getDevImpersonatedEmail());
      await loadAccess();
    },
    [loadAccess],
  );

  const value = useMemo<AccessContextValue>(
    () =>
      createContextValueFromProfile(profile, {
        loadingAccess,
        isUserBlocked,
        blockedMessage,
        devImpersonatedEmail,
        refreshAccess: loadAccess,
        switchDevUser,
      }),
    [
      profile,
      loadingAccess,
      isUserBlocked,
      blockedMessage,
      devImpersonatedEmail,
      loadAccess,
      switchDevUser,
    ],
  );

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
};

export const useAccess = (): AccessContextValue => useContext(AccessContext);
