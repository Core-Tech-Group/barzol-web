-- ============================================================================
--  GRANTs para la Data API — OBLIGATORIO en proyectos creados desde 2026
--  2026-08-30 · despliegue en cuenta nueva
-- ============================================================================
--
--  POR QUÉ EXISTE ESTE ARCHIVO
--  ---------------------------
--  `schema.sql` no contiene **ni un solo GRANT**. Nunca hizo falta: hasta 2026,
--  Supabase concedía automáticamente privilegios sobre cada tabla nueva de
--  `public` a los roles `anon` y `authenticated`.
--
--  Eso cambió. Según el changelog de Supabase:
--
--    · 30-05-2026  los proyectos NUEVOS dejan de conceder por defecto
--    · 30-10-2026  se aplica también a los proyectos existentes
--
--  El proyecto original es anterior, así que hoy funciona con los grants
--  heredados. **Un proyecto de Supabase creado ahora, no.** Sin este archivo,
--  al clonar el repo y cargar `schema.sql` el sitio arranca completamente
--  muerto: PostgREST responde `42501 permission denied for table product` a
--  cada lectura, incluida la portada.
--
--  El síntoma engaña: no parece un problema de permisos sino de datos. Las
--  consultas no fallan visiblemente en la landing —los servicios devuelven
--  listas vacías— así que el catálogo aparece sin productos y da la impresión
--  de que el seed no se cargó.
--
--  ORDEN
--  -----
--  Después de `schema.sql` y `delta_crud.sql`, antes del seed. Es idempotente:
--  se puede volver a ejecutar sin efecto.
--
--  GRANT ≠ RLS
--  -----------
--  Un GRANT dice "este rol puede intentar tocar esta tabla". RLS decide qué
--  filas ve. Hacen falta los dos: sin GRANT no se llega a evaluar la policy, y
--  sin policy el GRANT no muestra ninguna fila. Ver
--  `docs/3_recursos/20260824-1200-runbook-aplicar-rls-admin-profile.md`.
-- ============================================================================

begin;

-- ── Lectura pública ─────────────────────────────────────────────────────────
--
-- Las diez tablas con policy `"public read"` en schema.sql. `admin_profile`
-- queda fuera a propósito: es lo que arregla `fix-rls-admin-profile.sql`, y
-- concederle SELECT a `anon` aquí sería reabrir ese mismo agujero.

grant select on table
  vendor, category, product, product_photo, product_feature,
  gallery_item, home_hero_image, home_item, home_section_product,
  site_configuration
to anon;

-- ── Panel de administración ─────────────────────────────────────────────────
--
-- El admin entra por Supabase Auth, así que sus peticiones llegan como
-- `authenticated`. Necesita leer todo —incluidos los borradores— y escribir
-- en las nueve tablas de contenido.

grant select on table admin_profile to authenticated;

grant select, insert, update, delete on table
  vendor, category, product, product_photo, product_feature,
  gallery_item, home_hero_image, home_item, home_section_product,
  site_configuration
to authenticated;

-- ── Secuencias de `code` ────────────────────────────────────────────────────
--
-- `delta_crud.sql` crea `category_code_seq` y `product_code_seq` y las pone
-- como DEFAULT de la columna `code`. Un INSERT ejecuta `nextval()`, y eso
-- **exige USAGE sobre la secuencia**: sin esto, crear un producto desde el
-- panel falla con `permission denied for sequence product_code_seq` aunque la
-- tabla tenga todos sus permisos.
--
-- Las demás PK son `GENERATED ALWAYS AS IDENTITY`, cuya secuencia pertenece a
-- la columna y no necesita permiso aparte. Por eso solo aparecen estas dos.

grant usage, select on sequence category_code_seq, product_code_seq to authenticated;

-- ── service_role ────────────────────────────────────────────────────────────
--
-- Hoy ningún código del proyecto lo usa (ver `db/client.ts`). Se concede para
-- que las herramientas del panel de Supabase —el Table Editor, los backups—
-- sigan funcionando como se espera.

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

commit;

-- ----------------------------------------------------------------------------
--  VERIFICACIÓN — pegar en el SQL Editor después de aplicar
-- ----------------------------------------------------------------------------
--   select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type)
--   from information_schema.role_table_grants
--   where table_schema = 'public' and grantee in ('anon', 'authenticated')
--   group by table_name, grantee
--   order by table_name, grantee;
--
--   -- Esperado: 10 tablas con SELECT para anon, 11 para authenticated
--   -- (las 10 + admin_profile), y las 10 con INSERT/UPDATE/DELETE.
--
--   -- Y la prueba de verdad, la que importa:
--   begin;
--     set local role anon;
--     select count(*) from product;   -- debe devolver un número, no un error
--   rollback;
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
--  VUELTA ATRÁS
-- ----------------------------------------------------------------------------
--   revoke all on all tables in schema public from anon, authenticated;
--   revoke all on all sequences in schema public from anon, authenticated;
--
--   Deja el sitio muerto, que es el estado de partida de un proyecto nuevo.
-- ----------------------------------------------------------------------------
