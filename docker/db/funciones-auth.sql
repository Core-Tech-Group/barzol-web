-- Funciones `auth.*()` sobre las que están escritas las diez políticas de RLS
-- de `supabase/schema.sql`.
--
-- ¿Por qué acá y no en `db/init/00-supabase.sh`? Porque GoTrue las crea él
-- mismo en su migración inicial. Si ya existen con otro dueño, su
-- `create or replace` falla con `must be owner of function uid (SQLSTATE 42501)`
-- y el contenedor de autenticación entra en bucle de reinicio. Así que primero
-- migra GoTrue y recién después se aplica este archivo, como `postgres`
-- (superusuario, así que puede reemplazar funciones que no le pertenecen).
--
-- ¿Y por qué reemplazarlas, si GoTrue ya las define? Porque su definición sólo
-- lee la forma ANTIGUA de los claims:
--
--     select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
--
-- PostgREST v12 con `db-use-legacy-gucs = false` —que es como está configurado—
-- ya no publica un ajuste por claim: publica el JSON entero en
-- `request.jwt.claims`. Con la definición de GoTrue tal cual, `auth.uid()`
-- devolvería NULL en toda petición y **todas** las políticas "admin write"
-- rechazarían al admin logueado, con un 403 que no dice por qué.
--
-- Se leen las DOS formas a propósito: así ni una subida de versión de PostgREST
-- ni una de GoTrue apagan la autorización en silencio.
--
-- El segundo argumento `true` de `current_setting` hace que devuelva NULL en vez
-- de lanzar error cuando el ajuste no existe: ese es el caso del visitante
-- anónimo, que es la mayoría del tráfico.

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
AS $$
    SELECT coalesce(
        nullif(current_setting('request.jwt.claims', true), ''),
        nullif(current_setting('request.jwt.claim', true), ''),
        '{}'
    )::jsonb
$$;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
AS $$
    SELECT nullif(
        coalesce(
            nullif(current_setting('request.jwt.claim.sub', true), ''),
            (auth.jwt() ->> 'sub')
        ),
        ''
    )::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
AS $$
    SELECT nullif(
        coalesce(
            nullif(current_setting('request.jwt.claim.role', true), ''),
            (auth.jwt() ->> 'role')
        ),
        ''
    )::text
$$;

CREATE OR REPLACE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
AS $$
    SELECT nullif(
        coalesce(
            nullif(current_setting('request.jwt.claim.email', true), ''),
            (auth.jwt() ->> 'email')
        ),
        ''
    )::text
$$;

-- Sin estos permisos las políticas de RLS no pueden invocar las funciones y
-- toda consulta falla, tanto la del visitante como la del admin.
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.jwt(), auth.uid(), auth.role(), auth.email()
    TO anon, authenticated, service_role;
