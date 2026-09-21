import { expect, test } from "@playwright/test";
import {
  dismissCookieBanner,
  mockDiagnosticoError,
  mockDiagnosticoParcial,
  mockDiagnosticoSuccess,
  mockGuiaSuccess,
} from "./helpers";

test.describe("Diagnóstico de migración", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/diagnostico");
    await dismissCookieBanner(page);
  });

  test("consulta exitosa muestra resultados", async ({ page }) => {
    await mockDiagnosticoSuccess(page);

    await page.getByPlaceholder(/20018012531/).fill("20018012531");
    await page.getByRole("button", { name: /^diagnosticar$/i }).click();

    await expect(page.getByText("Resultado del Lote")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("error de API muestra mensaje al usuario", async ({ page }) => {
    await mockDiagnosticoError(page);

    await page.getByPlaceholder(/20018012531/).fill("20018012531");
    await page.getByRole("button", { name: /^diagnosticar$/i }).click();

    await expect(page.getByRole("alert")).toContainText("Error interno en BD");
  });

  test("reintento de guía reporta éxito", async ({ page }) => {
    await mockDiagnosticoParcial(page);
    await mockGuiaSuccess(page);

    await page.getByPlaceholder(/20018012531/).fill("20018012531");
    await page.getByRole("button", { name: /^diagnosticar$/i }).click();
    await expect(page.getByText("Resultado del Lote")).toBeVisible();

    await page.getByRole("button", { name: /^reintentar$/i }).click();
    await expect(page.getByRole("button", { name: "Enviada" })).toBeVisible({
      timeout: 10_000,
    });
  });
});
