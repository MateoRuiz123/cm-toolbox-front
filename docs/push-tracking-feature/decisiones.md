# Decisiones — Push Tracking en el toolbox

## ADR-PT-001 — Herramienta distinta de migración

El diagnóstico de guías MIO no reutiliza `src/features/diagnostico/` ni `/migracion/*`. Misma idea de UX (formulario + checks), otro dominio, otro upstream, otro `appId` RBAC.

## ADR-PT-002 — No proxear los POST de negocio

`estados-mio`, `notifica-cliente`, recargas Redis y limpieza no se exponen al browser. El portal solo habla health y diagnóstico de lectura. Motivo: esos POST mutan tracking, caché o notifican clientes.

## ADR-PT-003 — Same-origin

El front llama `/push-tracking-api/*`. Vite y nginx reenvían a `PUSH_TRACKING_API_UPSTREAM`. Sin host de GCP en el bundle y sin CORS.

## ADR-PT-004 — Reintento no es el de migración ni el global del MS

`POST /migracion/guia` emula Pub/Sub de **migración**. `POST /reintento-notificaciones` del MS reprocesa pendientes **sin filtro de una guía de operador**.

Si más adelante hay reintento en la UI, será un endpoint nuevo del MS, autenticado, limitado a una guía, con permiso `retry`. Hasta entonces la UI no tiene ese botón.

## ADR-PT-005 — Contrato propuesto ≠ contrato vigente

[contrato-http.md](./contrato-http.md) sección B es diseño. Si el MS publica otro JSON, gana el MS: se actualiza este doc y los tipos. No se adapta el MS al ejemplo del markdown sin acuerdo.

## ADR-PT-006 — El diagnóstico no entra en `cm-push-tracking-mio`

Ese proceso no gana rutas de health ni de diagnóstico. Sigue con ingesta Pub/Sub y tareas.

Queda **abierto** dónde vive la API que el portal va a proxear:

| Opción | Cuándo tendría sentido |
| --- | --- |
| Endpoint nuevo | Ya hay un servicio de lectura o BFF que puede consultar tracking sin mezclar el ciclo de push |
| Microservicio nuevo | Hace falta un despliegue, un contrato y un ciclo de vida distintos del de ingesta |

No se elige aquí. Sin esa pieza no se mergea la página del hub.

## ADR-PT-007 — Workspace del MS

La fuente de verdad del back es el repo abierto en `push-tracking-mio.code-workspace` (`cm-push-tracking-mio`), no una copia dentro de `cm-toolbox-front`.
