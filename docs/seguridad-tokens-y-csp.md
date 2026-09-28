# Seguridad: tokens de sesión y CSP

## Decisión actual

El portal mantiene el access token corporativo (`token_sigoo`) en `localStorage`, gestionado por `@itcoordinadora/cm-sigoo-temp-ui` y Keycloak. Los tokens de reanudación de sesión Keycloak viven en `sessionStorage`. **No se migra en esta fase** a memoria exclusiva del proceso ni a cookies `HttpOnly`.

## Riesgo principal (XSS)

Un script malicioso inyectado en el origen de la aplicación podría leer `localStorage` y exfiltrar el token de acceso. La mitigación principal es:

- Content Security Policy (CSP) estricta en nginx
- Superficie de UI sin `dangerouslySetInnerHTML` innecesario
- Dependencias auditadas en CI corporativo

## Content Security Policy (nginx)

En producción, [`nginx/default.conf.template`](../nginx/default.conf.template) envía:

- `default-src 'self'`
- `script-src 'self'`
- `style-src 'self' 'unsafe-inline'` (requerido por estilos en línea de componentes)
- `connect-src 'self' ${KEYCLOAK_UPSTREAM}`
- Cabeceras complementarias: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`

Diagnóstico (`/migracion/`) y el visor (`/logs-api/`) salen del navegador al mismo origen. nginx los reenvía a `DIAGNOSTICO_API_UPSTREAM` y `LOGS_API_UPSTREAM`, que no aparecen en el CSP ni en el bundle. Keycloak sí queda en `connect-src`: el login redirige el navegador al IdP. La validación de arranque impide upstreams mal formados o un proxy recursivo.

## Condiciones para una migración futura

Un cambio a cookies `HttpOnly` o tokens solo en servidor requiere, como mínimo:

1. Backend o BFF que emita la sesión y proxee llamadas al API de diagnóstico
2. Ajuste de CSP (`connect-src`) y flujo OIDC sin exponer access token al JavaScript
3. Plan de rotación/revocation y pruebas de regresión en auth y diagnóstico
4. Coordinación con el equipo de identidad (Keycloak) y el pipeline Azure

Hasta entonces, el front asume que la confianza en el token depende de CSP, higiene XSS y permisos IAM en el API backend.
