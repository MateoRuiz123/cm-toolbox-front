# Plan / Prompt — Diagnóstico de Push Tracking Mío (toolbox)

Documento para ejecutar **después** de terminar (o avanzar) el trabajo en
`/home/mateor/Escritorio/cm/push-tracking/cm-push-tracking-mio`.

Objetivo del producto: una **feature nueva** en el toolbox (distinta de `/diagnostico` de migración) que combine:

| Modo        | Entrada                                                     | Salida esperada                                                                  |
| ----------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Healthcheck | Sin identificador de negocio (acción “estado del servicio”) | `healthy` / `degraded` / `unhealthy` (o equivalente) + checklist de dependencias |
| Operativo   | Por `guia` (y cualquier otro id que el MS exponga)          | Veredicto + checks del flujo push-tracking                                       |

Este plan **no asume** el contrato final del microservicio. Antes de implementar hay que **descubrir** lo que exista en ese momento (incluyendo endpoints, DTOs y checks añadidos después de la fecha de este documento).

---

## Cuándo usar este documento

1. Ya hay (o se acaba de mergear) health y/o diagnóstico en `cm-push-tracking-mio`, **o**
2. Quieres que el agente compare el estado actual del MS contra este plan y complete front (+ proxy/back del portal si aplica).

Copiar la sección [Prompt para el agente](#prompt-para-el-agente) en una sesión nueva (modo Agent / `/sdd` + `/sdd-build` según complejidad).

---

## Repos involucrados

| Repo                   | Rol                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `cm-push-tracking-mio` | Fuente de verdad del health + diagnóstico operativo (endpoints, contratos, checks)                                               |
| `cm-toolbox-front`     | UI de la feature, cliente HTTP, hub, proxy Vite/nginx, tests                                                                     |
| `cm-api-internos`      | Solo si el diseño elige BFF/proxy en el portal (patrón de migración). No obligatorio si el toolbox habla directo al MS vía proxy |

Rutas locales de referencia (ajustar si el workspace cambia):

- Front: `/home/mateor/Escritorio/local/cm-toolbox-front`
- MS: `/home/mateor/Escritorio/cm/push-tracking/cm-push-tracking-mio`
- API portal (patrón): `/home/mateor/Escritorio/cm/MIGRACION - api_internos/cm-api-internos`

---

## Fase 0 — Descubrimiento obligatorio (no saltar)

Antes de escribir código en el front, el agente **debe** analizar el estado **actual** de `cm-push-tracking-mio` y documentar hallazgos en una tabla. Usar graphify si el repo lo tiene (`graphify update .` → `graphify query` / `explain`).

### Checklist de descubrimiento

1. **Endpoints HTTP** registrados (Fastify / routers / `initRoutes`):
   - ¿Existe health? (`/health`, `/health/live`, bajo `PREFIX`, etc.)
   - ¿Existe diagnóstico operativo? path, método, body, query
   - ¿Hay endpoints nuevos no listados en este documento? **Incluirlos.**
2. **Contrato de respuesta**:
   - Shape JSON (envelope `data` vs body plano)
   - Códigos HTTP (200 / 503 / 4xx)
   - Enums de veredicto y estados de check
3. **Dependencias sondeadas en health** (Postgres, Redis, Pub/Sub, Firestore, HTTP externos, etc.): listar las que existan **hoy**.
4. **Checks del diagnóstico operativo**: listar los que existan **hoy** (evento, rango, config push, notificación, auditoría, etc.).
5. **Auth**: ¿público, API key, JWT Keycloak, IAP, mTLS?
6. **Prefijo de ruta**: `DOMAIN` / `SERVICE_NAME` / `PREFIX` reales del entorno.
7. **Docs/specs del MS**: `specs/`, `docs/`, OpenAPI, README — priorizar contratos documentados sobre código muerto.
8. **Cambios respecto a la baseline histórica** (baseline al redactar este plan):
   - Solo POSTs de negocio: `estados-mio`, `consulta-cliente`, `notifica-cliente`
   - Sin health ni diagnóstico en `src/`
   - Cualquier cosa nueva = input del diseño front

### Entregable de Fase 0 (obligatorio antes de implementar)

```markdown
## Hallazgos push-tracking (fecha)

| Ítem                   | Valor encontrado | Evidencia (archivo/ruta) |
| ---------------------- | ---------------- | ------------------------ |
| Health path            | …                | …                        |
| Diagnóstico path       | …                | …                        |
| Auth                   | …                | …                        |
| Shape health           | …                | …                        |
| Shape operativo        | …                | …                        |
| Checks health          | …                | …                        |
| Checks operativos      | …                | …                        |
| Novedades no previstas | …                | …                        |
| Gaps (falta en MS)     | …                | …                        |
```

Si faltan endpoints en el MS: **parar la UI**, listar el gap y proponer contrato mínimo; no inventar APIs en el front.

---

## Fase 1 — Decisiones de integración

Tras Fase 0, elegir **una** opción y justificarla con evidencia:

| Opción                      | Cuándo                                                                   | Implicación en toolbox                                     |
| --------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| **A — Proxy directo al MS** | El MS expone health + diagnóstico consumibles desde el portal            | Proxy Vite/nginx + paths same-origin (como `/migracion/*`) |
| **B — BFF en api-internos** | Se necesita orquestación, auth corporativa o no exponer el MS al browser | Endpoints en portal + proxy del front a esos paths         |
| **C — Híbrido**             | Health en un sitio y operativo en otro                                   | Documentar ambos paths en `docs/` del front                |

Reglas:

- Preferir same-origin + proxy (evitar CORS y secretos en el browser).
- No hardcodear hosts productivos en el cliente; usar paths relativos + env de upstream en Vite/nginx/compose.
- Si el MS añadió campos/checks nuevos, tiparlos y mostrarlos; no truncar el contrato.

---

## Fase 2 — Implementación en `cm-toolbox-front`

Referencia de patrón (no copiar dominio de migración):

| Referencia        | Path                                                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Feature existente | `src/features/diagnostico/`                                                                                                        |
| Contrato doc      | `docs/diagnostico-api-contrato.md`                                                                                                 |
| Hub               | `src/features/hub/hub-page.tsx`                                                                                                    |
| Rutas lazy        | `src/app/app.tsx`                                                                                                                  |
| Env/proxy         | `src/shared/lib/env.ts`, `vite.config.ts`, `nginx/default.conf.template`                                                           |
| Reglas            | `.cursor/rules/arquitectura-toolbox.mdc`, `diseno-coordinadora-sigo.mdc`, `smoothui-complementos.mdc`, `versionamiento-semver.mdc` |

### Alcance mínimo de la feature

1. Carpeta `src/features/<nombre>/` (nombre sugerido: `push-tracking` o `diagnostico-push-tracking`; decidir en Fase 0 según naming del MS).
2. Cliente API tipado (Zod o tipos alineados al contrato descubierto).
3. UI con **dos modos** en la misma página o pestañas claras:
   - Health: botón → checklist dependencias + estado global
   - Operativo: input `guia` (+ extras si el MS los pide) → veredicto + checks
4. Estados: loading, error de red/API, vacío inicial.
5. Ruta `lazy` + entrada en Hub (`estado="disponible"` cuando esté lista).
6. `SmoothTitleAccent` en h1 (`accessibleTitle` estable para tests); CTA hub con `SmoothLinkScramble` si aplica.
7. SIGO Droop: solo tokens `var(--…)`; sin paletas ajenas.
8. Tests unitarios espejo en `test/features/<nombre>/` + E2E si hay patrón (`e2e/`).
9. Documento de contrato en `docs/` (espejo de `diagnostico-api-contrato.md`) **basado en hallazgos Fase 0**, no en este plan.
10. Bump SemVer en `package.json` + `sonar-project.properties` solo si hay cambio de producto (feat → MINOR).

### Fuera de alcance (salvo que Fase 0 lo exija)

- Reescribir la feature de migración (`/diagnostico`).
- Lógica de negocio de push dentro del front (solo presentación + llamadas).
- Cambiar el MS desde el front sin acuerdo; si hace falta cambio en el MS, listarlo como dependencia bloqueante.

---

## Fase 3 — Validación

| Check         | Criterio                                                                  |
| ------------- | ------------------------------------------------------------------------- |
| Health UI     | Muestra estado global y cada dependencia del contrato actual              |
| Operativo UI  | Con guía válida/ inválida / sin datos muestra veredicto y checks          |
| Novedades     | Campos/checks nuevos del MS visibles o degradación controlada documentada |
| Auth          | No se loguean tokens; headers según hallazgo Fase 0                       |
| Lint/test     | `pnpm lint` y `pnpm test` (o yarn si pnpm falla) en verde para la feature |
| Accesibilidad | Headings con `accessibleTitle`; controles con labels                      |

---

## Prompt para el agente

Copiar desde aquí:

```text
Actúa como Senior Full Stack del toolbox de Coordinadora. Trabaja en Agent mode.

CONTEXTO
- Front del portal: /home/mateor/Escritorio/local/cm-toolbox-front
- Microservicio a diagnosticar: /home/mateor/Escritorio/cm/push-tracking/cm-push-tracking-mio
- Patrón de referencia (migración, NO mezclar dominio): feature src/features/diagnostico/, docs/diagnostico-api-contrato.md, proxy /migracion → DIAGNOSTICO_API_UPSTREAM
- Plan fuente: docs/plan-diagnostico-push-tracking.md (léelo completo)

OBJETIVO
Crear una FEATURE NUEVA en el toolbox (ruta y carpeta propias, distinta de /diagnostico) para diagnosticar cm-push-tracking-mio en DOS modos:
1) Healthcheck del servicio y dependencias
2) Diagnóstico operativo (por guía u otros ids que el MS exponga)

FASE 0 — OBLIGATORIA (ANTES DE CODIFICAR)
1. Refresca y consulta graphify en ambos repos si aplica.
2. Analiza el estado ACTUAL de cm-push-tracking-mio (código, routes, specs, docs). NO asumas el contrato de este plan: puede haber endpoints, DTOs, checks, auth o prefijos NUEVOS.
3. Entrega la tabla de hallazgos del plan (health path, diagnóstico path, auth, shapes, checks, novedades, gaps).
4. Si faltan endpoints de health u operativo en el MS: DETENTE, documenta el gap y propone contrato mínimo. No inventes APIs en el front.
5. Elige opción de integración A (proxy al MS), B (BFF api-internos) o C (híbrido) con justificación breve.

FASE 1 — DISEÑO CORTO
- Nombre de feature, ruta UI, paths same-origin, variables de upstream.
- Tipos TypeScript/Zod alineados al contrato descubierto (incluyendo campos nuevos).
- Wireframe mental: health + operativo en la misma página (tabs o secciones), SIGO Droop, SmoothTitleAccent.

FASE 2 — IMPLEMENTACIÓN (solo si Fase 0 no tiene gaps bloqueantes)
En cm-toolbox-front:
- src/features/<nombre>/ (page, api, components)
- lazy route en app.tsx + Suspense
- entrada Hub disponible + SmoothLinkScramble en CTA
- proxy Vite/nginx/compose según opción elegida
- docs/contrato-*.md del contrato real
- tests en test/features/<nombre>/ (+ e2e si aplica)
- bump SemVer feat (MINOR) en package.json y sonar-project.properties

REGLAS
- No modificar la feature de migración salvo necesidad de shared real (y solo si una segunda feature lo exige).
- Tokens SIGO; sin hex arbitrarios.
- No loguear tokens ni PII.
- pnpm primero; yarn si pnpm falla.
- Español en commits si el usuario pide commit.
- Si aparece algo en el MS no previsto aquí: incorpóralo al análisis y a la UI/contrato; no lo ignores.

CRITERIOS DE ACEPTACIÓN
- CA1: Puedo ver el health del servicio con checklist de dependencias reales del MS.
- CA2: Puedo diagnosticar por guía (u id oficial) y ver veredicto + checks reales del MS.
- CA3: La feature es navegable desde el Hub y no rompe /diagnostico de migración.
- CA4: Tests cubren cliente API y render básico de estados (loading/error/éxito).
- CA5: El documento de contrato en docs/ refleja el MS actual, no un invento.

Al terminar: resume hallazgos Fase 0, decisión A/B/C, archivos tocados y cómo probar en local.
```

---

## Baseline histórica (solo contexto; puede estar obsoleta)

Estado observado al crear este plan (usar solo como contraste en Fase 0):

| Área                        | Baseline                                                                |
| --------------------------- | ----------------------------------------------------------------------- |
| MS endpoints                | `POST …/estados-mio`, `…/consulta-cliente`, `…/notifica-cliente`        |
| MS health/diagnóstico       | No presentes en `src/`                                                  |
| Toolbox diagnóstico         | Solo migración AGW→CM en `/diagnostico` → `POST /migracion/diagnostico` |
| Toolbox versión al redactar | Ver `package.json` actual (no fijar aquí)                               |

Cualquier divergencia respecto a esta tabla **manda** sobre el texto del plan.

---

## Relación con SDD

Si el cambio toca contratos públicos, varios repos o UI+proxy+tests amplios, preferir:

1. `/sdd` — spec con CAs health + operativo
2. Aprobación `APROBADO`
3. `/sdd-build` — implementación
4. `/sdd-test` — certificación E2E

Este markdown sirve como input de contexto / prompt; no sustituye el ciclo SDD cuando la gobernanza del equipo lo exija.
