#!/usr/bin/env bash
# Publica el sitio por un **Quick Tunnel** de Cloudflare: un túnel de prueba que
# no necesita dominio propio ni configuración en el panel. Cloudflare inventa un
# hostname `*.trycloudflare.com` y lo enruta al instante.
#
#   ./scripts/tunel-rapido.sh            publicar (levanta el stack si hace falta)
#   ./scripts/tunel-rapido.sh --detener  bajar sólo el túnel de prueba
#   ./scripts/tunel-rapido.sh --url      volver a mostrar la URL vigente
#
# Es para ENSEÑARLE el sistema al cliente, no para dejarlo publicado: el enlace
# es público sin control de acceso y el hostname cambia en cada arranque. Para
# algo estable está el túnel con nombre (`OP-21` del kanban) y las políticas de
# Zero Trust.
#
# Lo que este script resuelve y a mano cuesta: la URL pública queda escrita
# DENTRO de la base en cada imagen subida, así que un hostname nuevo deja el
# catálogo con todas las fotos rotas. Acá se reescriben al vuelo.
set -euo pipefail

DIR_RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR_DOCKER="$DIR_RAIZ/docker"
ARCHIVO_ENV="$DIR_DOCKER/.env"

# shellcheck source=lib/comunes.sh
. "$DIR_RAIZ/scripts/lib/comunes.sh"
# shellcheck source=lib/entorno.sh
. "$DIR_RAIZ/scripts/lib/entorno.sh"
# shellcheck source=lib/base-datos.sh
. "$DIR_RAIZ/scripts/lib/base-datos.sh"

CONTENEDOR=barzol-tunel-rapido

cargar_entorno() {
  [ -f "$ARCHIVO_ENV" ] || fatal "Falta docker/.env. Corré primero ./scripts/desplegar-local.sh"
  set -a
  # shellcheck disable=SC1090
  . "$ARCHIVO_ENV"
  set +a
}

# Extrae el hostname que Cloudflare asignó, de los registros del contenedor.
# Cloudflare lo anuncia en un recuadro dentro del log; no hay API local para
# preguntárselo, así que leerlo de ahí es el camino previsto.
leer_url_del_log() {
  docker logs "$CONTENEDOR" 2>&1 |
    grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' |
    head -1
}

esperar_url() {
  local intentos=45 i=0 url
  while [ "$i" -lt "$intentos" ]; do
    url="$(leer_url_del_log)"
    if [ -n "$url" ]; then printf '%s' "$url"; return 0; fi

    # Si el contenedor murió, seguir esperando es esperar para siempre.
    if [ "$(docker inspect -f '{{.State.Status}}' "$CONTENEDOR" 2>/dev/null)" = "exited" ]; then
      fatal "El túnel de prueba se detuvo. Revisá: docker logs $CONTENEDOR"
    fi
    i=$((i + 1))
    sleep 2
  done
  return 1
}

publicar() {
  paso "Comprobando requisitos"
  requerir_comando docker "Instalalo antes de continuar."
  requerir_comando curl "Se usa para verificar el túnel."
  detectar_compose
  cargar_entorno
  ok "Compose disponible (${COMPOSE_CMD[*]})"

  # El stack tiene que estar arriba: el túnel apunta al proxy por nombre de
  # contenedor, dentro de la red de Docker.
  paso "Asegurando que el sistema esté levantado"
  compose up -d --remove-orphans > /dev/null 2>&1 || fatal "No se pudo levantar el sistema."
  esperar_servicio proxy 60 || fatal "El proxy no llegó a estar sano."
  esperar_servicio web 90 || aviso "El sitio tarda en responder; el túnel se publica igual."
  ok "Proxy y sitio en pie"

  # El túnel con nombre y el de prueba publican lo mismo por dos caminos. Se
  # apaga el primero para que no queden dos rutas activas a la vez y no haya
  # duda de cuál está sirviendo lo que se está viendo.
  if docker ps --format '{{.Names}}' | grep -q '^barzol-tunnel$'; then
    aviso "Deteniendo el túnel con nombre mientras dure la prueba"
    docker stop barzol-tunnel > /dev/null 2>&1 || true
  fi

  paso "Levantando el Quick Tunnel"
  # Siempre desde cero: Cloudflare asigna el hostname al conectar, así que un
  # contenedor reutilizado seguiría anunciando el anterior en su log.
  compose --profile rapido rm -sf tunel-rapido > /dev/null 2>&1 || true
  compose --profile rapido up -d tunel-rapido > /dev/null 2>&1 \
    || fatal "No se pudo arrancar el túnel de prueba."

  local url
  url="$(esperar_url)" || fatal "Cloudflare no asignó una URL en 90 s. Revisá: docker logs $CONTENEDOR"
  ok "Cloudflare asignó: $url"

  aplicar_url_publica "$url"
  verificar "$url"
  resumen "$url"
}

# Fija la URL nueva en el entorno, reapunta las imágenes ya guardadas y recrea
# el sitio para que la tome. El orden importa: si se recreara el contenedor
# antes de reescribir la base, las fotos quedarían rotas en la ventana entre
# ambos pasos.
aplicar_url_publica() {
  local nueva="${1%/}" anterior="${BARZOL_PUBLIC_URL%/}"

  if [ "$anterior" = "$nueva" ]; then
    ok "La URL pública no cambió"
    return 0
  fi

  rebasar_urls_publicas "$anterior" "$nueva"

  fijar_env BARZOL_PUBLIC_URL "$nueva"
  export BARZOL_PUBLIC_URL="$nueva"

  paso "Recreando el sitio con la URL pública nueva"
  compose up -d web > /dev/null 2>&1 || fatal "No se pudo recrear el sitio."
  esperar_servicio web 90 || aviso "El sitio tarda más de lo previsto."
  ok "Sitio sirviendo con $nueva"
}

verificar() {
  local url="$1"

  paso "Verificando por la URL pública"
  # Cloudflare tarda unos segundos en propagar el hostname recién creado.
  esperar_http "$url/" 30 > /dev/null 2>&1 || true

  local codigo
  codigo="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$url/" || echo 000)"
  [ "$codigo" = "200" ] \
    && ok "La home responde 200 desde Internet" \
    || aviso "La home devolvió HTTP $codigo por el túnel (puede tardar unos segundos más)"

  # Una imagen: es lo que delata si la reescritura de URLs funcionó.
  codigo="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
    "$url/media/placeholder/hero-0.svg" || echo 000)"
  [ "$codigo" = "200" ] \
    && ok "Las imágenes se sirven por el túnel" \
    || aviso "Una imagen devolvió HTTP $codigo — revisá BARZOL_PUBLIC_URL en docker/.env"
}

resumen() {
  local url="$1"
  printf '\n'
  printf "${C_VERDE}══ Publicado por Quick Tunnel ══${C_FIN}\n\n"
  printf "  Sitio        %s\n" "$url"
  printf "  Panel admin  %s/admin/login\n" "$url"
  printf "  Usuario      %s\n\n" "$ADMIN_USUARIO"
  printf "${C_AMBAR}  El enlace es público y sin control de acceso: cualquiera con la URL entra.${C_FIN}\n"
  printf "${C_GRIS}  El hostname cambia cada vez que se reinicia el túnel. Para algo estable,${C_FIN}\n"
  printf "${C_GRIS}  usá el túnel con nombre (ficha OP-21 del kanban) con un dominio propio.${C_FIN}\n\n"
  printf "  Detener:  ./scripts/tunel-rapido.sh --detener\n\n"
}

detener() {
  detectar_compose
  cargar_entorno
  paso "Deteniendo el túnel de prueba"
  compose --profile rapido rm -sf tunel-rapido > /dev/null 2>&1 || true
  ok "Detenido — el sitio sigue disponible en la red local"
  aviso "BARZOL_PUBLIC_URL quedó apuntando a $BARZOL_PUBLIC_URL, que ya no resuelve."
  detalle "Volvé a publicar, o poné la URL definitiva y corré ./scripts/desplegar-local.sh"
}

case "${1:-}" in
  ''|--publicar) publicar ;;
  --detener)     detener ;;
  --url)         cargar_entorno; leer_url_del_log || fatal "No hay túnel de prueba corriendo." ;;
  --ayuda|-h)    sed -n '2,14p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' ;;
  *)             fatal "Opción desconocida: $1 (probá --ayuda)" ;;
esac
