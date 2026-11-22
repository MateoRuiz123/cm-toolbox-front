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
  getLocalWelcomeLandingPreference,
  setDevImpersonatedEmail,
  setLocalWelcomeLandingPreference,
  updateMyPreferences,
} from "./access-api";
import {
  buildFallbackAccessProfile,
  buildRestrictedFallbackAccessProfile,
  type EffectiveUserAccess,
} from "./access-types";
import { esAuthBypassActivo } from "./auth-bypass";
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
    esAuthBypassActivo()
      ? buildFallbackAccessProfile(email || "dev.local@coordinadora.com")
      : buildRestrictedFallbackAccessProfile(
          email || "operador@coordinadora.com",
        ),
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
        const resolvedShowWelcome =
          remoteProfile.showWelcomeLanding ??
          getLocalWelcomeLandingPreference(remoteProfile.email) ??
          true;
        setLocalWelcomeLandingPreference(
          remoteProfile.email,
          resolvedShowWelcome,
        );
        setProfile({
          ...remoteProfile,
          showWelcomeLanding: resolvedShowWelcome,
        });
        setIsUserBlocked(false);
        setBlockedMessage(null);
      } catch (error) {
        if (isCancelled?.()) return;
        if (error instanceof AccessApiError && error.code === "USER_BLOCKED") {
          setIsUserBlocked(true);
          setBlockedMessage(error.message);
          return;
        }
        const fallbackProfile = esAuthBypassActivo()
          ? buildFallbackAccessProfile(email || "dev.local@coordinadora.com")
          : buildRestrictedFallbackAccessProfile(
              email || "operador@coordinadora.com",
            );
        const targetEmail = devImpersonatedEmail ?? fallbackProfile.email;
        const localWelcome = getLocalWelcomeLandingPreference(targetEmail);
        setProfile({
          ...fallbackProfile,
          email: targetEmail,
          showWelcomeLanding: localWelcome ?? true,
        });
        setIsUserBlocked(false);
        setBlockedMessage(null);
      } finally {
        if (!isCancelled?.()) {
          setLoadingAccess(false);
        }
      }
    },
    [estadoAuth, email, devImpersonatedEmail],
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

  const updateWelcomeLandingPreference = useCallback(
    async (show: boolean) => {
      const targetEmail = profile.email || email || "dev.local@coordinadora.com";
      setLocalWelcomeLandingPreference(targetEmail, show);
      setProfile((prev) => ({
        ...prev,
        showWelcomeLanding: show,
      }));
      try {
        const saved = await updateMyPreferences({ showWelcomeLanding: show });
        setLocalWelcomeLandingPreference(
          targetEmail,
          saved.showWelcomeLanding,
        );
        setProfile((prev) => ({
          ...prev,
          showWelcomeLanding: saved.showWelcomeLanding,
        }));
      } catch {
        // Mantiene preferencia local si el microservicio no está disponible en desarrollo
      }
    },
    [profile.email, email],
  );

  const value = useMemo<AccessContextValue>(
    () =>
      createContextValueFromProfile(profile, {
        loadingAccess,
        isUserBlocked,
        blockedMessage,
        devImpersonatedEmail,
        showWelcomeLanding: profile.showWelcomeLanding ?? true,
        refreshAccess: loadAccess,
        switchDevUser,
        updateWelcomeLandingPreference,
      }),
    [
      profile,
      loadingAccess,
      isUserBlocked,
      blockedMessage,
      devImpersonatedEmail,
      loadAccess,
      switchDevUser,
      updateWelcomeLandingPreference,
    ],
  );

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
};
