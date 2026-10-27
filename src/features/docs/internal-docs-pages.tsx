import { useAccess } from "@/shared/auth/access-context";
import { useAuth } from "@/shared/auth/use-auth";
import { DocsPage } from "./docs-page";
import { DocsViewerPage } from "./docs-viewer-page";

/** Catálogo interno: 401 → cierra sesión corporativa (F-F). */
export const InternalDocsPage = () => {
  const { cerrarSesion } = useAuth();
  const { isSuperAdmin, canPerformAction } = useAccess();
  const canManage = isSuperAdmin || canPerformAction("docs", "manage");
  return <DocsPage canManage={canManage} onUnauthorized={cerrarSesion} />;
};

/** Visor interno: 401 → cierra sesión corporativa (F-F). */
export const InternalDocsViewerPage = () => {
  const { cerrarSesion } = useAuth();
  const { isSuperAdmin, canPerformAction } = useAccess();
  const canManage = isSuperAdmin || canPerformAction("docs", "manage");
  const canPublish = canManage || canPerformAction("docs", "publish");
  return (
    <DocsViewerPage
      canManage={canManage}
      showPublish={canPublish}
      onUnauthorized={cerrarSesion}
    />
  );
};
