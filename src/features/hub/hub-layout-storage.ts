import type { EffectiveAppAccess } from "../../shared/auth/access-types";
import { safeStorage } from "../../shared/lib/safe-storage";
import type { BentoSize } from "./api/apps-health";

export type HubSortMode = "portal" | "most_used";

export interface BentoDimensions {
  readonly colSpan: number;
  readonly rowSpan: number;
}

const GLOBAL_BENTO_CACHE_KEY = "cm-toolbox:hub-bento-sizes";
const SORT_PREF_KEY = "cm-toolbox:hub-sort-mode";
const CUSTOM_SIZE_PATTERN = /^(?:[3-9]|1[0-2])x[1-3]$/;

const LG_COL_SPAN_CLASS: Readonly<Record<number, string>> = {
  3: "md:col-span-3 lg:col-span-3",
  4: "md:col-span-3 lg:col-span-4",
  5: "md:col-span-3 lg:col-span-5",
  6: "md:col-span-3 lg:col-span-6",
  7: "md:col-span-6 lg:col-span-7",
  8: "md:col-span-6 lg:col-span-8",
  9: "md:col-span-6 lg:col-span-9",
  10: "md:col-span-6 lg:col-span-10",
  11: "md:col-span-6 lg:col-span-11",
  12: "md:col-span-6 lg:col-span-12",
};

const LG_ROW_SPAN_CLASS: Readonly<Record<number, string>> = {
  1: "lg:row-span-1",
  2: "lg:row-span-2 min-h-[380px]",
  3: "lg:row-span-3 min-h-[540px]",
};

export const BENTO_SPAN_CLASS: Readonly<Record<string, string>> = {
  featured: `${LG_COL_SPAN_CLASS[7]} ${LG_ROW_SPAN_CLASS[1]}`,
  wide: `${LG_COL_SPAN_CLASS[5]} ${LG_ROW_SPAN_CLASS[1]}`,
  standard: `${LG_COL_SPAN_CLASS[4]} ${LG_ROW_SPAN_CLASS[1]}`,
};

export const BENTO_SIZE_LABEL: Readonly<Record<string, string>> = {
  featured: "Destacada",
  wide: "Ancha",
  standard: "Compacta",
};

export const isValidBentoSize = (val: unknown): val is BentoSize =>
  val === "featured" ||
  val === "wide" ||
  val === "standard" ||
  (typeof val === "string" && CUSTOM_SIZE_PATTERN.test(val));

export const parseBentoDimensions = (size: BentoSize): BentoDimensions => {
  if (size === "featured") return { colSpan: 7, rowSpan: 1 };
  if (size === "wide") return { colSpan: 5, rowSpan: 1 };
  if (size === "standard") return { colSpan: 4, rowSpan: 1 };
  const match = /^(\d+)x(\d+)$/.exec(size);
  if (match) {
    const colSpan = Math.min(12, Math.max(3, Number(match[1])));
    const rowSpan = Math.min(3, Math.max(1, Number(match[2])));
    return { colSpan, rowSpan };
  }
  return { colSpan: 5, rowSpan: 1 };
};

export const formatBentoSize = (colSpan: number, rowSpan: number): BentoSize => {
  const cols = Math.min(12, Math.max(3, Math.round(colSpan)));
  const rows = Math.min(3, Math.max(1, Math.round(rowSpan)));
  return `${cols}x${rows}`;
};

export const getBentoSpanClasses = (size: BentoSize): string => {
  if (BENTO_SPAN_CLASS[size]) return BENTO_SPAN_CLASS[size];
  const { colSpan, rowSpan } = parseBentoDimensions(size);
  const colClass = LG_COL_SPAN_CLASS[colSpan] ?? LG_COL_SPAN_CLASS[5];
  const rowClass = LG_ROW_SPAN_CLASS[rowSpan] ?? LG_ROW_SPAN_CLASS[1];
  return `${colClass} ${rowClass}`;
};

/**
 * Empaqueta automáticamente las herramientas para que cada fila de 12 columnas quede llena sin huecos.
 */
export const computeAutoPackedBentoSizes = (
  apps: readonly EffectiveAppAccess[],
): Record<string, BentoSize> => {
  const count = apps.length;
  const resolved: Record<string, BentoSize> = {};
  if (count === 0) return resolved;

  if (count === 1) {
    resolved[apps[0].id] = "12x1";
    return resolved;
  }

  const pattern: BentoSize[] = [];
  const evenPairs = count % 2 === 0 ? count : count - 3;

  for (let i = 0; i < evenPairs; i += 2) {
    const pairIndex = (i / 2) % 2;
    if (pairIndex === 0) {
      pattern.push("featured", "wide");
    } else {
      pattern.push("wide", "featured");
    }
  }

  if (count % 2 === 1) {
    pattern.push("standard", "standard", "standard");
  }

  apps.forEach((app, index) => {
    resolved[app.id] = pattern[index] ?? "standard";
  });

  return resolved;
};

/** Obtiene los tamaños Bento combinando los guardados por SuperAdmin cuando cubren el catálogo o auto-empaquetando sin huecos. */
export const resolveBentoSizes = (
  apps: readonly EffectiveAppAccess[],
  overrideSizes?: Readonly<Record<string, BentoSize>> | null,
): Record<string, BentoSize> => {
  const stored = overrideSizes ?? readCachedBentoSizes();
  const hasCompleteCoverage =
    apps.length > 0 && apps.every((app) => isValidBentoSize(stored[app.id]));

  if (hasCompleteCoverage) {
    const resolved: Record<string, BentoSize> = {};
    for (const app of apps) {
      resolved[app.id] = stored[app.id];
    }
    return resolved;
  }

  const auto = computeAutoPackedBentoSizes(apps);
  if (!overrideSizes || Object.keys(overrideSizes).length === 0) {
    return auto;
  }

  const merged: Record<string, BentoSize> = { ...auto };
  for (const app of apps) {
    if (isValidBentoSize(overrideSizes[app.id])) {
      merged[app.id] = overrideSizes[app.id];
    }
  }
  return merged;
};

export const readCachedBentoSizes = (): Record<string, BentoSize> => {
  try {
    const raw = safeStorage.getItem(GLOBAL_BENTO_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const clean: Record<string, BentoSize> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (isValidBentoSize(v)) {
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
