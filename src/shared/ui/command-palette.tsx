import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router";
import { ThemeContext } from "../../app/theme-context";
import type { AppIconType } from "../auth/access-types";
import { useAccess } from "../auth/use-access";
import { AppIcon } from "./app-icon";
import {
  recordAppOpenEvent,
  sendAutomaticIncidentReport,
} from "../../features/hub/api/apps-health";

interface CommandActionItem {
  readonly id: string;
  readonly category: "Herramienta" | "Navegación" | "Acción rápida" | "Soporte";
  readonly label: string;
  readonly hint: string;
  readonly keywords: string;
  readonly icon?: AppIconType;
  readonly appId?: string;
  readonly onSelect: () => void | Promise<void>;
}

/**
 * Paleta de comandos global (Ctrl+K / Cmd+K) para navegar entre herramientas,
 * alternar apariencia o enviar reportes automáticos de fallo en 1 clic.
 */
export const CommandPalette = () => {
  const navigate = useNavigate();
  const themeContext = useContext(ThemeContext);
  const { apps, canManageApps, canManageUsers } = useAccess();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const togglePalette = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        setQuery("");
        setSelectedIndex(0);
        setReportFeedback(null);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        togglePalette();
        return;
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [togglePalette]);

  useEffect(() => {
    if (!open) return;
    const timer = globalThis.setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
    return () => globalThis.clearTimeout(timer);
  }, [open]);

  const handleToggleTheme = useCallback(() => {
    if (themeContext) {
      themeContext.toggleTheme();
    } else if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark");
    }
    setOpen(false);
  }, [themeContext]);

  const commands = useMemo<CommandActionItem[]>(() => {
    const list: CommandActionItem[] = [
      {
        id: "nav-hub",
        category: "Navegación",
        label: "Ir al Portal de Aplicaciones",
        hint: "/",
        keywords: "inicio home hub portal aplicaciones",
        onSelect: () => {
          setOpen(false);
          navigate("/");
        },
      },
    ];

    for (const app of apps) {
      if (app.status === "hidden" || app.status === "disabled" || !app.canAccess) {
        continue;
      }
      list.push({
        id: `app-${app.id}`,
        category: "Herramienta",
        label: app.name,
        hint: app.route,
        keywords: `${app.id} ${app.name} ${app.description} ${app.tags.join(" ")}`,
        icon: app.icon,
        appId: app.id,
        onSelect: () => {
          void recordAppOpenEvent(app.id);
          setOpen(false);
          if (/^https?:\/\//i.test(app.route)) {
            window.open(app.route, "_blank", "noopener,noreferrer");
            return;
          }
          navigate(app.route);
        },
      });
    }

    if (canManageApps || canManageUsers) {
      list.push({
        id: "nav-admin",
        category: "Navegación",
        label: "Ir a Administración y Permisos",
        hint: "/admin",
        keywords: "admin rbac roles usuarios auditoria",
        onSelect: () => {
          setOpen(false);
          navigate("/admin");
        },
      });
    }

    list.push(
      {
        id: "action-theme",
        category: "Acción rápida",
        label: "Alternar tema claro / oscuro",
        hint: "Apariencia",
        keywords: "tema oscuro claro dark light modo apariencia",
        onSelect: handleToggleTheme,
      },
      {
        id: "nav-config",
        category: "Navegación",
        label: "Ir a Apariencia y Sistema Visual",
        hint: "/configuracion",
        keywords: "configuracion sigo droop apariencia",
        onSelect: () => {
          setOpen(false);
          navigate("/configuracion");
        },
      },
      {
        id: "nav-contact",
        category: "Navegación",
        label: "Ir a Contacto y Soporte TI",
        hint: "/contacto",
        keywords: "contacto soporte ayuda ticket correo",
        onSelect: () => {
          setOpen(false);
          navigate("/contacto");
        },
      },
    );

    for (const app of apps) {
      if (app.status === "hidden" || app.status === "disabled") continue;
      list.push({
        id: `report-${app.id}`,
        category: "Soporte",
        label: `Reportar fallo en ${app.name}`,
        hint: "Envío automático",
        keywords: `reportar fallo error incidencia ${app.name} ${app.id}`,
        onSelect: async () => {
          const result = await sendAutomaticIncidentReport({
            appId: app.id,
            appName: app.name,
            subject: `Reporte rápido desde Ctrl+K: ${app.name}`,
            message: `Un usuario reportó una anomalía en ${app.name} (${app.route}) desde la paleta global de comandos.`,
            detectedState:
              app.status === "maintenance" ? "maintenance" : "manual_report",
          });
          setReportFeedback(
            `Reporte enviado para ${app.name} (Ticket ${result.ticketId}).`,
          );
        },
      });
    }

    return list;
  }, [apps, canManageApps, canManageUsers, handleToggleTheme, navigate]);

  const filteredCommands = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return commands.slice(0, 10);
    return commands.filter(
      (item) =>
        item.label.toLowerCase().includes(normalized) ||
        item.category.toLowerCase().includes(normalized) ||
        item.keywords.toLowerCase().includes(normalized),
    );
  }, [commands, query]);

  const boundedIndex =
    filteredCommands.length === 0
      ? 0
      : Math.min(selectedIndex, filteredCommands.length - 1);

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (filteredCommands.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      }
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (filteredCommands.length > 0) {
        setSelectedIndex(
          (prev) =>
            (prev - 1 + filteredCommands.length) % filteredCommands.length,
        );
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const chosen = filteredCommands[boundedIndex];
      if (chosen) {
        void chosen.onSelect();
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={togglePalette}
        aria-label="Abrir paleta de comandos (Ctrl+K)"
        title="Buscar herramienta o acción (Ctrl+K)"
        className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--text-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="size-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="9" cy="9" r="5.5" strokeWidth="1.8" />
          <path d="m13.5 13.5 3.5 3.5" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="hidden md:inline">Buscar...</span>
        <kbd className="rounded border border-[var(--border-default)] bg-[var(--surface-card)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--text-muted)]">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div
          className="animate-modal-backdrop fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-4 pt-20 backdrop-blur-xs"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Paleta de comandos rápidos"
            style={{ boxShadow: "var(--elevation-modal)" }}
            className="animate-modal-dialog w-full max-w-xl overflow-hidden rounded-[var(--radius-3)] border border-[var(--border-default)] bg-[var(--surface-card)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[var(--border-default)] px-4 py-3">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="size-4 shrink-0 text-[var(--text-muted)]"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="9" cy="9" r="5.5" strokeWidth="1.8" />
                <path
                  d="m13.5 13.5 3.5 3.5"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <input
                ref={inputRef}
                type="search"
                aria-label="Buscar herramienta, ruta o acción rápida"
                placeholder="Buscar herramienta, ruta, tema o reportar fallo..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleInputKeyDown}
                className="w-full bg-transparent text-sm text-[var(--text-body)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />
              <button
                type="button"
                aria-label="Cerrar paleta de comandos"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded border border-[var(--border-default)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-body)]"
              >
                ESC
              </button>
            </div>

            {reportFeedback && (
              <div
                role="status"
                className="border-b border-[var(--state-success)]/30 bg-[var(--alert-success-bg)] px-4 py-2 text-xs font-semibold text-[var(--alert-success-fg)]"
              >
                {reportFeedback}
              </div>
            )}

            <ul
              role="listbox"
              aria-label="Comandos disponibles"
              className="max-h-80 overflow-y-auto p-2"
            >
              {filteredCommands.length === 0 ? (
                <li className="px-4 py-6 text-center text-xs text-[var(--text-muted)]">
                  No hay comandos que coincidan con “{query}”.
                </li>
              ) : (
                filteredCommands.map((item, idx) => {
                  const active = idx === boundedIndex;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => void item.onSelect()}
                        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-2)] px-3 py-2.5 text-left transition ${
                          active
                            ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                            : "text-[var(--text-body)] hover:bg-[var(--surface-sunken)]"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {item.icon && (
                            <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-2)] border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--color-primary)]">
                              <AppIcon
                                icon={item.icon}
                                appId={item.appId}
                                className="size-4"
                              />
                            </span>
                          )}
                          <div className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                              {item.label}
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {item.category}
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-[var(--text-muted)]">
                          {item.hint}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
};
