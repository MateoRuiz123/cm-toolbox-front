import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RegisterAppModal } from "../../../src/features/admin/register-app-modal";
import type { AdminAppItem } from "../../../src/features/admin/api/admin-api";

const app: AdminAppItem = {
  id: "documentacion-cliente",
  name: "Documentación de APIs",
  description:
    "Consulta la especificación OpenAPI vigente de las APIs de integración, con acceso controlado. Reemplaza el envío de archivos PDF.",
  route: "/docs",
  icon: "docs",
  tags: ["OpenAPI", "Integraciones", "Catálogo"],
  status: "active",
  displayOrder: 25,
  updatedBy: null,
  updatedAt: "2026-10-23T00:00:00.000Z",
  actions: [
    {
      actionCode: "view",
      name: "Acceder",
      description: null,
      defaultRoles: ["admin"],
    },
  ],
};

const roles = [
  {
    id: "admin",
    name: "Administrador",
    description: "Control total del portal de herramientas.",
    hierarchyLevel: 100,
    canManageApps: true,
    canManageUsers: true,
    isSystemRole: true,
    usersCount: 1,
    defaultPermissions: [],
  },
];

describe("RegisterAppModal", () => {
  it("deja el id editable solo para super-admin y renombra antes de guardar", async () => {
    const user = userEvent.setup();
    const onRenameId = vi.fn(async () => undefined);
    const onSave = vi.fn(async () => undefined);
    const order: string[] = [];
    onRenameId.mockImplementation(async () => {
      order.push("rename");
    });
    onSave.mockImplementation(async () => {
      order.push("save");
    });

    const { rerender } = render(
      <RegisterAppModal
        initialApp={app}
        roles={roles}
        canEditId={false}
        onRenameId={onRenameId}
        onSave={onSave}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByLabelText(/ID único/i)).toBeDisabled();

    rerender(
      <RegisterAppModal
        initialApp={app}
        roles={roles}
        canEditId
        onRenameId={onRenameId}
        onSave={onSave}
        onClose={() => undefined}
      />,
    );

    const idInput = screen.getByLabelText(/ID único/i);
    expect(idInput).toBeEnabled();
    await user.clear(idInput);
    await user.type(idInput, "docs");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(onRenameId).toHaveBeenCalledWith("documentacion-cliente", "docs");
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: "docs" }),
    );
    expect(order).toEqual(["rename", "save"]);
  });
});
