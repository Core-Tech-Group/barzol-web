-- ============================================================================
--  Policies "admin write" para las tablas de la página de inicio
--  SPEC-904 REQ-979 · tarea BZ-81 · 2026-08-25
-- ============================================================================
--
--  SIN APLICAR. Es aditivo y no puede romper nada —no quita permisos a nadie,
--  solo concede escritura a los administradores autenticados—, pero sin el
--  código de SPEC-904 no sirve para nada: no hay endpoint que escriba.
--
--  Aplicarlo antes del código es inofensivo. Aplicarlo después también. Se deja
--  separado para que la migración no viaje en el mismo commit que el código
--  (regla DevOps: `wrangler rollback` no revierte la base).
--
--  El hueco
--  --------
--  `supabase/schema.sql:339` lo documenta desde el primer día:
--
--      -- Pendiente (CRUD todavía no implementado para esas pantallas):
--      -- home_hero_image, home_item, home_section_product, vendor.
--
--  Las tres tablas del inicio tienen `enable row level security` y solo policy
--  de `select`. Con RLS activado y sin policy de escritura rige el default-deny:
--  cualquier insert, update o delete se rechaza, incluso para un admin con
--  sesión válida.
--
--  Es el cuarto de los cuatro huecos de BZ-81, y el único que no está en el
--  código. Los otros tres —la isla, el endpoint y el servicio— los cubre
--  SPEC-904.
--
--  `vendor` queda fuera a propósito: comparte el hueco pero no tiene pantalla
--  de administración, así que concederle escritura hoy sería ampliar la
--  superficie sin que nadie la use.
--
--  Verificación previa (pegar sola en el SQL Editor):
--    select tablename, policyname, cmd, roles from pg_policies
--    where schemaname = 'public'
--      and tablename in ('home_item','home_hero_image','home_section_product')
--    order by tablename;
--    -- hoy: solo "public read" | SELECT
-- ============================================================================

begin;

-- Mismo predicado que las seis tablas que ya la tienen (schema.sql:311-334).
-- No se inventa nada: si esta forma cambiara algún día, cambia en las nueve.
create policy "admin write" on home_item for all to authenticated
  using (exists (select 1 from admin_profile where id = auth.uid()))
  with check (exists (select 1 from admin_profile where id = auth.uid()));

create policy "admin write" on home_hero_image for all to authenticated
  using (exists (select 1 from admin_profile where id = auth.uid()))
  with check (exists (select 1 from admin_profile where id = auth.uid()));

create policy "admin write" on home_section_product for all to authenticated
  using (exists (select 1 from admin_profile where id = auth.uid()))
  with check (exists (select 1 from admin_profile where id = auth.uid()));

commit;

-- ----------------------------------------------------------------------------
--  Interacción con fix-rls-admin-profile.sql
-- ----------------------------------------------------------------------------
--  Estas policies leen `admin_profile` dentro de un `exists`, y esa subconsulta
--  se evalúa con RLS aplicado. Si ya se aplicó el fix de `admin_profile`, la
--  policy "self read" le devuelve al admin su propia fila y esto funciona. Si
--  se aplicó el `enable` sin la policy, estas tres tampoco funcionarán — y el
--  síntoma será idéntico al bug que arreglan.
--
--  Comprobalo con el ensayo en seco del runbook:
--  docs/3_recursos/20260824-1200-runbook-aplicar-rls-admin-profile.md, paso 3.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
--  VUELTA ATRÁS
-- ----------------------------------------------------------------------------
--   drop policy if exists "admin write" on home_item;
--   drop policy if exists "admin write" on home_hero_image;
--   drop policy if exists "admin write" on home_section_product;
-- ----------------------------------------------------------------------------
