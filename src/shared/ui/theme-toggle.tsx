import { useContext, useState } from "react";
import { ThemeContext } from "../../app/theme-context";

/** Botón accesible para alternar entre tema claro y oscuro. */
export const ThemeToggle = () => {
  const context = useContext(ThemeContext);
  const [fallbackDark, setFallbackDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false,
  );
  const isDark = context ? context.theme === "dark" : fallbackDark;

  const handleToggle = () => {
    if (context) {
      context.toggleTheme();
      return;
    }
    const next = !fallbackDark;
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next);
    }
    setFallbackDark(next);
  };

  return (
    <button
      type="button"
      aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={isDark ? "Tema claro" : "Tema oscuro"}
      onClick={handleToggle}
      className="surface grid size-10 cursor-pointer place-items-center rounded-full border border-[var(--border-default)] text-[var(--text-body)] transition hover:bg-[var(--surface-sunken)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
    >
      {isDark ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="12" cy="12" r="4" strokeWidth="1.8" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"
            strokeWidth="1.8"
          />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M20.5 15.4A8.5 8.5 0 0 1 8.6 3.5a8.5 8.5 0 1 0 11.9 11.9Z"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
};
