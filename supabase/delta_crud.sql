-- Corré cada bloque POR SEPARADO (uno, esperá "Success", recién el
-- siguiente). Si pegás todo junto y una línea falla con "already exists",
-- Supabase revierte TODO el script como si fuera una sola transacción —
-- eso es lo que probablemente pasó la primera vez.

-- Primero, para saber qué falta, corré esto solo:
select tablename, policyname, cmd from pg_policies where schemaname = 'public' and policyname = 'admin write' order by tablename;

-- ============================================================
-- A partir de acá, un bloque a la vez. Si una ya existe, va a decir
-- "policy already exists" — está bien, pasá a la siguiente igual.
-- ============================================================

-- 1) code autogenerado (respeta lo que ya insertaste)
create sequence if not exists category_code_seq;
select setval('category_code_seq', greatest(1000, coalesce((select max(code) from category), 0) + 1), false);
alter table category alter column code set default nextval('category_code_seq');

-- 2)
create sequence if not exists product_code_seq;
select setval('product_code_seq', greatest(5000, coalesce((select max(code) from product), 0) + 1), false);
alter table product alter column code set default nextval('product_code_seq');

-- 3)
create policy "admin write" on category for all to authenticated
  using (exists (select 1 from admin_profile where id = auth.uid()))
  with check (exists (select 1 from admin_profile where id = auth.uid()));

-- 4)
create policy "admin write" on product for all to authenticated
  using (exists (select 1 from admin_profile where id = auth.uid()))
  with check (exists (select 1 from admin_profile where id = auth.uid()));

-- 5) ESTA es la que te está bloqueando ahora mismo
create policy "admin write" on product_photo for all to authenticated
  using (exists (select 1 from admin_profile where id = auth.uid()))
  with check (exists (select 1 from admin_profile where id = auth.uid()));

-- 6)
create policy "admin write" on product_feature for all to authenticated
  using (exists (select 1 from admin_profile where id = auth.uid()))
  with check (exists (select 1 from admin_profile where id = auth.uid()));

-- 7)
create policy "admin write" on gallery_item for all to authenticated
  using (exists (select 1 from admin_profile where id = auth.uid()))
  with check (exists (select 1 from admin_profile where id = auth.uid()));

-- 8)
create policy "admin write" on site_configuration for all to authenticated
  using (exists (select 1 from admin_profile where id = auth.uid()))
  with check (exists (select 1 from admin_profile where id = auth.uid()));
