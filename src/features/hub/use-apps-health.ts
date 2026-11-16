import { useCallback, useEffect, useState } from "react";
import type { EffectiveAppAccess } from "../../shared/auth/access-types";
import {
  isMonitoredApp,
  probeAppHealth,
  type AppHealthResult,
} from "./api/apps-health";

const POLL_INTERVAL_MS = 30_000;

const buildInitialHealthMap = (
  apps: readonly EffectiveAppAccess[],
): Record<string, AppHealthResult> => {
  const now = Date.now();
  const initial: Record<string, AppHealthResult> = {};
  for (const app of apps) {
    initial[app.id] = {
      appId: app.id,
      state: isMonitoredApp(app.id) ? "online" : "unmonitored",
      latencyMs: null,
      checkedAt: now,
    };
  }
  return initial;
};

/**
 * Sondea periódicamente la salud (/health) de las herramientas visibles sin bloquear el render inicial.
 */
export const useAppsHealth = (
  apps: readonly EffectiveAppAccess[],
  enabled = true,
) => {
  const [healthByAppId, setHealthByAppId] = useState<
    Record<string, AppHealthResult>
  >(() => buildInitialHealthMap(apps));
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const monitoredIds = apps
    .filter(
      (app) =>
        app.status !== "hidden" &&
        app.status !== "disabled" &&
        isMonitoredApp(app.id),
    )
    .map((app) => app.id)
    .join("|");

  const runHealthCheck = useCallback(
    async (force = false, signal?: AbortSignal) => {
      if (!enabled) return;
      const ids = monitoredIds ? monitoredIds.split("|") : [];
      if (ids.length === 0) return;

      if (force) {
        setIsCheckingHealth(true);
      }
      try {
        const results = await Promise.all(
          ids.map((id) => probeAppHealth(id, { force, signal })),
        );
        if (signal?.aborted) return;
        setHealthByAppId((prev) => {
          const next = { ...prev };
          for (const res of results) {
            next[res.appId] = res;
          }
          return next;
        });
      } finally {
        if (!signal?.aborted) {
          setIsCheckingHealth(false);
        }
      }
    },
    [enabled, monitoredIds],
  );

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void runHealthCheck(false, controller.signal);

    const timer = globalThis.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      void runHealthCheck(true, controller.signal);
    }, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void runHealthCheck(false, controller.signal);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      controller.abort();
      globalThis.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, runHealthCheck]);

  const refreshHealth = useCallback(() => {
    void runHealthCheck(true);
  }, [runHealthCheck]);

  return {
    healthByAppId,
    isCheckingHealth,
    refreshHealth,
  };
};
