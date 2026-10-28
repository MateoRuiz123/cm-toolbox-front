# Contrato HTTP — Push Tracking (portal)

Dos capas: **lo que el MS expone hoy** y **lo que el portal necesita y todavía no existe**.

Prefijo real: `/${DOMAIN}/${SERVICE_NAME}`. El browser no usa ese prefijo: habla con el front en `/push-tracking-api/...` y nginx/Vite reescribe al MS.

## A. Rutas actuales (no consumir desde la UI)

Fuente: `src/infrastructure/api/routers/index.ts`.

| Método | Path MS | Por qué no va al portal |
| --- | --- | --- |
| POST | `/estados-mio` | Ingesta Pub/Sub. Mutación. |
| POST | `/consulta-cliente` | Paso interno del flujo. |
| POST | `/notifica-cliente` | Efecto hacia el cliente. |
| POST | `/reintento-notificaciones` | Reproceso global, no por una guía de un operador. |
| POST | `/recarga-redis-*`, `/actualiza-config-cliente` | Operación de plataforma. |
| GET | `/limpieza-redis-cliente` | Destructivo. |

Swagger vivo: `${PREFIX}/docs` en el proceso del MS.

### Forma de `estados-mio` (contexto)

Body: envelope Pub/Sub (`message.data` base64). Inner validado con Joi: `guia` 11 dígitos, estado, fecha, `message_id_checkpoint`. Respuesta de negocio la arma `TrackingEventosAppService.persistirEstado` (`inserted` / `duplicate` según README del MS). Payload inválido puede responder 200 registrando auditoría (`registrarPayloadInvalido`); un error no controlado se propaga.

Esto **no** es el contrato del diagnóstico.

## B. Contrato del portal (diseño)

Lo consume el front. **No** se monta en `cm-push-tracking-mio`. El upstream es el endpoint nuevo o el microservicio nuevo, cuando se elija.

### GET `/push-tracking-api/health`

| Campo | Valor |
| --- | --- |
| Upstream | Por decidir. No es `${PREFIX}/health` del MS de ingesta. |
| Auth | Bearer del portal (el proxy no deja el diagnóstico anónimo en prod) |
| Timeout cliente | 10 s |
| Mutación | Ninguna |

```json
{
  "data": {
    "status": "healthy",
    "checks": [
      { "id": "postgres", "status": "up" },
      { "id": "redis", "status": "up" },
      { "id": "pubsub", "status": "up" },
      { "id": "firestore", "status": "up" }
    ]
  }
}
```

`status`: `healthy` | `degraded` | `unhealthy`. Cada check: `up` | `down`. Sin `data` → el cliente trata la respuesta como error (igual que diagnóstico de migración).

### POST `/push-tracking-api/diagnostico`

| Campo | Valor |
| --- | --- |
| Upstream | Por decidir. Mismo servicio que el health. No es el MS de ingesta. |
| Body | `{ "guia": "12345678901" }` |
| Timeout | 30 s |
| Cancelación | `AbortSignal` |

```json
{
  "data": {
    "veredicto": "OK",
    "guia": "12345678901",
    "checks": [
      {
        "id": "evento_persistido",
        "estado": "cumple",
        "detalle": "Hay evento en tracking_eventos"
      }
    ]
  }
}
```

| Campo | Valores |
| --- | --- |
| `veredicto` | `OK` \| `PARCIAL` \| `BLOQUEADA` (mismos tres que la UI de migración, para reutilizar badge; el significado lo define el MS) |
| `checks[].estado` | `cumple` \| `no_cumple` \| `no_aplica` |

Checks mínimos a definir en el MS (nombres orientativos, no implementar en el front hasta ver el JSON real):

| id | Pregunta |
| --- | --- |
| `evento_persistido` | ¿Existe fila para la guía? |
| `config_cliente` | ¿Hay config de push resoluble? |
| `notificacion` | ¿`enviado` o pendiente? |
| `payload_invalido` | ¿Hay auditoría de rechazo reciente? |

### Errores

```json
{ "message": "Descripción" }
```

| HTTP | Cuándo |
| --- | --- |
| 400 | Guía mal formada |
| 404 | Guía sin rastro (o 200 con veredicto y checks en `no_aplica`; elegir uno en el MS y no ambos) |
| 401 / 403 | Token del portal |
| 5xx | Dependencia caída; el health debería haberlo mostrado antes |

## C. Proxy

| Entorno | Variable | Destino |
| --- | --- | --- |
| Vite | `PUSH_TRACKING_API_UPSTREAM` | `http://localhost:<PORT>` del MS, incluyendo el `PREFIX` si el rewrite no lo añade |
| nginx | la misma | runtime, no horneada en el bundle |

El path del browser es siempre `/push-tracking-api/health` y `/push-tracking-api/diagnostico`.
