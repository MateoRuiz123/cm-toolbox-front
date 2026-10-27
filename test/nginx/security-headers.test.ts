import { describe, expect, it } from "vitest";
import template from "../../nginx/default.conf.template?raw";

describe("nginx/default.conf.template — cabeceras de seguridad", () => {
  it("limita connect-src al mismo origen y a Keycloak", () => {
    const csp = template.match(/Content-Security-Policy "([^"]+)"/)?.[1] ?? "";
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("${KEYCLOAK_UPSTREAM}");
    expect(csp).not.toContain("${DIAGNOSTICO_API_UPSTREAM}");
    expect(csp).not.toContain("${LOGS_API_UPSTREAM}");
  });

  it("proxea /migracion/ sin publicar el host del API", () => {
    expect(template).toContain("location /migracion/");
    expect(template).toContain("${DIAGNOSTICO_API_UPSTREAM}");
  });

  it("enmascara cm-logs-ms tras /logs-api con soporte WebSocket", () => {
    expect(template).toContain("location /logs-api/");
    expect(template).toContain("${LOGS_API_UPSTREAM}");
    expect(template).toContain("proxy_set_header Upgrade $http_upgrade");
    expect(template).toContain(
      "proxy_set_header Connection $connection_upgrade",
    );
  });

  it("enmascara cm-docs-ms tras /docs-api", () => {
    const csp = template.match(/Content-Security-Policy "([^"]+)"/)?.[1] ?? "";
    expect(template).toContain("location /docs-api/");
    expect(template).toContain("${DOCS_API_UPSTREAM}");
    expect(csp).not.toContain("${DOCS_API_UPSTREAM}");
  });

  it("conserva cabeceras duras complementarias", () => {
    expect(template).toContain("X-Content-Type-Options nosniff");
    expect(template).toContain("Referrer-Policy same-origin");
    expect(template).toContain("X-Frame-Options SAMEORIGIN");
  });
});
