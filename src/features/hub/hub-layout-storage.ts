import type { EffectiveAppAccess } from "../../shared/auth/access-types";
import { safeStorage } from "../../shared/lib/safe-storage";
import type { BentoSize } from "./api/apps-health";

export type HubSortMode = "portal" | "most_used";

const GLOBAL_BENTO_CACHE_KEY = "cm-toolbox:hub-bento-sizes";
const SORT_PREF_KEY = "cm-toolbox:hub-sort-mode";

const DEFAULT_ASIMETRIC_PATTERN: readonly BentoSize[] = [
  "featured",
  "wide",
  "wide",
  "featured",
  "standard",
];

export const BENTO_SPAN_CLASS: Readonly<Record<BentoSize, string>> = {
  featured: "md:col-span-6 lg:col-span-7",
  wide: "md:col-span-3 lg:col-span-5",
  standard: "md:col-span-3 lg:col-span-4",
};

export const BENTO_SIZE_LABEL: Readonly<Record<BentoSize, string>> = {
  featured: "Destacada",
  wide: "Ancha",
  standard: "Compacta",
};

/** Obtiene los tamaños Bento por defecto combinando los guardados por SuperAdmin y un patrón asimétrico. */
export const resolveBentoSizes = (
  apps: readonly EffectiveAppAccess[],
  overrideSizes?: Readonly<Record<string, BentoSize>> | null,
): Record<string, BentoSize> => {
  const stored = overrideSizes ?? readCachedBentoSizes();
  const resolved: Record<string, BentoSize> = {};
  apps.forEach((app, index) => {
    const saved = stored[app.id];
    resolved[app.id] =
      saved ??
      DEFAULT_ASIMETRIC_PATTERN[index] ??
      (index % 2 === 0 ? "wide" : "standard");
  });
  return resolved;
};

export const readCachedBentoSizes = (): Record<string, BentoSize> => {
  try {
    const raw = safeStorage.getItem(GLOBAL_BENTO_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const clean: Record<string, BentoSize> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v === "featured" || v === "wide" || v === "standard") {
        clean[k] = v;
      }
    }
    return clean;
  } catch {
    return {};
  }
};

export const saveCachedBentoSizes = (
  sizes: Readonly<Record<string, BentoSize>>,
): void => {
  safeStorage.setItem(GLOBAL_BENTO_CACHE_KEY, JSON.stringify(sizes));
};

export const clearCachedBentoSizes = (): void => {
  safeStorage.removeItem(GLOBAL_BENTO_CACHE_KEY);
};

export const readSortModePreference = (): HubSortMode => {
  const raw = safeStorage.getItem(SORT_PREF_KEY);
  return raw === "most_used" ? "most_used" : "portal";
};

export const saveSortModePreference = (mode: HubSortMode): void => {
  safeStorage.setItem(SORT_PREF_KEY, mode);
};

/** Ordena las aplicaciones según el orden predeterminado del portal o el ranking de uso. */
export const sortAppsForHub = (
  apps: readonly EffectiveAppAccess[],
  mode: HubSortMode,
  usageCounts: Readonly<Record<string, number>>,
): EffectiveAppAccess[] => {
  const copy = [...apps];
  if (mode === "most_used") {
    return copy.sort((a, b) => {
      const diff = (usageCounts[b.id] ?? 0) - (usageCounts[a.id] ?? 0);
      if (diff !== 0) return diff;
      return a.displayOrder - b.displayOrder || a.name.localeCompare(b.name);
    });
  }
  return copy.sort(
    (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
  );
};
