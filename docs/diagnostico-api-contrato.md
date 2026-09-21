# Contrato manual — API de diagnóstico de migración

Este documento describe el contrato HTTP que consume el front en `src/features/diagnostico/api/`. No existe OpenAPI validado en el repositorio; los tipos viven en `types.ts` y las pruebas en `test/features/diagnostico/api/diagnostico-api.test.ts` y `test/fixtures/diagnostico.ts`.

## POST diagnóstico

| Campo | Valor |
| ----- | ----- |
| URL | `VITE_DIAGNOSTICO_URL` (ej. `.../migracion/diagnostico`) |
| Método | `POST` |
| Headers | `Content-Type: application/json` |
| Timeout cliente | 120 s |
| Cancelación | `AbortSignal` externo combinado con timeout interno |

### Cuerpo de la petición (`DiagnosticoInput`)

```json
{
  "codigos_remision": ["20018012531"],
  "codigos_despacho": [56727471]
}
```

### Respuesta exitosa (HTTP 200)

Envelope con datos en `data`:

```json
{
  "data": {
    "veredicto": "OK",
    "items": []
  }
}
```

El cliente rechaza respuestas 200 sin `data` con el mensaje «El API respondió sin datos de diagnóstico.»

### Respuesta de error (HTTP 4xx/5xx)

```json
{
  "message": "Descripción del error"
}
```

Si falta `message`, el cliente usa un mensaje genérico.

## POST reintento de guía (emulación Pub/Sub)

| Campo | Valor |
| ----- | ----- |
| URL | `VITE_MIGRAR_GUIA_URL` o derivada reemplazando `/diagnostico` por `/guia` |
| Método | `POST` |
| Timeout cliente | 30 s |

### Cuerpo de la petición

Objeto con `message.data` en base64 (JSON `{ "codigo_remision": "<código>" }`) y `subscription` (default o `VITE_PUBSUB_SUBSCRIPTION`).

### Respuesta considerada éxito

HTTP 200 y `state !== false`. El cuerpo puede incluir `message` y `state`.

## Tipos de dominio

Ver `DiagnosticoOutput`, `ItemDiagnostico`, `GuiaDiagnostico`, `CheckResultado` y veredictos en `src/features/diagnostico/api/types.ts`.
