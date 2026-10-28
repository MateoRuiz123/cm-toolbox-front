# Runbook local — Push Tracking

La UI **no está construida**. Primero se decide si el diagnóstico es un endpoint nuevo o un microservicio nuevo. No se despliega dentro de `cm-push-tracking-mio`.

## 1. MS

Workspace: `/home/mateor/Escritorio/cm/push-tracking/push-tracking-mio.code-workspace`.

```bash
cd /home/mateor/Escritorio/cm/push-tracking/cm-push-tracking-mio
pnpm install
pnpm test
pnpm dev
```

Variables: ver README del MS (`DOMAIN`, `SERVICE_NAME`, `PORT`, Postgres, Redis, GCP). No copies secretos a este markdown ni al `.env` del front.

Ese proceso no tiene `/health` de portal. No lo busques ahí.

Cuando exista la API de diagnóstico (el otro endpoint o el otro MS), comprobar su health en el puerto de **ese** servicio, no en el `PREFIX` de ingesta. Si aún no existe, parar: el front no tiene nada que pintar.

## 2. Front

En `.env` del toolbox (no commitear):

```bash
PUSH_TRACKING_API_UPSTREAM=http://localhost:8080
```

Ajustar puerto y, si el proxy no añade `PREFIX`, el upstream debe incluir `/<DOMAIN>/<SERVICE_NAME>`.

```bash
cd /home/mateor/Escritorio/local/cm-toolbox-front
pnpm dev:front
```

`pnpm dev` del front levanta access/docs/logs, **no** este MS. Hay que tener el proceso de `cm-push-tracking-mio` aparte.

## 3. Permiso

Seed de app en `cm-toolbox-access-ms` (id distinto de `diagnostico`) y usuario con acceso. Sin fila en access, el hub no debe ofrecer la tarjeta.

## 4. Humo

| Paso | Esperado |
| --- | --- |
| Abrir `/push-tracking` sin permiso | Guard / hub sin acceso |
| Con permiso, sin MS | Error de red, no veredicto falso |
| Health 200 | Badge + 4 checks |
| Guía `abc` | Mensaje de 11 dígitos, cero POST |
| Guía válida | Checks del JSON real |
| Network tab | Solo `/push-tracking-api/health` y `.../diagnostico` |

## 5. Qué no probar desde el portal

`estados-mio`, `notifica-cliente`, recargas y limpieza Redis. Esos se prueban en el repo del MS (Jest / curl con envelope Pub/Sub), no desde el hub.
