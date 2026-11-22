import { expect, test } from "@playwright/test";
import { dismissCookieBanner } from "./helpers";

test.describe("Navegación del portal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);
  });

  test("hub abre la herramienta de diagnóstico", async ({ page }) => {
    await page.getByRole("link", { name: /abrir herramienta/i }).click();
    await expect(page).toHaveURL(/\/diagnostico/);
    await expect(
      page.getByRole("heading", { name: /diagnóstico de migración/i }),
    ).toBeVisible();
  });

  test("muestra 404 en rutas desconocidas", async ({ page }) => {
    await page.goto("/ruta-inexistente-e2e");
    await dismissCookieBanner(page);
    await expect(
      page.getByRole("heading", {
        name: /la página solicitada no está disponible/i,
      }),
    ).toBeVisible();
  });

  test("navega a páginas legales y contacto", async ({ page }) => {
    await page.goto("/privacidad");
    await dismissCookieBanner(page);
    await expect(
      page.getByRole("heading", {
        name: /política de privacidad y tratamiento de datos/i,
      }),
    ).toBeVisible();

    await page.goto("/terminos");
    await expect(
      page.getByRole("heading", { name: /términos y condiciones de uso/i }),
    ).toBeVisible();

    await page.goto("/contacto");
    await expect(
      page.getByRole("heading", { name: /contacto y soporte de ti/i }),
    ).toBeVisible();
  });

  test("muestra controles de apariencia sin selector de temas y permite cambiar disposición a Cuadrícula Bento", async ({
    page,
  }) => {
    await page.goto("/configuracion");
    await dismissCookieBanner(page);

    await expect(
      page.getByRole("heading", { name: /apariencia del toolbox/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/visitors|glass spatial|tema oficial activo/i),
    ).toHaveCount(0);

    const bentoRadio = page.getByRole("radio", {
      name: /cuadrícula bento clásica/i,
    });
    await bentoRadio.click();
    await expect(bentoRadio).toHaveAttribute("aria-checked", "true");
  });
});
