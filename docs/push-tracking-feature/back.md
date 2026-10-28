# Push Tracking — Back de ingesta (`cm-push-tracking-mio`)

Estado del microservicio de **ingesta**. El diagnóstico del portal **no** se implementa aquí.

| Campo | Valor |
| --- | --- |
| Stack | Fastify, Inversify, Joi, Postgres `tracking_eventos`, Redis, Pub/Sub, Firestore |
| Prefijo | `PREFIX = /${DOMAIN}/${SERVICE_NAME}` |
| OpenAPI | Swagger en `${PREFIX}/docs` |
| Puerto local típico | `PORT` o `8080` |

## 1. Qué hace hoy

Recibe estados de guía MIO por Pub/Sub push, valida, persiste si no existe la combinación guía + estado + fecha, y publica a consulta. Duplicado → `200` + `status: duplicate`. Fallo al publicar no hace NACK: queda `enviado = false` y lo retoma `/reintento-notificaciones`.

## 2. Rutas registradas

Todas bajo `PREFIX`.

| Método | Path | Rol |
| --- | --- | --- |
| POST | `/estados-mio` | Push Pub/Sub → persistir estado |
| POST | `/consulta-cliente` | Resolver config / identidad cliente |
| POST | `/notifica-cliente` | Notificar al cliente |
| POST | `/reintento-notificaciones` | Reintento de no enviados |
| POST | `/recarga-redis-prefijos` | Operación de caché |
| POST | `/recarga-redis-config-clientes` | Operación de caché |
| POST | `/actualiza-config-cliente` | Mutación de config |
| GET | `/limpieza-redis-cliente` | Limpieza Redis |

Esas rutas se quedan. No se añaden `GET /health` ni `POST /diagnostico` a este proceso.

## 3. Dependencias que un diagnóstico externo podría leer

| Dependencia | Evidencia en código |
| --- | --- |
| Postgres | Repositorio de `tracking_eventos` |
| Redis | `connectRedisClient`, prefijos y config |
| Pub/Sub | `validatePubSubTopics` al arrancar |
| Firestore | `GcpFirestoreDocumentReader` (config de clientes) |

Esas cuatro son datos que el diagnóstico puede consultar. Este MS no las publica como API de portal.

## 4. Diagnóstico: fuera de este MS

Dos opciones, sin elegir todavía ([ADR-PT-006](./decisiones.md)):

| Opción | Dónde | Qué no cambia |
| --- | --- | --- |
| Endpoint nuevo | Un servicio que ya existe (no este) | `initRoutes` de push-tracking |
| Microservicio nuevo | Repo y proceso propios, solo lectura | El mismo `initRoutes` |

En ambos casos el portal habla `/push-tracking-api/health` y `/push-tracking-api/diagnostico`. El upstream no es `PREFIX` de `cm-push-tracking-mio`.

No se proxean `estados-mio` ni las tareas de recarga.

## 5. Payload de negocio (referencia, no para el portal)

`POST /estados-mio` espera envelope Pub/Sub. La guía interna es string de **11 dígitos** (`TrackingEventoSchema`). El portal reutiliza esa regla de formato en el input, no el envelope Pub/Sub.

## 6. Orden

1. Cerrar si el diagnóstico es un endpoint nuevo o un microservicio nuevo.
2. Implementarlo ahí, solo lectura (Postgres, Redis, Pub/Sub, Firestore).
3. Recién entonces proxy y UI.
4. Reintento desde el portal, si hace falta, también fuera de este MS y acotado a una guía. No reutilizar `/reintento-notificaciones`.
