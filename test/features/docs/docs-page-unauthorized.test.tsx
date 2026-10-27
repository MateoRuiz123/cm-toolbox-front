import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocsPage } from "../../../src/features/docs/docs-page";
import * as docsApi from "../../../src/features/docs/api/docs-api";

describe("DocsPage 401", () => {
  beforeEach(() => {
    vi.spyOn(docsApi, "fetchDocsCatalog");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("invoca onUnauthorized ante 401 y no muestra error genérico", async () => {
    const onUnauthorized = vi.fn();
    vi.mocked(docsApi.fetchDocsCatalog).mockRejectedValue(
      new docsApi.DocsApiError("Unauthorized", 401),
    );

    render(
      <MemoryRouter>
        <DocsPage onUnauthorized={onUnauthorized} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.queryByText(/No pudimos cargar la documentación/i),
    ).not.toBeInTheDocument();
  });
});
