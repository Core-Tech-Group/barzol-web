-- SPEC-004. Ejecutar una vez en SQL Editor de Supabase antes de usar «Guardar orden».
-- No modifica los demás atributos del producto. Reejecutable sin renumerar órdenes editados.
-- Reversión, solo después de volver al Worker previo:
-- drop function if exists public.reordenar_productos(jsonb);
-- alter table public.product drop column if exists sort_order;
begin;

alter table public.product add column if not exists sort_order integer;

with numerados as (
  select p.id,
    row_number() over (
      partition by coalesce(c.parent_category_id, c.id)
      order by p.created_at desc, p.id desc
    ) - 1 as posicion
  from public.product p
  join public.category c on c.id = p.category_id
)
update public.product p
set sort_order = n.posicion
from numerados n
where p.id = n.id and p.sort_order is null;

alter table public.product alter column sort_order set default 0;
alter table public.product alter column sort_order set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.product'::regclass and conname = 'product_sort_order_nonnegative') then
    alter table public.product add constraint product_sort_order_nonnegative check (sort_order >= 0);
  end if;
end $$;

create or replace function public.reordenar_productos(cambios jsonb)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  cantidad integer;
  actualizados integer;
  instrumentos integer;
begin
  if cambios is null or jsonb_typeof(cambios) <> 'array' or jsonb_array_length(cambios) = 0 then
    raise exception 'Lista de productos inválida';
  end if;
  cantidad := jsonb_array_length(cambios);
  if exists (
    select 1 from jsonb_array_elements(cambios) x
    where jsonb_typeof(x->'id') <> 'number'
      or jsonb_typeof(x->'orden') <> 'number'
      or (x->>'id') !~ '^[0-9]+$'
      or (x->>'orden') !~ '^[0-9]+$'
  ) then
    raise exception 'Id u orden inválido';
  end if;
  if (select count(distinct id) from jsonb_to_recordset(cambios) as x(id integer, orden integer)) <> cantidad
    or (select count(distinct orden) from jsonb_to_recordset(cambios) as x(id integer, orden integer)) <> cantidad then
    raise exception 'Id u orden duplicado';
  end if;

  select count(distinct coalesce(c.parent_category_id, c.id)) into instrumentos
  from public.product p
  join public.category c on c.id = p.category_id
  join jsonb_to_recordset(cambios) as x(id integer, orden integer) on x.id = p.id;
  if instrumentos <> 1 then
    raise exception 'Los productos deben pertenecer al mismo instrumento';
  end if;

  update public.product p
  set sort_order = x.orden
  from jsonb_to_recordset(cambios) as x(id integer, orden integer)
  where p.id = x.id;
  get diagnostics actualizados = row_count;
  if actualizados <> cantidad then
    raise exception 'No se pudieron reordenar todos los productos';
  end if;
end $$;

revoke all on function public.reordenar_productos(jsonb) from public;
revoke all on function public.reordenar_productos(jsonb) from anon;
grant execute on function public.reordenar_productos(jsonb) to authenticated;

commit;
