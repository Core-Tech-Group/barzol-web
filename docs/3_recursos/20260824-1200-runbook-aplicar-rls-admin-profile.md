# Runbook — aplicar RLS en `admin_profile` desde el panel de Supabase

**Fecha:** 2026-08-24 · **Tarea:** `BZ-80` parte C · **SPEC:** `SPEC-902` REQ-921, REQ-927
**Archivo a ejecutar:** [`supabase/fix-rls-admin-profile.sql`](../../supabase/fix-rls-admin-profile.sql)
**Proyecto:** `hlyhkoxnadkxbrjtzuzx` · **Duración:** ~6 minutos · **Requiere:** rol Owner o Developer

> Este cambio lo ejecuta un humano. Ningún agente corre DDL contra producción
> (Constitución 8.5). El agente escribe el SQL y la verificación; aplicarlo es
> decisión tuya.

---

## Antes de empezar: qué es lo que se va a cambiar

Dos sentencias, en una sola transacción:

```sql
alter table admin_profile enable row level security;
create policy "self read" on admin_profile for select to authenticated
  using (id = auth.uid());
```

**Van juntas o no van.** Las policies `"admin write"` del resto de tablas
preguntan `exists (select 1 from admin_profile where id = auth.uid())`. Esa
subconsulta corre con los privilegios y con el RLS del rol que consulta —lo dice
la documentación de PostgreSQL, sección *Row Security Policies*— así que activar
RLS sin la policy deja al panel de admin sin poder guardar nada hasta que
alguien note por qué.

---

## Paso 0 · Estado previo, desde tu máquina (1 min)

```bash
npm run audit:rls
```

Guardá la salida. La línea que importa hoy:

```
[AVISO] TEST-P03 · anon NO lee admin_profile
         responde 200 con lista vacía: la tabla es alcanzable, revisar si tiene RLS
```

**AVISO no es "está bien".** Significa que desde fuera no se distingue
"protegida" de "vacía" (REQ-933). El paso 1 resuelve esa ambigüedad.

---

## Paso 1 · Entrar al SQL Editor y averiguar si hace falta (2 min)

1. Entrá a <https://supabase.com/dashboard> y elegí el proyecto
   **`hlyhkoxnadkxbrjtzuzx`**.
2. Barra lateral izquierda → **SQL Editor**.
   URL directa: `https://supabase.com/dashboard/project/hlyhkoxnadkxbrjtzuzx/sql/new`
3. Pegá esto y ejecutalo con **Run** (o `Ctrl`+`Enter`):

```sql
-- ¿Tiene RLS? ¿Tiene policies? ¿Tiene filas?
select relrowsecurity as rls_activo, relforcerowsecurity as rls_forzado
from pg_class
where oid = 'public.admin_profile'::regclass;

select policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public' and tablename = 'admin_profile';

select count(*) as filas from admin_profile;
```

### Cómo leer el resultado

| `rls_activo` | `filas` | Qué significa | Qué hacer |
| :--- | :--- | :--- | :--- |
| `false` | `> 0` | **Fuga activa.** La anon key lee los perfiles ahora mismo | seguí al paso 2 |
| `false` | `0` | Sin fuga hoy, pero se abre sola con el primer admin | seguí al paso 2 |
| `true` | cualquiera | Ya está aplicado — comprobá que exista la policy `self read` | saltá al paso 5 |

> El SQL Editor corre como `postgres`, que es **propietario de la tabla y por lo
> tanto ignora RLS**. Por eso `count(*)` acá te da el número real de filas, no lo
> que ve `anon`. Es justamente lo que necesitás para decidir.

Anotá también el `id` del administrador, que hace falta en el paso 3:

```sql
select id, username, name from admin_profile;
```

---

## Paso 2 · Baseline del panel (1 min) — no lo saltes

Abrí <https://barzol-web.barzolweb3d.workers.dev/admin/login>, entrá y
**editá algo trivial de un producto y guardalo** (por ejemplo, corregí y
descorregí una palabra de la descripción).

Esto no es ceremonia: si el panel ya estuviera roto —caso `filas = 0` del paso
1— sin este baseline vas a culpar al cambio de un fallo anterior. Y si el panel
guarda bien, queda demostrado que hay una fila en `admin_profile` para tu
`auth.uid()`, que es la condición que la policy `self read` tiene que preservar.

---

## Paso 3 · Ensayo en seco, con rollback (1 min)

Antes de aplicar nada, comprobá el resultado. En el SQL Editor, un snippet
nuevo:

```sql
begin;
  alter table admin_profile enable row level security;
  create policy "self read" on admin_profile for select to authenticated
    using (id = auth.uid());

  -- (a) ¿qué vería anon?  Esperado: 0
  set local role anon;
  select count(*) as visible_para_anon from admin_profile;
  reset role;

  -- (b) ¿seguiría escribiendo el admin?  Esperado: true
  --     Reemplazá el uuid por el `id` que anotaste en el paso 1.
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"PEGA-AQUI-EL-UUID","role":"authenticated"}';
  select exists (select 1 from admin_profile where id = auth.uid()) as puede_escribir;
  reset role;
rollback;
```

**Todo esto se deshace solo**: el `rollback` final deja la base exactamente como
estaba. Es la misma disciplina que REQ-928 le exige a pgTAP.

- `visible_para_anon = 0` y `puede_escribir = true` → adelante.
- `puede_escribir = false` → **parate**. El uuid está mal, o no hay fila en
  `admin_profile` para ese usuario. Aplicarlo así rompería el panel.

---

## Paso 4 · Aplicar (30 s)

Abrí [`supabase/fix-rls-admin-profile.sql`](../../supabase/fix-rls-admin-profile.sql),
copiá el archivo **entero** y pegalo en un snippet nuevo del SQL Editor. Ya trae
su `begin; … commit;`.

> **No lo trocees.** El encabezado de `delta_crud.sql` recomienda ejecutar bloque
> por bloque, y para aquel archivo estaba bien. Acá es exactamente lo contrario:
> partirlo es el único modo de romper el panel.

Ejecutá con **Run**. Supabase avisa de que la consulta modifica la base; es
esperado, confirmá.

---

## Paso 5 · Verificar (2 min)

**a) En el SQL Editor** — que el estado sea el que pediste:

```sql
select relrowsecurity from pg_class where oid = 'public.admin_profile'::regclass;
-- esperado: true

select policyname, cmd, roles from pg_policies
where schemaname = 'public' and tablename = 'admin_profile';
-- esperado: "self read" | SELECT | {authenticated}
```

**b) En el panel** — repetí el guardado del paso 2. Debe seguir funcionando.
Esta es la comprobación que de verdad importa.

**c) Desde tu máquina:**

```bash
npm run audit:rls
```

`TEST-P03` **va a seguir en AVISO**, y eso es correcto. RLS filtra filas, no
rechaza peticiones: PostgREST sigue respondiendo `200` con `[]`, que es
indistinguible desde fuera de lo que ya devolvía. La prueba de que el cambio
funcionó es la del punto (a), no la de la sonda.

**d) Advisor de Supabase** — barra lateral → **Database** → **Security Advisor**
(`.../project/hlyhkoxnadkxbrjtzuzx/database/security-advisor`). El lint
`rls_disabled_in_public` (0013) ya no debe listar `admin_profile`. El advisor
cachea: usá el botón de recarga de la página si sigue apareciendo.

---

## Paso 6 · Opcional — el que sí mueve TEST-P03 a PASA

```sql
revoke select on admin_profile from anon;
```

Sin GRANT, PostgREST devuelve `42501 permission denied for table admin_profile`
con estado 401/403, y la sonda lo reconoce como PASA.

**Por qué es seguro:** ningún código de `src/` consulta `admin_profile` (grep
verificado), y las policies que sí la consultan son todas `to authenticated`,
rol que conserva su GRANT. `anon` no la alcanza por ningún camino.

**Vuelta atrás:** `grant select on admin_profile to anon;`

Después: `npm run audit:rls` → `[PASA] TEST-P03 · anon NO lee admin_profile (rechazado con 401)`.

---

## Si algo sale mal

```sql
alter table admin_profile disable row level security;
-- y, si aplicaste el paso 6:
grant select on admin_profile to anon;
```

Efecto inmediato, sin despliegue: RLS es estado de la base, no del bundle. Por
eso `npx wrangler rollback` **no revierte esto** — ver la regla DevOps.

---

## Lo que este runbook NO arregla

`TEST-P02` sigue en **FALLA**: `anon` ve 4 productos en borrador, entre ellos
*"Soporte de Celular Trompeta (copia)"*. La causa es
`create policy "public read" on product for select using (true)` en
`schema.sql:300`, y endurecerla **rompe la landing** porque
`productoService.getProductos()` lee con el cliente anónimo. Necesita el cambio
de código primero. Está especificado y sin aplicar en
[`supabase/pendiente-fix-rls-borradores.sql`](../../supabase/pendiente-fix-rls-borradores.sql).

---

## Nota de plataforma — 2026

Supabase está retirando el GRANT automático a `anon`/`authenticated` sobre las
tablas nuevas de `public`. Fechas publicadas: por defecto en proyectos nuevos
desde el **30-05-2026**, y aplicado a los proyectos existentes el
**30-10-2026**. Este proyecto es anterior, así que **hoy sigue con los GRANT
automáticos** —de ahí que `admin_profile` sea alcanzable sin que nadie lo
concediera— pero a partir de esa fecha toda tabla nueva necesitará su `grant`
explícito. Conviene tenerlo presente antes de la próxima migración.

Fuentes: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) ·
[Database Advisors](https://supabase.com/docs/guides/database/database-advisors) ·
[Hardening the Data API](https://supabase.com/docs/guides/database/hardening-data-api) ·
[Changelog · tablas no expuestas automáticamente](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically) ·
[PostgreSQL · Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
