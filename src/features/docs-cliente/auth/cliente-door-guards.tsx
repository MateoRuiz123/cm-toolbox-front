import type { ReactNode } from "react";
import { Link, Navigate } from "react-router";
import { obtenerToken } from "@/shared/auth/token";
import { ClienteShell } from "../cliente-shell";
import { obtenerTokenCliente } from "./cliente-token";

/**
 * CA-C04: sesión interna (Google) no usa la puerta /cliente.
 * En bypass local no hay token_sigoo → se permite /cliente/login (Entrar dev).
 */
export const BlockInternalOnClienteDoor = ({
  children,
}: {
  readonly children: ReactNode;
}) => {
  const internalToken = obtenerToken();
  const clienteToken = obtenerTokenCliente();

  if (internalToken && !clienteToken) {
    return (
      <ClienteShell>
        <div className="mx-auto flex max-w-md flex-col px-4 py-16">
          <h1 className="text-2xl font-bold">Acceso solo para clientes</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Este acceso es solo para clientes. Usa el portal interno con tu
            cuenta corporativa.
          </p>
          <Link
            to="/docs"
            className="mt-8 inline-flex justify-center rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-action-contrast)]"
          >
            Ir a documentación interna
          </Link>
        </div>
      </ClienteShell>
    );
  }

  return children;
};

/** CA-C04: token de cliente en rutas del hub → solo /cliente/docs. */
export const RedirectClienteAwayFromHub = ({
  children,
}: {
  readonly children: ReactNode;
}) => {
  if (obtenerTokenCliente()) {
    return <Navigate to="/cliente/docs" replace />;
  }
  return children;
};
