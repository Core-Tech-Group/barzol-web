#!/usr/bin/env bash
# Preparación de `docker/.env`: se crea la primera vez y se completan las claves
# que falten. Se carga con `source`.
#
# Regla: este archivo NUNCA sobrescribe un valor ya presente. Un segundo
# despliegue que regenerara el secreto JWT invalidaría la sesión del admin y
# todas las claves a la vez, sin decir por qué.

# Lee una clave del archivo de entorno. Vacío si no está.
leer_env() {
  local clave="$1"
  [ -f "$ARCHIVO_ENV" ] || return 0
  sed -n "s/^${clave}=//p" "$ARCHIVO_ENV" | head -1
}

# Escribe (o reemplaza) una clave conservando el resto del archivo y sus
# comentarios.
fijar_env() {
  local clave="$1" valor="$2"
  if grep -q "^${clave}=" "$ARCHIVO_ENV"; then
    # El delimitador es | porque los valores incluyen URLs con barras.
    sed -i "s|^${clave}=.*|${clave}=${valor}|" "$ARCHIVO_ENV"
  else
    printf '%s=%s\n' "$clave" "$valor" >> "$ARCHIVO_ENV"
  fi
}

# Completa una clave sólo si está vacía, y avisa qué hizo.
completar_si_falta() {
  local clave="$1" valor="$2" descripcion="$3"
  if [ -z "$(leer_env "$clave")" ]; then
    fijar_env "$clave" "$valor"
    detalle "$descripcion"
  fi
}

preparar_entorno() {
  if [ ! -f "$ARCHIVO_ENV" ]; then
    cp "$DIR_DOCKER/env.example" "$ARCHIVO_ENV"
    chmod 600 "$ARCHIVO_ENV"
    ok "Creado docker/.env desde la plantilla"
  fi

  completar_si_falta POSTGRES_PASSWORD "$(openssl rand -hex 24)" \
    "Contraseña de PostgreSQL generada"

  # Las tres claves JWT se generan de una sola vez y sólo si falta el secreto:
  # están atadas entre sí y regenerar una sin las otras rompe el login.
  if [ -z "$(leer_env BARZOL_JWT_SECRET)" ]; then
    local salida
    salida="$(node "$DIR_RAIZ/scripts/generar-claves-jwt.mjs")" \
      || fatal "No se pudieron generar las claves JWT."

    while IFS='=' read -r clave valor; do
      [ -n "$clave" ] && fijar_env "$clave" "$valor"
    done <<< "$salida"

    detalle "Secreto JWT y claves anon/service_role generados"
  fi

  completar_si_falta ADMIN_PASSWORD "$(openssl rand -base64 12 | tr -d '/+=' | head -c 14)" \
    "Contraseña del administrador generada"

  # Exporta todo al entorno del script: compose lee el archivo por su cuenta,
  # pero base-datos.sh necesita los mismos valores acá.
  set -a
  # shellcheck disable=SC1090
  . "$ARCHIVO_ENV"
  set +a

  [ -n "$BARZOL_PUBLIC_URL" ] || fatal "BARZOL_PUBLIC_URL no puede quedar vacía."
}

# Avisa si la URL pública quedó en el valor de la plantilla. No es fatal —el
# sistema levanta igual y sirve para probar en la red local— pero sí es la causa
# número uno de "las imágenes no cargan" cuando después se enciende el túnel.
advertir_url_publica() {
  case "$BARZOL_PUBLIC_URL" in
    http://localhost:*|http://127.0.0.1:*)
      aviso "BARZOL_PUBLIC_URL sigue en '$BARZOL_PUBLIC_URL' (valor de la plantilla)."
      detalle "Sirve para probar desde esta misma máquina."
      detalle "Para el túnel, poné el hostname público en docker/.env y volvé a desplegar."
      ;;
  esac
}
