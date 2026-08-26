-- ============================================================================
--  RLS en `admin_profile` — SPEC-902 REQ-921 y REQ-927 · tarea BZ-80, parte C
--  Revisión 2 · 2026-08-24 — ver "Corrección de la revisión 1" al final.
-- ============================================================================
--
--  APLICABLE POR SÍ SOLO. No depende de ningún cambio de código. Es la parte
--  independiente del hallazgo, separada a propósito para subir la seguridad
--  por fases.
--
--  ORDEN DE LECTURA: no ejecutes este archivo sin leer antes el paso a paso
--  de docs/3_recursos/20260824-1200-runbook-aplicar-rls-admin-profile.md.
--  Tiene la comprobación previa que dice si hace falta aplicarlo y la prueba
--  que demuestra, ANTES de confirmar, que el panel de admin sigue escribiendo.
--
--  Lo que arregla
--  --------------
--  `supabase/schema.sql` crea la tabla en la línea 37 y **nunca le habilita
--  RLS**. Las otras diez tablas del esquema sí lo tienen. Con RLS deshabilitado
--  y los GRANT que Supabase da por defecto al rol `anon`, cualquiera con la
--  clave pública —que viaja al navegador en cada visita— puede leer la tabla
--  entera.
--
--  Hoy `npm run audit:rls` responde AVISO, no FALLA, porque desde fuera no se
--  distingue "protegida" de "vacía" (REQ-933).
--
--  Por qué NO rompe el panel — y por qué el orden importa
--  -----------------------------------------------------
--  Las policies `"admin write"` de `schema.sql` y `delta_crud.sql` consultan
--  esta tabla dentro de un `exists (select 1 from admin_profile where
--  id = auth.uid())`. Esa subconsulta se ejecuta **con los privilegios del rol
--  que hace la consulta y con RLS aplicado** (PostgreSQL, "Row Security
--  Policies": *"Policy expressions are run as part of the query and with the
--  privileges of the user running the query"*).
--
--  Consecuencia directa: si se habilita RLS **sin** crear la policy `"self
--  read"`, rige el default-deny, la subconsulta devuelve cero filas y el panel
--  deja de poder guardar. Por eso las dos sentencias van en **una sola
--  transacción** y no como bloques sueltos.
--
--  Con la policy puesta, el administrador —rol `authenticated`, `auth.uid()`
--  igual a su `id`— ve exactamente la fila que la subconsulta necesita, y nada
--  más. Y `anon` nunca evalúa esas policies: todas son `to authenticated`.
--
--  Ningún código de la aplicación consulta `admin_profile` directamente
--  (verificado con grep sobre src/): sus dos únicos usos son las subconsultas
--  de policy y la sesión del propio admin.
-- ============================================================================

begin;

-- REQ-921 · RLS habilitado en todas las tablas del esquema public.
alter table admin_profile enable row level security;

-- REQ-927 · Sin policy de lectura para `anon`, la tabla queda cerrada por
-- defecto. Cada administrador autenticado ve únicamente su propia fila: es lo
-- que las policies "admin write" necesitan y nada más.
drop policy if exists "self read" on admin_profile;
create policy "self read" on admin_profile for select to authenticated
  using (id = auth.uid());

commit;

-- ----------------------------------------------------------------------------
--  PASO OPCIONAL — el que hace verificable REQ-927 desde fuera
-- ----------------------------------------------------------------------------
--  Con lo de arriba, `anon` deja de ver filas, pero PostgREST sigue respondiendo
--  200 con lista vacía: RLS filtra, no rechaza. Es indistinguible del estado
--  actual, así que TEST-P03 seguirá en AVISO.
--
--  Quitarle el GRANT a `anon` hace que PostgREST devuelva 42501 ("permission
--  denied for table admin_profile") con estado 401/403, y entonces TEST-P03
--  pasa a PASA. Es seguro porque `anon` no consulta esta tabla por ningún
--  camino: las policies que la leen son todas `to authenticated`, que conserva
--  su GRANT.
--
--      revoke select on admin_profile from anon;
--
--  Vuelta atrás:  grant select on admin_profile to anon;
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
--  VERIFICACIÓN — pegar en el SQL Editor después de aplicar
-- ----------------------------------------------------------------------------
--   select relname, relrowsecurity, relforcerowsecurity
--   from pg_class
--   where relnamespace = 'public'::regnamespace and relkind = 'r'
--   order by relname;
--   -- admin_profile debe aparecer con relrowsecurity = true
--
--   select tablename, policyname, cmd, roles, qual
--   from pg_policies
--   where schemaname = 'public' and tablename = 'admin_profile';
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
--  VUELTA ATRÁS COMPLETA
-- ----------------------------------------------------------------------------
--   alter table admin_profile disable row level security;
--   -- y, si se aplicó el paso opcional:
--   grant select on admin_profile to anon;
-- ----------------------------------------------------------------------------

-- ============================================================================
--  Corrección de la revisión 1 (2026-08-22)
-- ============================================================================
--  Aquella versión afirmaba que las subconsultas de una policy "se evalúan con
--  los permisos de su propietario". Es falso: la documentación de PostgreSQL
--  dice lo contrario. La conclusión —que no rompe el panel— se sostiene, pero
--  por otro motivo (la policy "self read" + el `to authenticated` de las
--  policies de escritura), y con una condición que la revisión 1 no imponía:
--  ambas sentencias deben aplicarse juntas.
--
--  También decía que TEST-P03 pasaría de AVISO a PASA. No lo hace sin el paso
--  opcional del `revoke`, porque RLS filtra filas pero no rechaza la petición.
-- ============================================================================

-- El resto del hallazgo —que `anon` puede leer los productos en borrador—
-- necesita un cambio de código antes y está en
-- `supabase/pendiente-fix-rls-borradores.sql`, sin aplicar.
