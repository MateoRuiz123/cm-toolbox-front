# Ambientes visuales del Hub (modo PS5)

Cada herramienta del Hub busca primero una imagen opcional en esta carpeta y la superpone suavemente sobre el degradado corporativo **SIGO Droop**:

- `diagnostico.webp` — Diagnóstico de Migración
- `logs.webp` — Visor de Logs GKE
- `backends.webp` — Mis Backends
- `docs.webp` — Documentación de APIs
- `auditoria.webp` — Auditoría de Facturación
- `default.webp` — Respaldo para nuevas herramientas registradas desde `/admin`

Mientras no existan archivos `.webp`, el Hub muestra los degradados SIGO configurados en `src/features/hub/hub-ambient-config.ts`. Al agregar imágenes reales (idealmente en WebP de 1600×900 o superior, optimizadas), se cargarán automáticamente con crossfade suave.
