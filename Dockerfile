FROM node@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml .npmrc* ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY src ./src
COPY public ./public
COPY env ./env
COPY .env* ./

ARG VITE_DIAGNOSTICO_URL=/migracion/diagnostico
ARG VITE_MIGRAR_GUIA_URL
ARG VITE_KEYCLOAK_ENV
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID

# El pipeline resuelve los tokens de env/azure.env contra la Azure DevOps
# Library y deja el resultado en el .env de la raíz del contexto, no en
# env/azure.env. De ahí salen los valores de runtime de nginx, porque el
# template despliega en Cloud Run sin variables de entorno.
# Se extraen solo estas dos claves: cualquier otro contenido del .env local
# de un desarrollador se descarta y no llega a la imagen final.
RUN touch runtime.env \
    && grep -E '^(DIAGNOSTICO_API_UPSTREAM|KEYCLOAK_UPSTREAM)=[^#[:space:]]' .env >> runtime.env 2>/dev/null || : \
    && cat runtime.env

RUN if [ -f env/azure.env ] && ! grep -Fq '#{' env/azure.env; then \
      cp env/azure.env .env; \
    else \
      printf '%s\n' \
        "VITE_DIAGNOSTICO_URL=${VITE_DIAGNOSTICO_URL}" \
        "VITE_MIGRAR_GUIA_URL=${VITE_MIGRAR_GUIA_URL}" \
        "VITE_KEYCLOAK_ENV=${VITE_KEYCLOAK_ENV}" \
        "VITE_KEYCLOAK_URL=${VITE_KEYCLOAK_URL}" \
        "VITE_KEYCLOAK_REALM=${VITE_KEYCLOAK_REALM}" \
        "VITE_KEYCLOAK_CLIENT_ID=${VITE_KEYCLOAK_CLIENT_ID}" \
        > .env; \
    fi

RUN pnpm build

FROM nginxinc/nginx-unprivileged@sha256:7377697a821c131a924a7105fafbe7414db4e9fcc77a6f08f776f33f141ec3f8

USER root

ENV PORT=8080
# DIAGNOSTICO_API_UPSTREAM y KEYCLOAK_UPSTREAM no se definen aquí a propósito:
# la imagen no debe traer URLs de ningún ambiente. Los resuelve
# 04-load-runtime-env.envsh y los valida 05-validate-env.sh.
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
ENV NGINX_ENVSUBST_FILTER="DIAGNOSTICO_API_UPSTREAM|KEYCLOAK_UPSTREAM|NGINX_LOCAL_RESOLVERS"

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/04-load-runtime-env.envsh /docker-entrypoint.d/04-load-runtime-env.envsh
COPY nginx/05-validate-env.sh /docker-entrypoint.d/05-validate-env.sh
COPY nginx/16-resolver-fallback.envsh /docker-entrypoint.d/16-resolver-fallback.envsh
COPY --from=build /app/runtime.env /etc/nginx/runtime.env
COPY --from=build /app/dist /usr/share/nginx/html

RUN chmod 755 /docker-entrypoint.d/04-load-runtime-env.envsh \
        /docker-entrypoint.d/05-validate-env.sh \
        /docker-entrypoint.d/16-resolver-fallback.envsh \
    && chown -R nginx:nginx /etc/nginx/templates /etc/nginx/conf.d /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:$${PORT}/healthz >/dev/null || exit 1
