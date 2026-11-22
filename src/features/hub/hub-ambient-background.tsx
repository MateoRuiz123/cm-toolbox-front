import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { EffectiveAppAccess } from "../../shared/auth/access-types";
import { useMovimientoReducido } from "../../shared/lib/use-movimiento-reducido";
import {
  AVAILABLE_AMBIENT_IMAGES,
  hasAmbientImageAsset,
  resolveHubAmbientTheme,
  type HubAmbientMotif,
} from "./hub-ambient-config";

interface HubAmbientBackgroundProps {
  readonly apps: readonly EffectiveAppAccess[];
  readonly activeAppId: string | null;
  readonly availableImages?: ReadonlySet<string>;
}

/**
 * Motivo SVG marcador decorativo (hasta reemplazar con /hub-ambient/*.webp),
 * estilizado mediante currentColor para respetar el modo claro y oscuro de SIGO.
 */
const AmbientSceneMotif = ({ motif }: { readonly motif: HubAmbientMotif }) => {
  if (motif === "diagnostico") {
    return (
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full text-[var(--color-primary)] opacity-25 dark:opacity-35"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.32"
          strokeWidth="2"
        >
          <circle cx="1180" cy="340" r="120" />
          <circle cx="1180" cy="340" r="220" />
          <circle cx="1180" cy="340" r="340" />
          <circle cx="1180" cy="340" r="470" />
        </g>
        <path
          d="M1070 340l80 80 150-170"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.45"
          strokeWidth="22"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (motif === "logs") {
    return (
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full text-[var(--color-primary)] opacity-22 dark:opacity-32"
      >
        <g fill="currentColor" fillOpacity="0.28">
          <rect x="860" y="160" width="520" height="20" rx="10" />
          <rect x="860" y="218" width="640" height="20" rx="10" />
          <rect x="860" y="276" width="400" height="20" rx="10" />
          <rect x="860" y="392" width="480" height="20" rx="10" />
          <rect x="860" y="450" width="610" height="20" rx="10" />
          <rect x="860" y="508" width="350" height="20" rx="10" />
        </g>
        <rect
          x="860"
          y="334"
          width="580"
          height="22"
          rx="11"
          className="text-[var(--color-accent)]"
          fill="currentColor"
          fillOpacity="0.55"
        />
      </svg>
    );
  }

  if (motif === "backends") {
    return (
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full text-[var(--color-accent)] opacity-25 dark:opacity-35"
      >
        <g
          fill="currentColor"
          fillOpacity="0.16"
          stroke="currentColor"
          strokeOpacity="0.38"
          strokeWidth="2.5"
        >
          <rect x="920" y="170" width="460" height="120" rx="22" />
          <rect x="920" y="330" width="460" height="120" rx="22" />
          <rect x="920" y="490" width="460" height="120" rx="22" />
        </g>
        <g fill="currentColor" fillOpacity="0.68">
          <circle cx="980" cy="230" r="12" />
          <circle cx="980" cy="390" r="12" />
          <circle cx="980" cy="550" r="12" />
        </g>
      </svg>
    );
  }

  if (motif === "docs") {
    return (
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full text-[var(--state-success)] opacity-22 dark:opacity-30"
      >
        <g
          fill="currentColor"
          fillOpacity="0.14"
          stroke="currentColor"
          strokeOpacity="0.36"
          strokeWidth="2.5"
        >
          <rect
            x="900"
            y="140"
            width="280"
            height="380"
            rx="18"
            transform="rotate(-6 1040 330)"
          />
          <rect
            x="1120"
            y="210"
            width="280"
            height="380"
            rx="18"
            transform="rotate(5 1260 400)"
          />
        </g>
        <text
          x="975"
          y="290"
          fontFamily="monospace"
          fontSize="64"
          fill="currentColor"
          fillOpacity="0.55"
          transform="rotate(-6 1040 330)"
        >
          {"{ }"}
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full text-[var(--color-primary)] opacity-20 dark:opacity-30"
    >
      <path
        d="M1160 170l190 65v160c0 120-85 205-190 250-105-45-190-130-190-250V235z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeOpacity="0.38"
        strokeWidth="3"
      />
      <path
        d="M1085 400l55 55 105-120"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.52"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Capa de fondo fija estilo PS5: apila escenas SIGO por herramienta y hace crossfade exclusivamente con opacity.
 */
export const HubAmbientBackground = ({
  apps,
  activeAppId,
  availableImages = AVAILABLE_AMBIENT_IMAGES,
}: HubAmbientBackgroundProps) => {
  const movimientoReducido = useMovimientoReducido();
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const themes = useMemo(
    () =>
      apps
        .filter((app) => app.status !== "hidden")
        .map((app) => resolveHubAmbientTheme(app)),
    [apps],
  );

  // Solo pre-cargamos imagen si está registrada en el manifiesto y corresponde a la app activa o sus vecinas inmediatas
  const neighborAppIds = useMemo(() => {
    const ids = new Set<string>();
    const activeIdx = themes.findIndex((theme) => theme.id === activeAppId);
    if (activeIdx === -1 || themes.length === 0) return ids;

    const prevIdx = (activeIdx - 1 + themes.length) % themes.length;
    const nextIdx = (activeIdx + 1) % themes.length;
    ids.add(themes[activeIdx].id);
    ids.add(themes[prevIdx].id);
    ids.add(themes[nextIdx].id);
    return ids;
  }, [themes, activeAppId]);

  return (
    <div
      aria-hidden="true"
      data-testid="hub-ambient-background"
      data-active-app-id={activeAppId ?? ""}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Escena neutra cuando ninguna tarjeta está activa */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 55% at 50% 8%, color-mix(in srgb, var(--color-primary-soft) 55%, transparent) 0%, transparent 72%)",
        }}
      />

      {themes.map((theme) => {
        const isActive = activeAppId === theme.id;
        const shouldMountImage =
          hasAmbientImageAsset(theme.imagePath, availableImages) &&
          neighborAppIds.has(theme.id) &&
          !failedImages[theme.id];

        return (
          <motion.div
            key={theme.id}
            data-ambient-app={theme.id}
            initial={false}
            animate={{ opacity: isActive ? 1 : 0 }}
            transition={
              movimientoReducido
                ? { duration: 0 }
                : { duration: 0.5, ease: "easeOut" }
            }
            style={{
              backgroundImage: theme.ambientGradient,
              willChange: "opacity",
            }}
            className="absolute inset-0"
          >
            <AmbientSceneMotif motif={theme.motif} />

            {shouldMountImage && (
              <img
                src={theme.imagePath}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() =>
                  setFailedImages((prev) =>
                    prev[theme.id] ? prev : { ...prev, [theme.id]: true },
                  )
                }
                className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-luminosity"
              />
            )}
          </motion.div>
        );
      })}

      {/* Velo direccional de legibilidad con --surface-app (claro y oscuro) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, var(--surface-app) 4%, color-mix(in srgb, var(--surface-app) 42%, transparent) 44%, transparent 80%), linear-gradient(to right, color-mix(in srgb, var(--surface-app) 68%, transparent) 0%, transparent 62%)",
        }}
      />
    </div>
  );
};
