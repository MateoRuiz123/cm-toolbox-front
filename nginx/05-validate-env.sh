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

validate_optional_origin_upstream() {
  var_name="$1"
  val="$2"
  [ -n "$val" ] || return 0
  case "$val" in
    http://* | https://*) ;;
    *) fallar "${var_name} debe incluir el esquema http:// o https:// (valor: '$val')." ;;
  esac
  case "${val#*://}" in
    */*) fallar "${var_name} solo admite esquema://host[:puerto], sin path (valor: '$val')." ;;
  esac
}

validate_optional_origin_upstream "LOGS_API_UPSTREAM" "${LOGS_API_UPSTREAM:-}"
validate_optional_origin_upstream "ACCESS_API_UPSTREAM" "${ACCESS_API_UPSTREAM:-}"
validate_optional_origin_upstream "DOCS_API_UPSTREAM" "${DOCS_API_UPSTREAM:-}"

# nginx escucha en $PORT dentro de este mismo contenedor: apuntar el upstream ahí
# genera un proxy recursivo que termina en 502.
case "$upstream" in
  "http://127.0.0.1:${PORT:-8080}"* | "http://localhost:${PORT:-8080}"*)
    fallar "DIAGNOSTICO_API_UPSTREAM apunta a este mismo contenedor (puerto ${PORT:-8080}); provocaría un proxy recursivo."
    ;;
esac
