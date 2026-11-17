import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Skeleton,
  SkeletonRegion,
  SkeletonText,
} from "../../../src/shared/ui/skeleton";
import { BackendsListSkeleton } from "../../../src/features/backends/backend-skeleton";

describe("Skeleton", () => {
  it("SkeletonRegion anuncia la etiqueta y marca aria-busy", () => {
    render(
      <SkeletonRegion label="Cargando prueba…">
        <Skeleton className="h-4 w-10" />
      </SkeletonRegion>,
    );
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Cargando prueba…")).toBeInTheDocument();
  });

  it("Skeleton usa shimmer, oculto a lectores de pantalla y respeta radio propio", () => {
    const { container } = render(
      <>
        <Skeleton className="h-4" />
        <Skeleton className="h-4 rounded-full" />
      </>,
    );
    const [plain, custom] = Array.from(container.children);
    expect(plain).toHaveClass("skeleton-shimmer", "rounded-[var(--radius-1)]");
    expect(plain).toHaveAttribute("aria-hidden", "true");
    expect(custom).toHaveClass("rounded-full");
    expect(custom).not.toHaveClass("rounded-[var(--radius-1)]");
  });

  it("SkeletonText genera el número de líneas pedido", () => {
    const { container } = render(<SkeletonText lines={4} />);
    expect(container.querySelectorAll(".skeleton-shimmer")).toHaveLength(4);
  });

  it("BackendsListSkeleton muestra 3 tarjetas con etiqueta de carga", () => {
    const { container } = render(<BackendsListSkeleton compact={false} />);
    expect(
      screen.getByText("Cargando catálogo personal de backends..."),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("article")).toHaveLength(3);
  });
});
