#!/usr/bin/env bash
# Utilidades compartidas por los scripts de despliegue local.
#
# Existe para que `desplegar-local.sh`, `entorno.sh` y `base-datos.sh` no
# repitan el mismo registro de mensajes, la misma detección de compose ni la
# misma espera activa. Se carga con `source`, no se ejecuta.

# ─── Mensajes ─────────────────────────────────────────────────────────────
# Se apagan solos cuando la salida no es una terminal (por ejemplo al redirigir
# a un archivo de log), para no ensuciarlo con códigos de escape.
if [ -t 1 ]; then
  C_AZUL='\033[0;34m'; C_VERDE='\033[0;32m'; C_AMBAR='\033[0;33m'
  C_ROJO='\033[0;31m'; C_GRIS='\033[0;90m'; C_FIN='\033[0m'
else
  C_AZUL=''; C_VERDE=''; C_AMBAR=''; C_ROJO=''; C_GRIS=''; C_FIN=''
fi

paso()  { printf "${C_AZUL}▸ %s${C_FIN}\n" "$*"; }
ok()    { printf "${C_VERDE}  ✔ %s${C_FIN}\n" "$*"; }
aviso() { printf "${C_AMBAR}  ! %s${C_FIN}\n" "$*"; }
detalle() { printf "${C_GRIS}    %s${C_FIN}\n" "$*"; }
# Escribe en stderr y corta: cualquier fallo acá deja el sistema a medias, y
# seguir adelante sólo produce un segundo error menos informativo que el primero.
fatal() { printf "${C_ROJO}✖ %s${C_FIN}\n" "$*" >&2; exit 1; }

requerir_comando() {
  command -v "$1" >/dev/null 2>&1 || fatal "Falta el comando '$1'. $2"
}

# ─── Compose ──────────────────────────────────────────────────────────────
# Esta máquina tiene el binario `docker-compose` (v2.40.2) pero no el plugin
# `docker compose`. Otras máquinas tienen lo contrario. Se detecta en vez de
# suponer: es la diferencia entre que el script corra en cualquier lado o en una
# sola.
detectar_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
  else
    fatal "No se encontró Docker Compose (ni 'docker compose' ni 'docker-compose')."
  fi
}

# Envoltorio: siempre con el archivo del proyecto, se invoque desde donde se invoque.
compose() {
  "${COMPOSE_CMD[@]}" -f "$DIR_DOCKER/docker-compose.yml" "$@"
}

# ─── Esperas ──────────────────────────────────────────────────────────────

# Espera a que una URL responda. Devuelve 1 si se agota el tiempo, para que
# quien llama decida si eso es fatal o sólo un aviso.
esperar_http() {
  local url="$1" intentos="${2:-60}" i=0
  while [ "$i" -lt "$intentos" ]; do
    if curl -sf -o /dev/null --max-time 3 "$url"; then return 0; fi
    i=$((i + 1))
    sleep 2
  done
  return 1
}

# Espera a que compose reporte el servicio como `healthy`. Es más fiable que
# esperar un puerto: varios servicios abren el socket antes de estar listos
# (postgres acepta conexiones mientras todavía corre los scripts de init).
esperar_servicio() {
  local servicio="$1" intentos="${2:-60}" i=0 estado
  while [ "$i" -lt "$intentos" ]; do
    estado="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
      "barzol-${servicio}" 2>/dev/null || echo desconocido)"
    case "$estado" in
      healthy|running) return 0 ;;
      exited|dead) fatal "El servicio '$servicio' se detuvo. Revisá: docker logs barzol-${servicio}" ;;
    esac
    i=$((i + 1))
    sleep 2
  done
  return 1
}

# ─── Base de datos ────────────────────────────────────────────────────────
# Todo el SQL del despliegue pasa por acá: una sola forma de invocar psql, con
# ON_ERROR_STOP siempre puesto para que un fallo a mitad de un script no quede
# enterrado bajo el resto de la salida.
psql_barzol() {
  docker exec -i barzol-db psql -v ON_ERROR_STOP=1 -U postgres -d "${POSTGRES_DB:-barzol}" "$@"
}

# Consulta que devuelve un solo valor, sin encabezados ni bordes.
psql_valor() {
  psql_barzol -tAc "$1" 2>/dev/null | tr -d '[:space:]'
}
