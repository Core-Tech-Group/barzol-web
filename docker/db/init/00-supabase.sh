#!/bin/sh
# Prepara la base para que PostgREST y GoTrue puedan trabajar contra ella.
#
# Corre UNA sola vez, cuando el volumen de datos está vacío (es el contrato de
# /docker-entrypoint-initdb.d de la imagen de postgres). Todo lo que hay acá es
# la infraestructura que en Supabase viene ya puesta y que `supabase/schema.sql`
# da por sentada: los roles, el esquema `auth` y los permisos sobre el esquema
# público sin los cuales PostgREST responde 401 aunque la RLS permita la
# consulta.
#
# Lo que NO va acá y por qué:
#
#   - El schema de la aplicación. `admin_profile` referencia `auth.users(id)`, y
#     esa tabla la crea GoTrue con sus propias migraciones al arrancar — es
#     decir, después de este script.
#   - Las funciones `auth.uid()` / `auth.role()`. GoTrue las crea ÉL en su
#     migración inicial, y si ya existen con otro dueño su `create or replace`
#     falla con "must be owner of function uid" y el contenedor entra en bucle
#     de reinicio. Se redefinen después, en `docker/db/funciones-auth.sql`.
#
# Los dos pasos los aplica `scripts/lib/base-datos.sh` una vez que GoTrue
# terminó de migrar (fichas OP-13 y OP-31).
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- ─── Roles ────────────────────────────────────────────────────────────
    --
    -- Los mismos cuatro nombres que usa Supabase, porque las políticas de RLS
    -- de schema.sql nombran \`authenticated\` explícitamente.
    --
    --   anon           visitante sin sesión; es el rol con el que PostgREST
    --                  atiende cuando no hay JWT (política "public read").
    --   authenticated  admin logueado; el JWT que emite GoTrue lo trae en
    --                  su claim \`role\` (política "admin write").
    --   service_role   salta RLS. Sólo lo usa el alta del admin durante el
    --                  despliegue; la aplicación nunca lo recibe.
    --   authenticator  el usuario con el que PostgREST se conecta. No puede
    --                  hacer nada por sí mismo: sólo cambiar a uno de los tres
    --                  anteriores según el JWT. Por eso es NOINHERIT.
    CREATE ROLE anon NOLOGIN NOINHERIT;
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '${POSTGRES_PASSWORD}';

    GRANT anon, authenticated, service_role TO authenticator;

    -- ─── Esquema auth (lo puebla GoTrue con sus migraciones) ──────────────
    CREATE ROLE supabase_auth_admin NOINHERIT CREATEROLE LOGIN PASSWORD '${POSTGRES_PASSWORD}';
    CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
    GRANT ALL PRIVILEGES ON SCHEMA auth TO supabase_auth_admin;
    -- \`public\` va en el search_path porque ahí quedan las extensiones de abajo:
    -- las migraciones de GoTrue llaman a gen_random_uuid()/uuid_generate_v4()
    -- sin calificar el esquema.
    ALTER USER supabase_auth_admin SET search_path = 'auth, public';

    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-'EOSQL'
    -- ─── Permisos sobre el esquema público ────────────────────────────────
    --
    -- RLS decide QUÉ FILAS ve cada rol, pero antes de eso hace falta el permiso
    -- de tabla: sin GRANT, PostgREST responde 401 aunque la política permita la
    -- consulta. Se conceden por defecto para todo lo que cree `postgres` de acá
    -- en adelante, que es lo que hace `supabase/schema.sql` — así no hay que
    -- acordarse de repetir los GRANT cada vez que el schema cambie.
    --
    -- Que anon reciba ALL no lo vuelve escritor: `anon` no tiene ninguna
    -- política de escritura en schema.sql, y con RLS activo la ausencia de
    -- política es denegación. Es el mismo reparto que usa Supabase.
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

    -- Canal por el que PostgREST recarga su caché de esquema sin reiniciar.
    -- Lo usa scripts/lib/base-datos.sh después de aplicar el schema.
    CREATE OR REPLACE FUNCTION public.recargar_esquema_postgrest() RETURNS void
        LANGUAGE sql
    AS $$ SELECT pg_notify('pgrst', 'reload schema') $$;
EOSQL

echo "[init] roles, esquema auth y funciones auth.*() creados"
