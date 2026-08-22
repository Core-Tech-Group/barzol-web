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
