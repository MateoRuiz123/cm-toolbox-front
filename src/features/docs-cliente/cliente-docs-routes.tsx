import { useCallback, useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router";
import { DocsPage } from "../docs/docs-page";
import { DocsViewerPage } from "../docs/docs-viewer-page";
import {
  resetDocsAuthTokenProvider,
  setDocsAuthTokenProvider,
} from "../docs/api/token-provider";
import { ClienteAuthGate } from "./auth/cliente-auth-gate";
import { logoutCliente } from "./auth/cliente-session";
import { obtenerTokenCliente } from "./auth/cliente-token";
import { ClienteShell } from "./cliente-shell";

export const ClienteDocsRoutes = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setDocsAuthTokenProvider(obtenerTokenCliente);
    return () => {
      resetDocsAuthTokenProvider();
    };
  }, []);

  const handleLogout = useCallback(() => {
    resetDocsAuthTokenProvider();
    void logoutCliente().then(() => {
      navigate("/cliente/login", { replace: true });
    });
  }, [navigate]);

  /** C-G / RF-13: 401 del MS → login cliente, nunca Google. */
  const handleUnauthorized = handleLogout;

  return (
    <ClienteAuthGate>
      <ClienteShell onLogout={handleLogout}>
        <Routes>
          <Route
            path="/cliente/docs"
            element={
              <DocsPage
                basePath="/cliente/docs"
                onUnauthorized={handleUnauthorized}
              />
            }
          />
          <Route
            path="/cliente/docs/:apiId"
            element={
              <DocsViewerPage
                basePath="/cliente/docs"
                showPublish={false}
                onUnauthorized={handleUnauthorized}
              />
            }
          />
          <Route path="*" element={<Navigate to="/cliente/docs" replace />} />
        </Routes>
      </ClienteShell>
    </ClienteAuthGate>
  );
};
