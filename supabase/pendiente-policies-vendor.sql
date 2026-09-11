-- ============================================================================
--  Policy "admin write" para `vendor`
--  Mantenimiento de vendedores en /admin/configuracion · 2026-09-11
-- ============================================================================
--
--  SIN APLICAR. Aplicar desde el SQL Editor del proyecto hlyhkoxnadkxbrjtzuzx.
--
--  Por qué hace falta
--  ------------------
--  `vendor` tiene RLS activado y solo la policy "public read" (schema.sql:299).
--  Con RLS y sin policy de escritura rige el default-deny: el administrador no
--  puede agregar, renombrar ni eliminar vendedores. Los GRANT de tabla ya
--  existen (grants-data-api.sql); lo que falta es la policy.
--
--  pendiente-policies-home.sql dejó `vendor` fuera a propósito porque no tenía
--  pantalla de administración. Ahora la tiene.
--
--  Mientras no se aplique: agregar falla con un error de RLS, y renombrar o
--  eliminar responden "falta el permiso de escritura" (el panel lo detecta:
--  con RLS un UPDATE/DELETE bloqueado no da error, afecta cero filas).
--
--  Es aditivo: no quita permisos a nadie, solo concede escritura a los
--  administradores autenticados. Se deja separado del código (regla DevOps:
--  `wrangler rollback` no revierte la base).
-- ============================================================================

begin;

-- Mismo predicado que las demás tablas de contenido (schema.sql:311-334).
create policy "admin write" on vendor for all to authenticated
  using (exists (select 1 from admin_profile where id = auth.uid()))
  with check (exists (select 1 from admin_profile where id = auth.uid()));

commit;

-- Verificación: debe listar "public read" (SELECT) y "admin write" (ALL).
select policyname, cmd, roles from pg_policies
where schemaname = 'public' and tablename = 'vendor'
order by policyname;
