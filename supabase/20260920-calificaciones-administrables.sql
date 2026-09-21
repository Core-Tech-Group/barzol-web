-- SPEC-007 · BZ-102. Aplicar ANTES de activar edición de calificaciones.
-- Migración aditiva: el Worker anterior sigue funcionando durante el despliegue.
begin;

alter table public.product
  add column if not exists rating_avg numeric(2,1) not null default 0.0,
  add column if not exists rating_count integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.product'::regclass
      and conname = 'product_rating_consistency'
  ) then
    alter table public.product
      add constraint product_rating_consistency check (
        (rating_count = 0 and rating_avg = 0)
        or (rating_count > 0 and rating_avg > 0 and rating_avg <= 5)
      );
  end if;
end $$;

commit;

-- Verificación: SELECT rating_avg, rating_count FROM public.product LIMIT 1;
-- Reversión, solo tras retirar el código que usa estos campos:
-- ALTER TABLE public.product DROP CONSTRAINT IF EXISTS product_rating_consistency;
-- ALTER TABLE public.product DROP COLUMN IF EXISTS rating_avg, DROP COLUMN IF EXISTS rating_count;
