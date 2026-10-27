# Check — Opción C (publish / upload YAML)

La opción **C** añade a B:

- Endpoint `POST /v1/apis/:apiId/specs` en `cm-docs-ms`
- UI admin en el front (formulario de subida)
- Rol/claim `docs:publish`

**Estado: GO — implementado** (UI en `/docs/:apiId` + `POST /v1/apis/:apiId/specs` en `cm-docs-ms`).

**Publish es solo para internos** (claim `docs:publish` / header `X-Dev-Can-Publish` en local). La puerta `/cliente` y tokens `client:*` **nunca** publican specs; ver [auth-clientes.md](./auth-clientes.md) CA-C10.

---

## Cuándo evaluar

Cuando existan, como mínimo:

1. Catálogo `GET /v1/apis` en producción o ambiente de prueba del toolbox.
2. Visor `/docs/:apiId` mostrando al menos una spec real.
3. Usuarios internos del equipo validando la consulta (sin PDF para ese caso).

---

## Checklist go / no-go

Marcar en la fecha de revisión:

| #   | Criterio                                                                    | Sí / No |
| --- | --------------------------------------------------------------------------- | ------- |
| 1   | ¿B está estable (sin 5xx frecuentes, auth OK)?                              |         |
| 2   | ¿Sobran ≥ 2 semanas de práctica o capacidad equivalente?                    |         |
| 3   | ¿IAM/Keycloak tiene (o tendrá esta sprint) un rol `docs:publish`?           |         |
| 4   | ¿Hay dueño humano que publicará specs (no solo el practicante)?             |         |
| 5   | ¿El riesgo de publicar un OpenAPI incorrecto es aceptable (rollback claro)? |         |
| 6   | ¿CI del API documentado **no** cubre ya el publish al storage?              |         |

### Resultado

| Condición                                             | Decisión                                                          |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| Todos los #1–#5 en **Sí**, y #6 en **Sí** (no hay CI) | **GO C** — implementar upload                                     |
| #1–#5 Sí, pero #6 es **No** (CI ya publica)           | **NO-GO UI** — C de servidor opcional; priorizar documentar el CI |
| Cualquier #1–#5 en **No**                             | **NO-GO** — quedarse en B; re-evaluar después                     |

---

## Si GO C — alcance mínimo

### Back

- [ ] Validar JWT + claim publish
- [ ] Parse OpenAPI 3.x; límite 2 MiB
- [ ] Reemplazar `current` en storage; actualizar catálogo
- [ ] Tests 400/403/201

### Front

- [ ] Ruta o sección admin solo si el usuario puede publicar (el back manda; UI oculta si 403)
- [ ] Input file + feedback éxito/error
- [ ] Sin editor rich-text

### Explícitamente no en C mínimo

- Historial completo de versiones en UI
- Diff visual entre specs
- Envío de correo

---

## Si NO-GO — texto para dejar constancia

> Opción C diferida el YYYY-MM-DD. Motivo: _…_. El portal permanece en B: lectura de OpenAPI con authz. La publicación se hará por _CI / copia manual al storage / …_.

Pegar ese párrafo en el PR o en este archivo bajo “Historial”.

---

## Historial de revisiones

| Fecha       | Resultado | Notas                     |
| ----------- | --------- | ------------------------- |
| _pendiente_ | —         | Primera evaluación post-B |
