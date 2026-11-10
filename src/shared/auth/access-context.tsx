import {
  useCallback,
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
  type EffectiveUserAccess,
} from "./access-types";
import {
  AccessContext,
  createContextValueFromProfile,
  type AccessContextValue,
} from "./access-context-base";
import { useAuth } from "./use-auth";

export { useAccess } from "./use-access";
export type { AccessContextValue } from "./access-context-base";
export { AccessContext } from "./access-context-base";

export const AccessProvider = ({
  children,
}: {
  readonly children: ReactNode;
}) => {
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

  const loadAccess = useCallback(
    async (isCancelled?: () => boolean) => {
      if (estadoAuth !== "autenticado") return;

      setLoadingAccess(true);
      try {
        const remoteProfile = await fetchMyAccess();
        if (isCancelled?.()) return;
        setProfile(remoteProfile);
        setIsUserBlocked(false);
        setBlockedMessage(null);
      } catch (error) {
        if (isCancelled?.()) return;
        if (error instanceof AccessApiError && error.code === "USER_BLOCKED") {
          setIsUserBlocked(true);
          setBlockedMessage(error.message);
          return;
        }
        setProfile(
          buildFallbackAccessProfile(email || "dev.local@coordinadora.com"),
        );
        setIsUserBlocked(false);
        setBlockedMessage(null);
      } finally {
        if (!isCancelled?.()) {
          setLoadingAccess(false);
        }
      }
    },
    [estadoAuth, email],
  );

  useEffect(() => {
    let cancelado = false;
    if (estadoAuth !== "autenticado") {
      setLoadingAccess(false);
      return;
    }
    void loadAccess(() => cancelado);
    return () => {
      cancelado = true;
    };
  }, [estadoAuth, loadAccess]);

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
