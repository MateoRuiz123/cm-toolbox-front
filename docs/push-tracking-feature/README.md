# Feature: Diagnóstico Push Tracking Mío

Diseño para una herramienta del hub **del mismo tipo que Diagnóstico de migración**, apuntando a `cm-push-tracking-mio`. **Aún no hay UI ni endpoints de diagnóstico en el MS.** Este paquete es el contrato de diseño; no afirma que el código ya exista.

| Campo | Valor |
| --- | --- |
| Estado | Diseño. Sin código en el front. Dónde vive el API de diagnóstico: **sin decidir**. |
| UI futura | `cm-toolbox-front` → `src/features/push-tracking/` |
| Dominio | `cm-push-tracking-mio` (ingesta). **No** recibe rutas de diagnóstico. |
| Workspace | `/home/mateor/Escritorio/cm/push-tracking/push-tracking-mio.code-workspace` |
| Ruta MS | `/home/mateor/Escritorio/cm/push-tracking/cm-push-tracking-mio` |
| Patrón UX | `src/features/diagnostico/` |
| Prefijo MS | `/${DOMAIN}/${SERVICE_NAME}` (`PREFIX` en `src/util/Envs.ts`) |

## Orden de lectura

| # | Doc | Qué sacar |
| --- | --- | --- |
| 1 | [front.md](./front.md) | Pantallas, criterios, archivos a crear |
| 2 | [back.md](./back.md) | Qué hace el MS de ingesta y por qué el diagnóstico no va ahí |
| 3 | [contrato-http.md](./contrato-http.md) | Rutas reales del MS + contrato del portal (upstream por decidir) |
| 4 | [decisiones.md](./decisiones.md) | ADRs (proxy, no mezclar con migración) |
| 5 | [seguridad.md](./seguridad.md) | Auth, qué no exponer al browser |
| 6 | [runbook-local.md](./runbook-local.md) | Cómo levantar MS + front cuando se implemente |
| 7 | [plan.md](./plan.md) | Prompt de agente y fases (histórico de alcance) |

## Objetivo

| Modo | Entrada | Salida |
| --- | --- | --- |
| Healthcheck | Sin guía | healthy / degraded / unhealthy + checks de Postgres, Redis, Pub/Sub, Firestore |
| Operativo | `guia` (11 dígitos) | Veredicto + checks del flujo (evento, config, notificación, reintento) |

## Dónde vive el diagnóstico (abierto)

`cm-push-tracking-mio` sigue siendo solo ingesta y tareas. No se le agregan `/health` ni `/diagnostico`.

| Opción | Idea |
| --- | --- |
| Endpoint nuevo | Ruta de solo lectura en un servicio que ya existe y no es el de ingesta |
| Microservicio nuevo | Proceso aparte, solo lectura, que el portal proxea |

Hasta cerrar esa pregunta no hay UI. El front no inventa respuestas ni llama los POST del MS. Ver [ADR-PT-006](./decisiones.md).

## Qué no hacer

- No copiar el contrato de `/migracion/diagnostico`.
- No mezclar código con `src/features/diagnostico/`.
- No llamar el MS desde el browser con host absoluto ni secretos de BD/GCP.
