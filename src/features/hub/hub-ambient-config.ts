import type { EffectiveAppAccess } from "../../shared/auth/access-types";

export type HubAmbientMotif =
  | "diagnostico"
  | "logs"
  | "backends"
  | "docs"
  | "auditoria"
  | "generic";

export interface HubAmbientTheme {
  readonly id: string;
  readonly motif: HubAmbientMotif;
  readonly categoryLabel: string;
  readonly imagePath: string;
  readonly ambientGradient: string;
  readonly tileGradient: string;
  readonly spotlightLabel: string;
}

/**
 * Manifiesto explícito de imágenes .webp disponibles en `public/hub-ambient/`.
 * Permanece vacío mientras la carpeta solo contenga README.md para evitar peticiones 404.
 * Al añadir archivos reales (p. ej. `"/hub-ambient/diagnostico.webp"`), regístralos aquí.
 */
export const AVAILABLE_AMBIENT_IMAGES: ReadonlySet<string> = new Set();

export const hasAmbientImageAsset = (
  imagePath: string,
  manifest: ReadonlySet<string> = AVAILABLE_AMBIENT_IMAGES,
): boolean => manifest.has(imagePath);

const INTERACTIVE_OVERLAY_SELECTOR =
  '[role="dialog"], [aria-modal="true"], [role="menu"], [role="listbox"]';

/** Determina si la navegación con flechas ← → del Hub debe ceder el foco a un diálogo o control editable. */
export const shouldIgnoreHubArrowKey = (event: KeyboardEvent): boolean => {
  if (event.defaultPrevented) return true;
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return true;
  if (event.altKey || event.ctrlKey || event.metaKey) return true;
  if (document.querySelector('[role="dialog"], [aria-modal="true"]')) {
    return true;
  }

  const target = event.target as HTMLElement | null;
  if (!target) return false;
  const tag = typeof target.tagName === "string" ? target.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return (
    typeof target.closest === "function" &&
    Boolean(target.closest(INTERACTIVE_OVERLAY_SELECTOR))
  );
};

const KNOWN_AMBIENTS_BY_ID: Readonly<Record<string, Omit<HubAmbientTheme, "id">>> = {
  diagnostico: {
    motif: "diagnostico",
    categoryLabel: "Operación",
    imagePath: "/hub-ambient/diagnostico.webp",
    ambientGradient:
      "radial-gradient(ellipse 78% 68% at 80% 24%, color-mix(in srgb, var(--azul-coordinadora) 52%, transparent) 0%, transparent 66%), radial-gradient(ellipse 62% 56% at 18% 78%, color-mix(in srgb, var(--azul-light) 34%, transparent) 0%, transparent 70%)",
    tileGradient:
      "linear-gradient(145deg, var(--azul-coordinadora) 0%, var(--azul-dark) 100%)",
    spotlightLabel: "Trazabilidad & Diagnóstico de Guías",
  },
  logs: {
    motif: "logs",
    categoryLabel: "Observabilidad",
    imagePath: "/hub-ambient/logs.webp",
    ambientGradient:
      "radial-gradient(ellipse 80% 68% at 82% 20%, color-mix(in srgb, var(--azul-dark) 54%, transparent) 0%, transparent 66%), radial-gradient(ellipse 60% 52% at 18% 82%, color-mix(in srgb, var(--azul-400) 34%, transparent) 0%, transparent 70%)",
    tileGradient:
      "linear-gradient(145deg, var(--azul-400) 0%, var(--azul-700) 100%)",
    spotlightLabel: "Streaming Kubernetes Prod & Test",
  },
  backends: {
    motif: "backends",
    categoryLabel: "Infraestructura",
    imagePath: "/hub-ambient/backends.webp",
    ambientGradient:
      "radial-gradient(ellipse 76% 66% at 80% 22%, color-mix(in srgb, var(--naranja-coordinadora) 48%, transparent) 0%, transparent 66%), radial-gradient(ellipse 65% 55% at 18% 78%, color-mix(in srgb, var(--azul-coordinadora) 28%, transparent) 0%, transparent 70%)",
    tileGradient:
      "linear-gradient(145deg, var(--naranja-coordinadora) 0%, var(--naranja-dark) 100%)",
    spotlightLabel: "Telemetría GKE & Estado Personal",
  },
  docs: {
    motif: "docs",
    categoryLabel: "Desarrollo",
    imagePath: "/hub-ambient/docs.webp",
    ambientGradient:
      "radial-gradient(ellipse 76% 66% at 82% 24%, color-mix(in srgb, var(--state-success) 44%, transparent) 0%, transparent 66%), radial-gradient(ellipse 62% 55% at 20% 80%, color-mix(in srgb, var(--azul-coordinadora) 28%, transparent) 0%, transparent 70%)",
    tileGradient:
      "linear-gradient(145deg, var(--state-success) 0%, var(--azul-700) 100%)",
    spotlightLabel: "Especificaciones OpenAPI Corporativas",
  },
  auditoria: {
    motif: "auditoria",
    categoryLabel: "Seguridad",
    imagePath: "/hub-ambient/auditoria.webp",
    ambientGradient:
      "radial-gradient(ellipse 76% 66% at 78% 26%, color-mix(in srgb, var(--noencontrada) 42%, transparent) 0%, transparent 66%), radial-gradient(ellipse 60% 55% at 20% 78%, color-mix(in srgb, var(--ambar-aviso) 26%, transparent) 0%, transparent 70%)",
    tileGradient:
      "linear-gradient(145deg, var(--noencontrada) 0%, var(--azul-dark) 100%)",
    spotlightLabel: "Validación de Facturación",
  },
};

const ICON_AMBIENT_FALLBACK: Readonly<
  Partial<Record<string, Omit<HubAmbientTheme, "id">>>
> = {
  diagnostico: KNOWN_AMBIENTS_BY_ID.diagnostico,
  logs: KNOWN_AMBIENTS_BY_ID.logs,
  backends: KNOWN_AMBIENTS_BY_ID.backends,
  docs: KNOWN_AMBIENTS_BY_ID.docs,
  auditoria: KNOWN_AMBIENTS_BY_ID.auditoria,
  pubsub: KNOWN_AMBIENTS_BY_ID.logs,
};

const DYNAMIC_AMBIENT_VARIANTS: readonly {
  readonly ambientGradient: string;
  readonly tileGradient: string;
}[] = [
  {
    ambientGradient:
      "radial-gradient(ellipse 76% 66% at 80% 22%, color-mix(in srgb, var(--color-primary) 48%, transparent) 0%, transparent 66%), radial-gradient(ellipse 65% 55% at 22% 78%, color-mix(in srgb, var(--color-accent) 28%, transparent) 0%, transparent 70%)",
    tileGradient:
      "linear-gradient(145deg, var(--color-primary) 0%, var(--azul-dark) 100%)",
  },
  {
    ambientGradient:
      "radial-gradient(ellipse 76% 66% at 78% 20%, color-mix(in srgb, var(--color-accent) 44%, transparent) 0%, transparent 66%), radial-gradient(ellipse 65% 55% at 22% 80%, color-mix(in srgb, var(--state-success) 28%, transparent) 0%, transparent 70%)",
    tileGradient:
      "linear-gradient(145deg, var(--color-accent) 0%, var(--naranja-dark) 100%)",
  },
  {
    ambientGradient:
      "radial-gradient(ellipse 76% 66% at 82% 24%, color-mix(in srgb, var(--color-primary) 44%, transparent) 0%, transparent 66%), radial-gradient(ellipse 60% 50% at 18% 80%, color-mix(in srgb, var(--state-warning) 30%, transparent) 0%, transparent 70%)",
    tileGradient:
      "linear-gradient(145deg, var(--state-success) 0%, var(--azul-dark) 100%)",
  },
];

const hashId = (value: string): number => {
  let acc = 0;
  for (let i = 0; i < value.length; i++) {
    acc = (acc * 31 + value.charCodeAt(i)) >>> 0;
  }
  return acc;
};

/**
 * Resuelve el ambiente visual (degradado SIGO + motivo marcador + imagen WebP opcional) para cualquier app del Hub.
 */
export const resolveHubAmbientTheme = (
  app: Pick<EffectiveAppAccess, "id" | "icon" | "name">,
): HubAmbientTheme => {
  const known = KNOWN_AMBIENTS_BY_ID[app.id];
  if (known) {
    return { id: app.id, ...known };
  }

  const byIcon = ICON_AMBIENT_FALLBACK[app.icon];
  const variant =
    DYNAMIC_AMBIENT_VARIANTS[hashId(app.id) % DYNAMIC_AMBIENT_VARIANTS.length];
  if (byIcon) {
    return {
      id: app.id,
      motif: byIcon.motif,
      categoryLabel: byIcon.categoryLabel,
      imagePath: `/hub-ambient/${app.id}.webp`,
      ambientGradient: variant?.ambientGradient || byIcon.ambientGradient,
      tileGradient: variant?.tileGradient || byIcon.tileGradient,
      spotlightLabel: app.name,
    };
  }

  return {
    id: app.id,
    motif: "generic",
    categoryLabel: "Herramienta",
    imagePath: "/hub-ambient/default.webp",
    ambientGradient: variant.ambientGradient,
    tileGradient: variant.tileGradient,
    spotlightLabel: app.name,
  };
};
