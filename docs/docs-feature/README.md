# Feature: Documentación de APIs

Paquete de diseño técnico **detallado** (flujos paso a paso, criterios verificables, reglas, mensajes, archivos y orden de build) para que un agente implemente sin adivinar.

No usa la carpeta/plantilla formal SDD (`SPEC.md`, etc.): el contenido está en docs técnicos densos.

| | |
| --- | --- |
| UI | `cm-toolbox-front` |
| API | `cm-docs-ms` (crear) |
| Opción | **B** obligatoria |
| Opción C | Solo si [check-opcion-c.md](./check-opcion-c.md) = GO |

## Orden de lectura (agente)

| # | Doc | Qué sacar |
| --- | --- | --- |
| 1 | [front.md](./front.md) | Flujos UI, CA-F*, reglas RF-*, archivos, copy, orden build |
| 2 | [back.md](./back.md) | Flujos MS, CA-B*, reglas RB-*, capas, seed, orden build |
| 3 | [contrato-http.md](./contrato-http.md) | Paths, payloads, errores, tipos TS |
| 4 | [decisiones.md](./decisiones.md) | Defaults (Express, Scalar, local/GCS, claims MVP) |
| 5 | [seguridad.md](./seguridad.md) | AuthN/Z, enumeración, upload, CSP |
| 6 | [runbook-local.md](./runbook-local.md) | Cómo levantar y hacer humo |
| 7 | [check-opcion-c.md](./check-opcion-c.md) | Antes de codear publish |

## Prompt sugerido al agente

```text
Implementa la feature Documentación de APIs según docs/docs-feature/.
Lee el README y sigue el orden de lectura.
Implementa solo opción B.
No implementes fase C (upload) hasta que check-opcion-c.md diga GO.
Respeta criterios CA-F* y CA-B*, mensajes de copy del front, y contrato-http.md al pie de la letra.
Reutiliza patrones de hub, AuthGate, lazy routes y proxy como diagnóstico/logs.
```

## Objetivo de producto

Portal en el hub para consultar OpenAPI vigente con acceso controlado, en lugar de reenviar PDF.

## Fuera de alcance (núcleo)

- PDF por correo como fuente de verdad
- Editor WYSIWYG / crear docs desde cero
- Modificar APIs de negocio documentadas

## Estado

| Ítem | Estado |
| --- | --- |
| Diseño detallado front/back | Listo |
| Implementación | Pendiente |
| Check C | Pendiente post-B |
