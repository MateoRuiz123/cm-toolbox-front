import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../src/app/theme-provider";
import { WelcomeLandingPage } from "../../../src/features/welcome/welcome-landing-page";
import { AccessContext } from "../../../src/shared/auth/access-context";
import { createContextValueFromProfile } from "../../../src/shared/auth/access-context-base";
import { buildFallbackAccessProfile } from "../../../src/shared/auth/access-types";

describe("WelcomeLandingPage", () => {
  it("renderiza COORDINADORA, control Sí/No de Volver a mostrar y entra al portal", async () => {
    const user = userEvent.setup();
    const updatePref = vi.fn(async () => undefined);
    const onContinue = vi.fn();

    render(
      <AccessContext.Provider
        value={createContextValueFromProfile(buildFallbackAccessProfile(), {
          showWelcomeLanding: true,
          updateWelcomeLandingPreference: updatePref,
        })}
      >
        <ThemeProvider>
          <MemoryRouter initialEntries={["/bienvenida"]}>
            <Routes>
              <Route
                path="/bienvenida"
                element={<WelcomeLandingPage onContinue={onContinue} />}
              />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </AccessContext.Provider>,
    );

    expect(
      screen.getByRole("heading", { name: /coordinadora/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("COORDINADORA")).toBeInTheDocument();

    const yesBtn = screen.getByRole("button", { name: "Sí" });
    const noBtn = screen.getByRole("button", { name: "No" });
    expect(yesBtn).toHaveAttribute("aria-pressed", "true");
    expect(noBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(noBtn);
    expect(updatePref).toHaveBeenCalledWith(false);

    await user.click(
      screen.getByRole("button", { name: /entrar al portal/i }),
    );
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
