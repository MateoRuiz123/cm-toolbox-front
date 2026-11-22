import {
  BookOpenText,
  LayoutGrid,
  RadioTower,
  ScrollText,
  Server,
  ShieldCheck,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import type { AppIconType, KnownAppIconType } from "../auth/access-types";

const APP_ICON_MAP: Readonly<Record<KnownAppIconType, LucideIcon>> = {
  diagnostico: Stethoscope,
  logs: ScrollText,
  backends: Server,
  docs: BookOpenText,
  auditoria: ShieldCheck,
  pubsub: RadioTower,
};

/** Opciones oficiales de ícono disponibles en el catálogo y en el selector del administrador. */
export const APP_ICON_OPTIONS: readonly {
  readonly value: KnownAppIconType;
  readonly label: string;
}[] = [
  { value: "diagnostico", label: "Diagnóstico / Trazabilidad (Stethoscope)" },
  { value: "logs", label: "Visor de Logs GKE (ScrollText)" },
  { value: "backends", label: "Mis Backends / Servidores (Server)" },
  { value: "docs", label: "Documentación / Catálogo (BookOpenText)" },
  { value: "auditoria", label: "Auditoría / Cumplimiento (ShieldCheck)" },
  { value: "pubsub", label: "Mensajería / Streaming (RadioTower)" },
];

/**
 * Resuelve el identificador efectivo del ícono manteniendo compatibilidad con bases de datos
 * donde `logs` o `backends` aún conserven `'pubsub'` antes de migrar con 007_update_app_icons.sql.
 */
export const resolveEffectiveAppIcon = (
  icon: AppIconType,
  appId?: string,
): AppIconType => {
  if (icon === "pubsub" && (appId === "logs" || appId === "backends")) {
    return appId;
  }
  return icon;
};

const isKnownAppIcon = (value: string): value is KnownAppIconType =>
  Object.prototype.hasOwnProperty.call(APP_ICON_MAP, value);

export interface AppIconProps {
  readonly icon: AppIconType;
  readonly appId?: string;
  readonly className?: string;
  readonly strokeWidth?: number;
}

/**
 * Componente central de íconos Lucide para herramientas del portal.
 * Hereda el color desde tokens SIGO mediante currentColor y aplica LayoutGrid como fallback.
 */
export const AppIcon = ({
  icon,
  appId,
  className = "size-5",
  strokeWidth = 1.8,
}: AppIconProps) => {
  const resolvedKey = resolveEffectiveAppIcon(icon, appId);
  const IconComponent = isKnownAppIcon(resolvedKey)
    ? APP_ICON_MAP[resolvedKey]
    : LayoutGrid;

  return (
    <IconComponent
      aria-hidden="true"
      color="currentColor"
      strokeWidth={strokeWidth}
      className={className}
    />
  );
};
