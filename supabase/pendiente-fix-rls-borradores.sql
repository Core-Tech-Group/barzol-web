-- ============================================================================
--  NO APLICAR TODAVÍA.  Ver el paso 1 más abajo.
-- ============================================================================
--
--  Arregla el hallazgo de SPEC-902 Enmienda 1 (BZ-80): el rol `anon` puede leer
--  los productos en borrador. Verificado contra producción el 2026-08-22 con
--  `npm run audit:rls`: devolvió 4, entre ellos "Soporte de Celular Trompeta
--  (copia)".
--
--  Causa: `supabase/schema.sql:300`
--      create policy "public read" on product for select using (true);
--
--  `using (true)` deja leer todas las filas. El filtro por `status` vive solo en
--  la aplicación, y la anon key viaja al navegador en cada visita — así que
--  cualquiera puede consultar PostgREST directamente y enumerarlos.
--
-- ----------------------------------------------------------------------------
--  POR QUÉ ESTE ARCHIVO NO SE HA EJECUTADO
-- ----------------------------------------------------------------------------
--
--  Aplicarlo tal cual **rompe el panel de administración**.
--
--  `productoService.getProductos()` —el listado del admin, el que debe ver los
--  borradores— usa `getSupabase()`, el cliente ANON cacheado a nivel de módulo.
--  No usa la sesión autenticada. Dicho de otro modo: hoy el admin ve borradores
--  precisamente PORQUE la política es demasiado laxa.
--
--  El orden correcto es:
--
--    PASO 1 (código, pendiente · necesita su propia SPEC)
--           Que las lecturas del admin usen el cliente autenticado
--           (`locals.supabase`) en vez del singleton anon. Requiere inyectar el
--           cliente en `productoService`, `categoriaService`, etc.
--
--    PASO 2 (este archivo, sección A)
--           Añadir la policy `admin read` para usuarios autenticados que estén
--           en `admin_profile`.
--
--    PASO 3 (este archivo, sección B)
--           Recién entonces, restringir `public read` a published + activo.
--
--  Si se ejecuta la sección B antes del paso 1, el panel deja de mostrar
--  borradores y productos inactivos. Eso es una regresión, no un arreglo.
--
--  Aplicarlo es decisión humana (Constitución 8.5). Antes de hacerlo:
--    1. Ejecutar `npm run audit:rls` y guardar la salida (estado previo).
--    2. Aplicar en un proyecto de Supabase de prueba, no directo en producción.
--    3. Comprobar el panel de admin Y el catálogo público.
--    4. Volver a ejecutar `npm run audit:rls` y confirmar que TEST-P02 pasa.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- SECCIÓN A · lectura de administrador (REQ-925)
-- Aplicar DESPUÉS del paso 1. Es aditiva: no quita permisos a nadie.
-- ---------------------------------------------------------------------------

create policy "admin read" on product for select to authenticated
  using (exists (select 1 from admin_profile where id = auth.uid()));

create policy "admin read" on product_photo for select to authenticated
  using (exists (select 1 from admin_profile where id = auth.uid()));

create policy "admin read" on product_feature for select to authenticated
  using (exists (select 1 from admin_profile where id = auth.uid()));

-- ---------------------------------------------------------------------------
-- SECCIÓN B · restringir la lectura pública (REQ-922, REQ-923)
-- Aplicar SOLO cuando la sección A esté activa y el admin ya lea autenticado.
-- ---------------------------------------------------------------------------

drop policy if exists "public read" on product;
create policy "public read" on product for select
  using (status = 'published' and is_active = true);

-- Las fotos y características de un borrador no deben poder enumerarse: el
-- nombre del archivo suele decir de qué producto son (TEST-R15).
drop policy if exists "public read" on product_photo;
create policy "public read" on product_photo for select
  using (
    exists (
      select 1 from product p
      where p.id = product_photo.product_id
        and p.status = 'published'
        and p.is_active = true
    )
  );

drop policy if exists "public read" on product_feature;
create policy "public read" on product_feature for select
  using (
    exists (
      select 1 from product p
      where p.id = product_feature.product_id
        and p.status = 'published'
        and p.is_active = true
    )
  );

-- ---------------------------------------------------------------------------
-- SECCIÓN C · admin_profile (REQ-921, REQ-927)
-- Independiente de las anteriores: se puede aplicar sin tocar código.
--
-- `schema.sql` crea la tabla pero NUNCA le habilita RLS. Hoy la auditoría
-- responde 200 con lista vacía, y desde fuera no se distingue "protegida" de
-- "vacía" (REQ-933). Con RLS habilitado y sin policy de lectura, queda cerrada
-- por defecto para anon y para authenticated.
-- ---------------------------------------------------------------------------

alter table admin_profile enable row level security;

-- Cada admin puede ver su propia fila; nadie más ve nada.
create policy "self read" on admin_profile for select to authenticated
  using (id = auth.uid());

-- ============================================================================
-- Verificar antes de confirmar:
--   select tablename, policyname, cmd, qual
--   from pg_policies where schemaname = 'public' order by tablename;
--
-- rollback;  -- <- dejar así hasta haber revisado la salida
-- commit;
-- ============================================================================

rollback;
