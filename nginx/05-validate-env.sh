#!/bin/sh
# Valida la configuración de runtime antes de que nginx arranque. Sin esto, una
# variable ausente o mal formada se manifiesta como un 502 opaco en producción.

set -eu

fallar() {
  echo "ERROR de configuración: $1" >&2
  echo "Definela en la Azure DevOps Library del ambiente (llega al build via" >&2
  echo "env/azure.env) o como variable de entorno del contenedor. Ejemplo:" >&2
  echo "  DIAGNOSTICO_API_UPSTREAM=https://mi-api.example.com/cm-api-internos-test" >&2
  exit 1
}

upstream="${DIAGNOSTICO_API_UPSTREAM:-}"

[ -n "$upstream" ] || fallar "DIAGNOSTICO_API_UPSTREAM no está definida."

case "$upstream" in
  http://* | https://*) ;;
  *) fallar "DIAGNOSTICO_API_UPSTREAM debe incluir el esquema http:// o https:// (valor: '$upstream')." ;;
esac

case "$upstream" in
  */migracion | */migracion/)
    fallar "DIAGNOSTICO_API_UPSTREAM no debe terminar en /migracion; nginx concatena el path de la petición (valor: '$upstream')."
    ;;
esac

logs_upstream="${LOGS_API_UPSTREAM:-}"
if [ -n "$logs_upstream" ]; then
  case "$logs_upstream" in
    http://* | https://*) ;;
    *) fallar "LOGS_API_UPSTREAM debe incluir el esquema http:// o https:// (valor: '$logs_upstream')." ;;
  esac
  case "${logs_upstream#*://}" in
    */*) fallar "LOGS_API_UPSTREAM solo admite esquema://host[:puerto], sin path (valor: '$logs_upstream')." ;;
  esac
fi

docs_upstream="${DOCS_API_UPSTREAM:-}"
if [ -n "$docs_upstream" ]; then
  case "$docs_upstream" in
    http://* | https://*) ;;
    *) fallar "DOCS_API_UPSTREAM debe incluir el esquema http:// o https:// (valor: '$docs_upstream')." ;;
  esac
  case "${docs_upstream#*://}" in
    */*) fallar "DOCS_API_UPSTREAM solo admite esquema://host[:puerto], sin path (valor: '$docs_upstream')." ;;
  esac
fi

# nginx escucha en $PORT dentro de este mismo contenedor: apuntar el upstream ahí
# genera un proxy recursivo que termina en 502.
case "$upstream" in
  "http://127.0.0.1:${PORT:-8080}"* | "http://localhost:${PORT:-8080}"*)
    fallar "DIAGNOSTICO_API_UPSTREAM apunta a este mismo contenedor (puerto ${PORT:-8080}); provocaría un proxy recursivo."
    ;;
esac
