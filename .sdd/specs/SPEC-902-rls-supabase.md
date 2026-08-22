# SPEC-902 — Políticas RLS verificables

**Estado:** BORRADOR — pendiente de aprobación humana
**Capa:** 4 (base de datos) · **Fecha:** 2026-08-21
**Unidad destino:** `supabase/tests/*.sql` (**no existe todavía**)
**Cierra:** `BZ-50` — *"Verificar que RLS esté activo en Supabase"*, abierta y P0

---

## Contexto

El sitio está en pie y sirve datos públicamente desde Supabase. La anon key viaja
al navegador en cada visita — es su diseño y es correcto — así que **cualquiera
puede consultar PostgREST directamente con ella**. Lo único que separa el catálogo
público de la base de datos entera son las políticas RLS.

`DATABASE_SCHEMA.md` afirma que están implementadas: lectura pública en las tablas
de catálogo, y una policy `"admin write" FOR ALL TO authenticated` que exige que
`auth.uid()` esté en `admin_profile`. **Nadie lo ha verificado contra la base real.**
Esa distancia entre "está documentado" y "está comprobado" es exactamente la que
`BZ-49` tardó ocho revisiones en cerrar en otro frente.

## Por qué RLS necesita su propio gate

Una política mal escrita **no lanza error**. Devuelve las filas equivocadas.

- Demasiado estricta → el catálogo aparece vacío.
- Demasiado laxa → se expone el panel de administración.

Ninguna de las dos rompe el build, ninguna aparece en un log, y la segunda no
produce ningún síntoma hasta que alguien la encuentra. Por eso no puede vivir dentro
de los tests de aplicación: se comprueba en Postgres, con pgTAP, o no se comprueba.

## Tablas cubiertas

Tomadas de `DATABASE_SCHEMA.md`:

| Tabla | Lectura anon | Escritura |
| :--- | :--- | :--- |
| `category` | pública | admin |
| `product` | pública, **solo `status = 'published'`** | admin |
| `product_photo`, `product_feature` | pública | admin |
| `gallery_item` | pública | admin |
| `site_configuration` | pública | admin |
| `vendor` | pública | **sin policy de escritura todavía** |
| `home_hero_image`, `home_item`, `home_section_product` | pública | **sin policy de escritura todavía** |
| `admin_profile` | **ninguna** | ninguna |

> Las cuatro tablas sin policy de escritura no son un descuido: no tienen CRUD en el
> admin. Pero "sin policy" y "sin RLS habilitado" son cosas distintas y solo una de
> las dos es segura. REQ-926 las separa.

## Fuera de alcance

- Rendimiento de las políticas.
- Auditoría de accesos.
- Rotación de la anon key.

---

## Requisitos (EARS)

### [REQ-921] — Ubicuo
El sistema DEBE tener RLS **habilitado** en **todas** las tablas del esquema
`public`, sin excepción.

### [REQ-922] — Dirigido por estado · lectura pública
MIENTRAS la petición se realice con el rol `anon`, el sistema DEBE devolver las
filas de `product` cuyo `status = 'published'` y `is_active = true`.

### [REQ-923] — No deseado · borradores
SI la petición se realiza con el rol `anon`, ENTONCES el sistema NO DEBE devolver
ninguna fila de `product` con `status = 'draft'`.

> Éste es el requisito de mayor riesgo real del proyecto. Un producto en borrador
> puede llevar precio no definitivo o un nombre interno.

### [REQ-924] — No deseado · escritura anónima
SI la petición se realiza con el rol `anon`, ENTONCES el sistema DEBE rechazar todo
`INSERT`, `UPDATE` y `DELETE` sobre cualquier tabla del esquema `public`.

### [REQ-925] — No deseado · escritura autenticada no-admin
SI la petición se realiza con un usuario autenticado cuyo `auth.uid()` **no** está
en `admin_profile`, ENTONCES el sistema DEBE rechazar toda escritura sobre las
tablas de catálogo.

> Una sesión válida de Supabase Auth no equivale a ser administrador. Si RLS no
> distingue las dos cosas, registrarse basta para editar el catálogo.

### [REQ-926] — No deseado · tablas sin policy
SI una tabla del esquema `public` tiene RLS habilitado y **ninguna** policy de
escritura, ENTONCES toda escritura DEBE quedar rechazada por defecto para todos los
roles, y el test DEBE afirmarlo explícitamente en lugar de omitir la tabla.

### [REQ-927] — No deseado · perfiles de administrador
SI la petición se realiza con el rol `anon`, ENTONCES el sistema NO DEBE devolver
ninguna fila de `admin_profile`.

### [REQ-928] — Ubicuo · aislamiento
El sistema DEBE ejecutar cada archivo de prueba dentro de una transacción con
`rollback` final, de modo que la suite sea idempotente y no deje residuos.

### [REQ-929] — Ubicuo · datos de prueba
El sistema DEBE sembrar sus propios datos —incluido al menos un producto en
`draft`— y NO DEBE depender del contenido de `supabase/seed-data/`.

> Si el test depende del seed, deja de verificar RLS y pasa a verificar el seed. El
> día que alguien despublique el producto que el test usaba, el test se pone verde
> por el motivo equivocado.

### [REQ-930] — Ubicuo · ejecución
El sistema DEBE ejecutarse con `supabase test db` contra un stack **local**, y
NUNCA contra el proyecto de producción.

---

## Contrato

```
supabase/tests/
├── 000-setup.sql        # helpers de Basejump + siembra propia
├── 010-rls-habilitado.sql   # REQ-921, REQ-926
├── 020-rls-lectura.sql      # REQ-922, REQ-923, REQ-927
└── 030-rls-escritura.sql    # REQ-924, REQ-925
```

Se recomienda el helper `basejump-supabase_test_helpers` vía `dbdev`:
`tests.create_supabase_user()`, `tests.authenticate_as()`,
`tests.clear_authentication()` y `tests.rls_enabled()` ahorran cientos de líneas de
setup manual.

## Invariantes verificables

- **INV-1:** La suite deja la base exactamente como la encontró.
- **INV-2:** Ningún test depende del orden de los archivos más allá de `000-setup`.
- **INV-3:** Un `select` que **debería** estar vacío se verifica con `is_empty`, no
  contando filas: contar filas y comparar con cero pasa igual cuando la tabla no
  existe.

## Nota operativa

Cuando `BZ-50` se cierre, el resultado hay que anotarlo en el kanban de despliegue
con la fecha. Si RLS resulta estar **mal** configurado, deja de ser una tarea de
testing y pasa a ser un incidente de seguridad con el sitio ya publicado.

---

## Enmienda 1 — 2026-08-22 · sondas de solo lectura y hallazgo confirmado

### Por qué se enmienda

La SPEC original definía **solo** pgTAP, que exige un stack local levantado. Este
proyecto ni siquiera está inicializado como proyecto de Supabase CLI (no existe
`supabase/config.toml`), así que `BZ-70` no se podía cerrar en el corto plazo —
mientras `BZ-50` llevaba desde el 2026-08-08 abierta como P0 **sobre un sitio que
ya sirve datos al público**.

Se añade un subconjunto verificable **sin escribir nada y sin stack local**, para
que la distancia entre "no lo hemos verificado" y "sabemos qué ve un visitante"
deje de depender de levantar Docker.

### [REQ-931] — Ubicuo
El sistema DEBE poder auditar las políticas de lectura contra una instancia viva
usando únicamente el rol `anon` y peticiones `GET` a PostgREST.

### [REQ-932] — No deseado
SI la auditoría se ejecuta contra producción, ENTONCES NO DEBE realizar ninguna
operación de escritura. Las comprobaciones de escritura (REQ-924, REQ-925) siguen
siendo exclusivas de pgTAP contra el stack local.

### [REQ-933] — Dirigido por evento
CUANDO una consulta que debería estar vacía devuelva cero filas, el sistema DEBE
informarlo como **AVISO**, no como éxito: desde fuera no se puede distinguir
"RLS lo impide" de "la tabla está vacía", y tratarlo como éxito sería afirmar algo
que no se ha comprobado.

**Implementación:** `scripts/auditar-rls.mjs` + `scripts/rls/sondas.mjs`
(`npm run audit:rls`).

---

## Estado verificado contra producción — 2026-08-22

Primera ejecución de la auditoría sobre `rnfcccnesxunjtpwahce.supabase.co`:

| Requisito | Resultado |
| :--- | :--- |
| REQ-922 · anon lee publicados | ✅ PASA |
| **REQ-923 · anon NO ve borradores** | ❌ **FALLA — 4 borradores expuestos** |
| REQ-927 · anon NO lee `admin_profile` | ⚠️ AVISO — responde 200 con lista vacía |
| REQ-921 · RLS en todo el esquema | ⚠️ no verificable desde PostgREST |

### El fallo, y su causa

```sql
-- supabase/schema.sql:300
create policy "public read" on product for select using (true);
```

`using (true)` deja leer **todas** las filas, publicadas o no. El filtro por
`status` vive únicamente en la aplicación (`getProductosPublicados()`), y la anon
key viaja al navegador en cada visita — así que cualquiera puede consultar
PostgREST directamente y enumerar los borradores. Se comprobó: devuelve 4, entre
ellos *"Soporte de Celular Trompeta (copia)"*.

Lo mismo aplica a `product_photo` y `product_feature` (líneas 301-302), que es
exactamente lo que TEST-R15 anticipaba: el producto no aparece, pero sus fotos se
pueden enumerar, y el nombre del archivo suele decir de qué producto son.

`admin_profile` **no tiene `enable row level security`** en `schema.sql`. La
auditoría no puede distinguir si está protegida o simplemente vacía (REQ-933),
y eso lo resuelve pgTAP.

### Por qué NO se ha corregido todavía

**Corregir la política a secas rompe el panel de administración.**

`productoService.getProductos()` —el listado del admin, el que debe ver los
borradores— usa `getSupabase()`, que es el cliente **anon** cacheado a nivel de
módulo. No usa la sesión autenticada. Es decir: *la capacidad del admin de ver
borradores depende hoy de que RLS deje a `anon` leerlos*.

Restringir la política sin más dejaría el panel sin borradores. El arreglo real
son tres cosas, en este orden:

1. Que las lecturas del admin usen el cliente **autenticado** (`locals.supabase`)
   en vez del singleton anon. Requiere inyectar el cliente en el servicio, y eso
   necesita su propia SPEC.
2. Añadir una policy `admin read` para `authenticated` presente en `admin_profile`.
3. Recién entonces, restringir `public read` a `status = 'published'`.

La migración propuesta está escrita en
[`supabase/pendiente-fix-rls-borradores.sql`](../../supabase/pendiente-fix-rls-borradores.sql),
**sin aplicar**, con el orden y las advertencias. Aplicarla es decisión humana
(Constitución 8.5) y no debe hacerse antes del paso 1.
