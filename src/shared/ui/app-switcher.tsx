import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "react-router";
import type { EffectiveAppAccess } from "../auth/access-types";
import { useMovimientoReducido } from "../lib/use-movimiento-reducido";
import { AppIcon } from "./app-icon";

const STATIC_ROUTE_TITLES: readonly {
  readonly prefix: string;
  readonly title: string;
}[] = [
  { prefix: "/admin", title: "Administración de Accesos" },
  { prefix: "/configuracion", title: "Apariencia" },
  { prefix: "/privacidad", title: "Política de Privacidad" },
  { prefix: "/terminos", title: "Términos y Condiciones" },
  { prefix: "/contacto", title: "Contacto y Soporte" },
  { prefix: "/gracias", title: "Confirmación" },
  { prefix: "/bienvenida", title: "Bienvenida" },
];

/** Resuelve el título del breadcrumb a partir de las apps configuradas y rutas estáticas. */
export const resolveRouteTitle = (
  pathname: string,
  apps: readonly EffectiveAppAccess[],
): string => {
  const dynamicApp = apps.find(
    (app) => app.route !== "/" && pathname.startsWith(app.route),
  );
  if (dynamicApp) return dynamicApp.name;

  const staticMatch = STATIC_ROUTE_TITLES.find((item) =>
    pathname.startsWith(item.prefix),
  );
  if (staticMatch) return staticMatch.title;

  if (pathname.startsWith("/diagnostico")) return "Diagnóstico de migración";
  if (pathname.startsWith("/logs")) return "Visor de Logs GKE";
  if (pathname.startsWith("/backends")) return "Mis Backends";
  if (pathname.startsWith("/docs")) return "Documentación de APIs";
  return "Página";
};

interface AppSwitcherProps {
  readonly apps: readonly EffectiveAppAccess[];
  readonly currentPath: string;
}

/**
 * Selector escalable de herramientas en el header mediante breadcrumb con menú desplegable
 * (y campo de búsqueda integrado cuando hay más de 8 apps).
 */
export const AppSwitcher = ({ apps, currentPath }: AppSwitcherProps) => {
  const movimientoReducido = useMovimientoReducido();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const optionRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const accessibleApps = useMemo(
    () =>
      apps.filter(
        (app) =>
          app.canAccess &&
          app.status !== "disabled" &&
          app.status !== "hidden" &&
          app.route.startsWith("/"),
      ),
    [apps],
  );

  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [currentPath]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (accessibleApps.length > 8) {
      const id = window.setTimeout(() => {
        searchRef.current?.focus();
      }, 10);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      optionRefs.current[0]?.focus();
    }, 10);
    return () => window.clearTimeout(id);
  }, [open, accessibleApps.length]);

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accessibleApps;
    return accessibleApps.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        app.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [accessibleApps, query]);

  const routeTitle = resolveRouteTitle(currentPath, apps);

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) setQuery("");
      return next;
    });
  };

  const handleTriggerKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key === "ArrowDown" && !open) {
      event.preventDefault();
      setOpen(true);
    }
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = optionRefs.current.filter(
      (el): el is HTMLAnchorElement => el !== null,
    );
    if (items.length === 0) return;
    const currentIdx = items.indexOf(
      document.activeElement as HTMLAnchorElement,
    );

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % items.length;
      items[nextIdx]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const prevIdx =
        currentIdx <= 0 ? items.length - 1 : (currentIdx - 1) % items.length;
      items[prevIdx]?.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative flex min-w-0 items-center gap-3">
      {/* Breadcrumb con disparador del selector */}
      <div className="flex shrink-0 items-center gap-2 text-xs sm:text-sm">
        <Link
          to="/"
          className="hidden shrink-0 font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--color-primary)] sm:inline-block"
        >
          Portal
        </Link>
        <span className="hidden shrink-0 text-[var(--text-muted)] sm:inline-block">
          /
        </span>

        {accessibleApps.length > 0 ? (
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={`Cambiar de herramienta (${routeTitle})`}
            onClick={handleToggle}
            onKeyDown={handleTriggerKeyDown}
            className="inline-flex max-w-[240px] cursor-pointer items-center gap-1.5 rounded-[var(--radius-1)] px-2 py-1 text-left font-bold tracking-tight text-[var(--text-body)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] sm:max-w-[320px]"
          >
            <span className="truncate">{routeTitle}</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              className={`size-3.5 shrink-0 text-[var(--text-muted)] transition-transform duration-150 ${
                open ? "rotate-180" : ""
              }`}
            >
              <path
                d="m4 6 4 4 4-4"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <span className="truncate font-bold tracking-tight text-[var(--text-body)]">
            {routeTitle}
          </span>
        )}
      </div>

      {/* Menú desplegable de herramientas */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={
              movimientoReducido
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: -6 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={
              movimientoReducido
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: -6 }
            }
            transition={{ duration: movimientoReducido ? 0 : 0.15 }}
            onKeyDown={handleMenuKeyDown}
            style={{ boxShadow: "var(--shadow-24)" }}
            className="fixed inset-x-4 top-18 z-50 overflow-hidden rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)] sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 sm:w-96"
          >
            {accessibleApps.length > 8 && (
              <div className="border-b border-[var(--border-default)] p-2.5">
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filtrar herramienta por nombre o etiqueta..."
                  aria-label="Filtrar herramientas disponibles"
                  className="w-full rounded-[var(--radius-1)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-1.5 text-xs text-[var(--text-body)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                />
              </div>
            )}

            <div
              role="listbox"
              aria-label="Herramientas disponibles"
              className="max-h-80 space-y-1 overflow-y-auto p-2"
            >
              {filteredApps.length === 0 ? (
                <p className="px-3 py-5 text-center text-xs text-[var(--text-muted)]">
                  No se encontraron herramientas para “{query}”.
                </p>
              ) : (
                filteredApps.map((app, index) => {
                  const activa = currentPath.startsWith(app.route);
                  return (
                    <Link
                      key={app.id}
                      ref={(el) => {
                        optionRefs.current[index] = el;
                      }}
                      role="option"
                      aria-selected={activa}
                      aria-current={activa ? "page" : undefined}
                      to={app.route}
                      onClick={() => setOpen(false)}
                      className={`flex items-start gap-3 rounded-[var(--radius-2)] px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
                        activa
                          ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                          : "text-[var(--text-body)] hover:bg-[var(--surface-sunken)]"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-[var(--radius-2)] border ${
                          activa
                            ? "border-[var(--color-primary)]/30 bg-[var(--surface-card)] text-[var(--color-primary)]"
                            : "border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-muted)]"
                        }`}
                      >
                        <AppIcon
                          icon={app.icon}
                          appId={app.id}
                          className="size-4"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-bold">
                            {app.name}
                          </span>
                          {app.status === "maintenance" && (
                            <span className="shrink-0 rounded-[var(--radius-pill)] border border-[var(--state-warning)]/40 bg-[var(--alert-warning-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--alert-warning-fg)]">
                              Mantenimiento
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                          {app.description}
                        </span>
                      </span>
                    </Link>
                  );
                })
              )}
            </div>

            <div className="border-t border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-2">
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-[var(--radius-1)] px-2 py-1 text-xs font-semibold text-[var(--color-primary)] transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                <span>Ver todas en el portal</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
