#!/usr/bin/env bash
# Despliegue completo del sitio en la Orange Pi: base de datos, autenticación,
# multimedia, sitio y —si hay token— el túnel de Cloudflare Zero Trust.
#
#   ./scripts/desplegar-local.sh              levantar (o actualizar) todo
#   ./scripts/desplegar-local.sh --reconstruir  forzar recompilación del sitio
#   ./scripts/desplegar-local.sh --estado        qué está corriendo
#   ./scripts/desplegar-local.sh --logs [svc]    seguir los registros
#   ./scripts/desplegar-local.sh --detener       bajar todo (los datos quedan)
#   ./scripts/desplegar-local.sh --borrar-datos  bajar Y borrar la base y el multimedia
#
# Es idempotente: correrlo dos veces no duplica el catálogo, no cambia la
# contraseña del admin y no regenera las claves. La primera vez tarda varios
# minutos porque compila el sitio dentro del contenedor.
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

ADMIN_PASSWORD_YA_EXISTIA=0

# ─── Comprobaciones previas ───────────────────────────────────────────────

verificar_requisitos() {
  requerir_comando docker "Instalalo antes de continuar."
  requerir_comando node   "Hace falta para generar las claves y el seed."
  requerir_comando curl   "Se usa para sondear los servicios."
  requerir_comando openssl "Se usa para generar contraseñas."
  detectar_compose

  docker info >/dev/null 2>&1 \
    || fatal "El demonio de Docker no responde (¿hace falta 'sudo' o arrancar el servicio?)."
}

# Un puerto ocupado por otro proyecto de esta máquina no se detecta al arrancar:
# compose falla con un error de bind a mitad del `up`, después de haber
# construido la imagen. Conviene enterarse antes.
verificar_puertos() {
  local ocupados=()
  for par in "EDGE:${PUERTO_EDGE}" "GATEWAY:${PUERTO_GATEWAY}" "DB:${PUERTO_DB}"; do
    local nombre="${par%%:*}" puerto="${par##*:}"
    # Si el puerto lo tiene tomado un contenedor NUESTRO, no es un conflicto:
    # es este mismo sistema, ya levantado.
    if ss -tln 2>/dev/null | grep -q ":${puerto} " \
       && ! docker ps --filter 'name=barzol-' --format '{{.Ports}}' | grep -q ":${puerto}->"; then
      ocupados+=("${nombre}=${puerto}")
    fi
  done

  if [ ${#ocupados[@]} -gt 0 ]; then
    fatal "Puertos ya ocupados: ${ocupados[*]}. Cambialos en docker/.env (PUERTO_*)."
  fi
}

# ─── Levantar ─────────────────────────────────────────────────────────────

perfiles_compose() {
  if [ -n "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]; then
    printf '%s' "--profile tunel"
  fi
}

levantar() {
  local reconstruir="$1"
  local -a opciones=(up -d --remove-orphans)

  [ "$reconstruir" = "si" ] && opciones+=(--build --force-recreate)

  paso "Levantando los contenedores"
  detalle "La primera vez compila el sitio dentro del contenedor: puede tardar varios minutos."

  # shellcheck disable=SC2046  # se quiere la división en palabras del perfil
  compose $(perfiles_compose) "${opciones[@]}" \
    || fatal "Falló el arranque. Revisá: ${COMPOSE_CMD[*]} -f docker/docker-compose.yml logs"
}

# ─── Verificación ─────────────────────────────────────────────────────────

# Comprueba lo que realmente importa: que un visitante anónimo pueda leer el
# catálogo. Es la prueba que distingue "los contenedores arrancaron" de "el
# sistema funciona" — y las dos caídas documentadas en el kanban anterior
# tuvieron despliegues verdes con el sitio caído.
probar_lectura_publica() {
  local respuesta
  respuesta="$(curl -sf --max-time 10 \
    -H "apikey: ${BARZOL_SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${BARZOL_SUPABASE_ANON_KEY}" \
    "http://127.0.0.1:${PUERTO_GATEWAY}/rest/v1/product?select=id&limit=1" 2>/dev/null)" || {
    aviso "El visitante anónimo no pudo leer el catálogo (RLS o PostgREST)."
    detalle "Revisá: docker logs barzol-rest"
    return 1
  }

  case "$respuesta" in
    '['*) ok "Lectura pública verificada (RLS permite el catálogo a anónimos)" ;;
    *) aviso "Respuesta inesperada de PostgREST: ${respuesta:0:120}" ; return 1 ;;
  esac
}

probar_sitio() {
  local codigo
  # Se espera antes de medir: Traefik saca al sitio de rotación mientras su
  # propio healthcheck no lo ve arriba, así que la primera petición tras un
  # arranque puede ser un 503 legítimo y pasajero.
  esperar_http "http://127.0.0.1:${PUERTO_EDGE}/" 20 || true

  codigo="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 \
    "http://127.0.0.1:${PUERTO_EDGE}/" || echo 000)"

  case "$codigo" in
    200) ok "La home responde 200 a través de Traefik" ;;
    *)   aviso "La home devolvió HTTP $codigo. Revisá: docker logs barzol-web" ; return 1 ;;
  esac
}

probar_multimedia() {
  local codigo
  codigo="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
    "http://127.0.0.1:${PUERTO_EDGE}/media/placeholder/hero-0.svg" || echo 000)"

  [ "$codigo" = "200" ] \
    && ok "El multimedia se sirve desde /media" \
    || { aviso "/media devolvió HTTP $codigo."; return 1; }
}

# ─── Resumen ──────────────────────────────────────────────────────────────

resumen() {
  local ip
  ip="$(hostname -I 2>/dev/null | awk '{print $1}')"

  printf '\n'
  printf "${C_VERDE}══ Barzol Web levantado ══${C_FIN}\n\n"
  printf "  Sitio (esta máquina)  http://127.0.0.1:%s\n" "$PUERTO_EDGE"
  [ -n "$ip" ] && printf "  Sitio (red local)     http://%s:%s\n" "$ip" "$PUERTO_EDGE"
  printf "  URL pública           %s\n" "$BARZOL_PUBLIC_URL"
  printf "  Panel admin           %s/admin/login\n" "${BARZOL_PUBLIC_URL%/}"
  printf "  Diagnóstico           http://127.0.0.1:%s/api/diagnostico\n" "$PUERTO_EDGE"
  printf "  API de datos          http://127.0.0.1:%s  (sólo desde el anfitrión)\n" "$PUERTO_GATEWAY"
  printf "  PostgreSQL            127.0.0.1:%s  (usuario postgres, base %s)\n\n" \
    "$PUERTO_DB" "${POSTGRES_DB:-barzol}"

  printf "  Usuario admin         %s\n" "$ADMIN_USUARIO"
  if [ "$ADMIN_PASSWORD_YA_EXISTIA" = "1" ]; then
    printf "  Contraseña            (sin cambios — la del primer despliegue)\n"
  else
    printf "  Contraseña            %s\n" "$ADMIN_PASSWORD"
    printf "${C_GRIS}                        guardada en docker/.env${C_FIN}\n"
  fi

  if [ -n "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]; then
    printf "\n  Túnel                 activo (contenedor barzol-tunnel)\n"
  else
    printf "\n${C_AMBAR}  Túnel                 apagado — falta CLOUDFLARE_TUNNEL_TOKEN en docker/.env${C_FIN}\n"
    printf "${C_GRIS}                        En Zero Trust, apuntá el servicio a http://proxy:8080${C_FIN}\n"
  fi
  printf '\n'
}

# ─── Acciones ─────────────────────────────────────────────────────────────

desplegar() {
  local reconstruir="$1"

  paso "Comprobando requisitos"
  verificar_requisitos
  ok "Docker y Compose disponibles (${COMPOSE_CMD[*]})"

  paso "Preparando docker/.env"
  preparar_entorno
  verificar_puertos
  advertir_url_publica

  levantar "$reconstruir"

  paso "Esperando a la base de datos y a la autenticación"
  esperar_servicio db 60   || fatal "PostgreSQL no llegó a estar sano."
  # GoTrue tiene que haber migrado antes del schema: admin_profile referencia
  # auth.users, que crean sus migraciones.
  esperar_servicio auth 90 || fatal "GoTrue no llegó a estar sano."
  ok "Base de datos y autenticación listas"

  aplicar_funciones_auth
  aplicar_schema
  recargar_postgrest
  cargar_seed
  recargar_postgrest

  paso "Esperando al sitio"
  esperar_servicio proxy 60 || aviso "El proxy tarda más de lo previsto."
  esperar_servicio web 90 || aviso "El sitio tarda más de lo previsto en responder."
  esperar_http "http://127.0.0.1:${PUERTO_EDGE}/api/diagnostico" 45 >/dev/null || true

  copiar_placeholders
  crear_admin

  paso "Verificando"
  probar_lectura_publica || true
  probar_sitio           || true
  probar_multimedia      || true

  resumen
}

detener() {
  detectar_compose
  paso "Deteniendo los contenedores (los datos se conservan)"
  compose --profile tunel down --remove-orphans
  ok "Detenido"
}

borrar_datos() {
  detectar_compose
  printf "${C_ROJO}Esto borra la base de datos Y las imágenes subidas. No se puede deshacer.${C_FIN}\n"
  read -r -p "Escribí 'borrar' para confirmar: " confirmacion
  [ "$confirmacion" = "borrar" ] || fatal "Cancelado."

  compose --profile tunel down --volumes --remove-orphans
  ok "Contenedores y volúmenes eliminados"
}

case "${1:-}" in
  ''|--desplegar)  desplegar no ;;
  --reconstruir)   desplegar si ;;
  --detener)       detener ;;
  --borrar-datos)  borrar_datos ;;
  --estado)        detectar_compose; compose --profile tunel ps ;;
  --logs)          detectar_compose; compose --profile tunel logs -f --tail 100 "${2:-}" ;;
  --ayuda|-h)      sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' ;;
  *)               fatal "Opción desconocida: $1 (probá --ayuda)" ;;
esac
