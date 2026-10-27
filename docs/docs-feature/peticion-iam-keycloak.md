# Petición a identidad — Client OIDC docs clientes

Plantilla para enviar a IAM / identidad. Sin esto, `/cliente` **no** puede ir a producción (el código del SPA y `cm-docs-ms` ya están listos).

**Referencia de diseño:** [auth-clientes.md](./auth-clientes.md) §6.

---

## Resumen

Necesitamos un **client OIDC distinto** al del Toolbox interno para que clientes externos consulten documentación OpenAPI con usuario + clave (sin Google).

| Campo               | Valor propuesto                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Client ID           | `toolbox-docs-clientes`                                                                                                         |
| Protocolo           | OpenID Connect                                                                                                                  |
| Access type         | public (SPA) + PKCE S256                                                                                                        |
| Valid redirect URIs | `https://<host-toolbox>/cliente/docs`, `https://<host-toolbox>/cliente/login`, `http://localhost:3000/cliente/*` (solo no-prod) |
| Web origins         | origen del toolbox                                                                                                              |
| IdP Google          | **Deshabilitado** en este client                                                                                                |
| Login               | Username / password (o federación no-Google acordada)                                                                           |

---

## Claims / atributos

| Necesidad         | Detalle                                                                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Audiencia docs    | Atributo de usuario (ej. `client_id` / NIT) → claim JWT (ej. `docs_audiences` o `client_id`) con valor `client:<id>` **o** solo el id (el MS antepone `client:` vía `DOCS_CLIENT_AUDIENCE_PREFIX`) |
| Publish           | Rol o claim `docs:publish` **solo** para empleados internos que suben specs (no en tokens de clientes)                                                                                             |
| Username canónico | Confirmar: ¿NIT, email u otro? Documentar para operaciones                                                                                                                                         |

---

## Flujos Keycloak a activar

1. **Execute actions / activación** — correo para establecer contraseña (la cuenta es permanente; el link puede vencer).
2. **Reset credentials** — “¿Olvidaste tu contraseña?” desde `/cliente/login`.
3. TTL access token alineado al portal interno (salvo decisión contraria).

---

## Qué debe poder validar `cm-docs-ms`

| Variable                      | Ejemplo                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `AUTH_MODE`                   | `keycloak`                                                                     |
| `KEYCLOAK_ISSUER`             | `https://auth.coordinadora.com/realms/coordinadora`                            |
| `KEYCLOAK_AUDIENCE`           | `cm-diagnostico-despachos-front,toolbox-docs-clientes` (lista comma-separated) |
| `DOCS_CLIENT_AUDIENCE_CLAIM`  | nombre exacto del claim acordado                                               |
| `DOCS_CLIENT_AUDIENCE_PREFIX` | `client:` (default)                                                            |
| `DOCS_PUBLISH_CLAIM`          | `docs:publish`                                                                 |

---

## Qué debe configurar el front

| Variable                                    | Valor                                     |
| ------------------------------------------- | ----------------------------------------- |
| `VITE_KEYCLOAK_CLIENT_ID_CLIENTES`          | `toolbox-docs-clientes` (mismo client ID) |
| `VITE_KEYCLOAK_URL` / `VITE_KEYCLOAK_REALM` | mismos del realm corporativo              |

---

## Criterios de aceptación para IAM (smoke)

1. Login en `/cliente/login` sin botón Google.
2. Token con claim de audiencia cliente; `GET /v1/apis` solo APIs `client:<id>`.
3. Token cliente **no** lista APIs `internal` ni de otro `client:*`.
4. Reset password por correo funciona.
5. Token interno (Google / client toolbox) sigue funcionando en `/docs`.

---

## Contacto / entrega

- Equipo: IAM / identidad
- Consumidor: Toolbox (`cm-toolbox-front` + `cm-docs-ms`)
- Cuando esté listo: avisar client ID definitivo, nombre del claim y audiences JWT para rellenar env de cada ambiente.
