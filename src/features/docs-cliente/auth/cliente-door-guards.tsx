import type { ReactNode } from "react";
import { Link, Navigate } from "react-router";
import { esAuthBypassActivo } from "@/shared/auth/auth-bypass";
import { obtenerToken } from "@/shared/auth/token";
import { ClienteShell } from "../cliente-shell";
import { obtenerTokenCliente } from "./cliente-token";

/**
 * CA-C04: sesión interna (Google) no usa la puerta /cliente.
 * En bypass local sí se permite (humo de /cliente/login con admin abierto).
 */
export const BlockInternalOnClienteDoor = ({
  children,
}: {
  readonly children: ReactNode;
}) => {
  const internalToken = obtenerToken();
  const clienteToken = obtenerTokenCliente();

  if (clienteToken || !internalToken || esAuthBypassActivo()) {
    return children;
  }

  return (
    <ClienteShell>
      <div className="mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="text-2xl font-bold">Acceso solo para clientes</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Detectamos una sesión corporativa en este navegador. El acceso cliente
          es una puerta aparte: abre el enlace en una ventana privada o cierra
          la sesión interna antes de continuar.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            to="/docs"
            className="inline-flex justify-center rounded-[var(--radius-pill)] bg-[var(--color-action)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-action-contrast)]"
          >
            Ir a documentación interna
          </Link>
          <p className="text-xs text-[var(--text-muted)]">
            Tip local: con <code className="font-mono">pnpm dev</code> el bypass
            permite probar <code className="font-mono">/cliente/login</code> sin
            ventana privada.
          </p>
        </div>
      </div>
    </ClienteShell>
  );
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
