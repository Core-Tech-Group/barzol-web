#!/usr/bin/env bash
# Puesta a punto de la base local: schema, catálogo de prueba y usuario
# administrador. Se carga con `source`.
#
# Estos tres pasos no pueden vivir en docker-compose porque dependen de un orden
# que compose no sabe expresar: `admin_profile` referencia `auth.users(id)`, y
# esa tabla la crea GoTrue con sus propias migraciones al arrancar. El schema,
# por lo tanto, va DESPUÉS de que el servicio de autenticación esté sano.
#
# Los tres son idempotentes: un segundo despliegue no duplica nada ni pisa datos
# que el cliente haya cargado desde el panel.

# Redefine auth.uid() / auth.role() DESPUÉS de que GoTrue haya migrado.
#
# GoTrue crea su propia versión, que sólo lee la forma antigua de los claims y
# devolvería NULL con la configuración de PostgREST que usa este despliegue —
# dejando al admin logueado sin poder escribir nada. El porqué completo está en
# el encabezado del archivo SQL.
#
# Se aplica en cada despliegue y no una sola vez: es idempotente (CREATE OR
# REPLACE) y así una actualización de la imagen de GoTrue, que volvería a
# imponer su versión al migrar, queda corregida en el siguiente arranque.
aplicar_funciones_auth() {
  paso "Alineando las funciones auth.*() con PostgREST"
  psql_barzol < "$DIR_DOCKER/db/funciones-auth.sql" > /dev/null \
    || fatal "No se pudieron aplicar las funciones auth.*(). Revisá: docker logs barzol-db"

  ok "auth.uid() lee las dos formas de claims (RLS operativa)"
}

# ¿Ya está el schema de la aplicación?
schema_aplicado() {
  [ "$(psql_valor "SELECT to_regclass('public.product') IS NOT NULL")" = "t" ]
}

aplicar_schema() {
  if schema_aplicado; then
    ok "Schema ya aplicado (se conserva)"
    return 0
  fi

  paso "Aplicando supabase/schema.sql (tablas, triggers y RLS)"
  psql_barzol < "$DIR_RAIZ/supabase/schema.sql" > /dev/null \
    || fatal "Falló la aplicación del schema. Revisá: docker logs barzol-db"

  ok "Schema aplicado — 13 tablas y 10 políticas de RLS"
}

cargar_seed() {
  local filas
  filas="$(psql_valor 'SELECT count(*) FROM product')"

  if [ "${filas:-0}" != "0" ]; then
    ok "El catálogo ya tiene $filas productos (no se recarga)"
    return 0
  fi

  paso "Generando y cargando el catálogo de prueba"
  node "$DIR_RAIZ/scripts/generar-seed-sql.mjs" "$DIR_DOCKER/generado" > /dev/null \
    || fatal "No se pudo generar el seed SQL."

  # La base pública se inyecta acá y no en el generador: así el mismo SQL sirve
  # para localhost y para el dominio del túnel, y se ve en el archivo generado
  # qué se sustituyó.
  sed "s|%%BASE_PUBLICA%%|${BARZOL_PUBLIC_URL%/}|g" "$DIR_DOCKER/generado/seed.sql" \
    | psql_barzol > /dev/null \
    || fatal "Falló la carga del catálogo de prueba."

  ok "Catálogo cargado: $(psql_valor 'SELECT count(*) FROM product') productos, \
$(psql_valor 'SELECT count(*) FROM category') categorías"
}

# Copia los SVG de relleno al volumen de multimedia. Van al mismo lugar donde
# `mediaDriver.node.ts` escribe las subidas reales, así que los entrega la misma
# ruta `/media/*` de la aplicación y no hace falta un caso especial.
copiar_placeholders() {
  local origen="$DIR_DOCKER/generado/placeholder"
  [ -d "$origen" ] || return 0

  docker exec barzol-web mkdir -p /data/media/placeholder 2>/dev/null || true
  docker cp "$origen/." barzol-web:/data/media/placeholder/ >/dev/null 2>&1 \
    || aviso "No se pudieron copiar las imágenes de relleno al volumen."

  # `docker cp` escribe como root. El sitio corre como `node`, y desde que la
  # entrega de /media dejó de hacerla nginx (que era root) y la hace la propia
  # aplicación, el dueño importa: sin esto los archivos podrían quedar
  # ilegibles para quien tiene que servirlos.
  docker exec -u root barzol-web chown -R node:node /data/media/placeholder \
    >/dev/null 2>&1 || true
}

# Recarga la caché de esquema de PostgREST. Sin esto, PostgREST sigue creyendo
# que la base está vacía y responde 404 a cada tabla — el sitio levanta pero no
# muestra un solo producto.
recargar_postgrest() {
  psql_valor 'SELECT public.recargar_esquema_postgrest()' > /dev/null 2>&1 || true
}

# Alta del administrador.
#
# Va por la API de GoTrue y no por un INSERT en `auth.users`: la contraseña se
# guarda con el hash y los campos internos que GoTrue espera, y replicar eso a
# mano es la clase de detalle que funciona hasta que una actualización cambia el
# formato.
crear_admin() {
  local email="${ADMIN_USUARIO}@barzol.internal"
  local id

  id="$(psql_valor "SELECT id FROM auth.users WHERE email = '${email}' LIMIT 1")"

  if [ -z "$id" ]; then
    paso "Dando de alta al administrador '${ADMIN_USUARIO}'"

    # `email_confirm: true` porque barzol.internal no existe ni recibe correo:
    # sin esto el usuario queda creado pero sin confirmar, y el login devuelve
    # "Email not confirmed" sin que haya forma de confirmarlo.
    curl -sf -X POST "http://127.0.0.1:${PUERTO_GATEWAY}/auth/v1/admin/users" \
      -H "Authorization: Bearer ${BARZOL_SERVICE_ROLE_KEY}" \
      -H "apikey: ${BARZOL_SERVICE_ROLE_KEY}" \
      -H 'Content-Type: application/json' \
      -d "$(printf '{"email":"%s","password":"%s","email_confirm":true}' \
            "$email" "$ADMIN_PASSWORD")" > /dev/null \
      || fatal "GoTrue rechazó el alta del administrador. Revisá: docker logs barzol-auth"

    id="$(psql_valor "SELECT id FROM auth.users WHERE email = '${email}' LIMIT 1")"
    [ -n "$id" ] || fatal "El usuario se creó pero no aparece en auth.users."
  else
    ok "El administrador '${ADMIN_USUARIO}' ya existe (no se toca su contraseña)"
    ADMIN_PASSWORD_YA_EXISTIA=1
  fi

  # La fila de admin_profile es lo que las políticas "admin write" comprueban:
  # sin ella el login funciona y TODA escritura devuelve 403. No es opcional.
  psql_barzol > /dev/null <<-SQL
	INSERT INTO admin_profile (id, username, name, role)
	VALUES ('${id}', '${ADMIN_USUARIO}', '${ADMIN_NOMBRE}', 'admin')
	ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, name = EXCLUDED.name;
	SQL

  ok "Administrador listo (perfil vinculado a auth.users)"
}

# Reescribe la base pública de las imágenes ya guardadas.
#
# Hace falta porque la URL pública no se compone al leer: se guarda ENTERA en
# cada fila cuando se sube el archivo (igual que pasaba con el dominio de R2).
# Con un Quick Tunnel el hostname cambia en cada arranque, así que sin esto el
# catálogo aparecería con todas las fotos rotas al segundo despliegue.
#
# Son las cuatro columnas del schema que guardan una URL de multimedia. Si
# alguna vez se agrega una quinta, va acá.
rebasar_urls_publicas() {
  local vieja="${1%/}" nueva="${2%/}"
  [ -n "$vieja" ] && [ "$vieja" != "$nueva" ] || return 0

  paso "Reapuntando las imágenes de $vieja a $nueva"

  local afectadas
  afectadas="$(psql_valor "
    WITH p AS (
      UPDATE product_photo   SET url       = replace(url,       '${vieja}', '${nueva}')
      WHERE url LIKE '${vieja}%' RETURNING 1),
    g AS (
      UPDATE gallery_item    SET image_url = replace(image_url, '${vieja}', '${nueva}')
      WHERE image_url LIKE '${vieja}%' RETURNING 1),
    h AS (
      UPDATE home_hero_image SET image_url = replace(image_url, '${vieja}', '${nueva}')
      WHERE image_url LIKE '${vieja}%' RETURNING 1),
    i AS (
      UPDATE home_item       SET image_url = replace(image_url, '${vieja}', '${nueva}')
      WHERE image_url LIKE '${vieja}%' RETURNING 1)
    SELECT (SELECT count(*) FROM p) + (SELECT count(*) FROM g)
         + (SELECT count(*) FROM h) + (SELECT count(*) FROM i)")"

  ok "${afectadas:-0} imágenes reapuntadas"
}
