# Seguridad — Push Tracking

Complementa [seguridad-tokens-y-csp.md](../seguridad-tokens-y-csp.md).

## Modelo

| Capa | Regla |
| --- | --- |
| Browser | Solo Bearer ya existente del portal (`token_sigoo`). Sin API keys de GCP, sin password de Postgres, sin SA JSON. |
| Proxy | Añade el upstream. No reenvía body de Pub/Sub armado en el cliente. |
| `cm-push-tracking-mio` | Solo ingesta y tareas. Sin rutas de diagnóstico. |
| API de diagnóstico | Aún no existe. Endpoint nuevo o microservicio nuevo, solo lectura. |
| RBAC | `appId` propio. Ver la ruta no sustituye el 403 del API si el token no tiene audiencia. |

## Qué no mostrar

- Connection strings, topics con nombres productivos completos si el health puede decir `up`/`down` sin el resource name.
- Payload crudo de `estados-mio` (puede traer datos de remitente/destinatario). El diagnóstico devuelve checks, no el JSON de negocio completo.
- Botones de recarga Redis o limpieza.

## CSP

Igual que diagnóstico: el browser habla al mismo origen (`/push-tracking-api/`). El upstream **no** entra en `connect-src`. Solo Keycloak sigue en `connect-src`.

## Auth del MS hoy

Los POST de `cm-push-tracking-mio` son de Pub/Sub y de plataforma. No se les pone el JWT del portal para “usarlos como diagnóstico”.

La API nueva (endpoint o microservicio) valida el mismo JWT que el resto del toolbox, o queda en una red que solo alcanza el proxy. No queda pública en Internet.
