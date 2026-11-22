import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { APP_ICON_KEYS } from "../../../src/shared/auth/access-types";
import {
  AppIcon,
  APP_ICON_OPTIONS,
  resolveEffectiveAppIcon,
} from "../../../src/shared/ui/app-icon";

const EXPECTED_LUCIDE_CLASS: Readonly<Record<string, string>> = {
  diagnostico: "lucide-stethoscope",
  logs: "lucide-scroll-text",
  backends: "lucide-server",
  docs: "lucide-book-open-text",
  auditoria: "lucide-shield-check",
  pubsub: "lucide-radio-tower",
};

describe("AppIcon", () => {
  it("renderiza cada AppIconType oficial con Lucide, currentColor, aria-hidden y className", () => {
    expect(APP_ICON_OPTIONS.map((opt) => opt.value)).toEqual([...APP_ICON_KEYS]);

    for (const iconKey of APP_ICON_KEYS) {
      const { container } = render(
        <AppIcon icon={iconKey} className="size-8" strokeWidth={2.2} />,
      );
      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("stroke", "currentColor");
      expect(svg).toHaveAttribute("stroke-width", "2.2");
      expect(svg).toHaveClass("size-8");
      expect(svg).toHaveClass(EXPECTED_LUCIDE_CLASS[iconKey]);
    }
  });

  it("usa LayoutGrid como fallback genérico para íconos desconocidos", () => {
    const { container } = render(<AppIcon icon="herramienta-nueva" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveClass("size-5");
    expect(svg).toHaveClass("lucide-layout-grid");
  });

  it("resuelve compatibilidad retroactiva de pubsub para logs y backends sin alterar otras apps", () => {
    expect(resolveEffectiveAppIcon("pubsub", "logs")).toBe("logs");
    expect(resolveEffectiveAppIcon("pubsub", "backends")).toBe("backends");
    expect(resolveEffectiveAppIcon("pubsub", "otra")).toBe("pubsub");
    expect(resolveEffectiveAppIcon("docs", "logs")).toBe("docs");
  });
});
