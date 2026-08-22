# PLAN DE PRUEBAS — SPEC-902 · Políticas RLS

**Archivos destino:** `supabase/tests/*.sql` · **Runner:** `supabase test db` (pgTAP)
**Fuente:** [`../specs/SPEC-902-rls-supabase.md`](../specs/SPEC-902-rls-supabase.md)

---

## `000-setup.sql` — siembra propia

Requerido por REQ-929. La suite no puede depender de `supabase/seed-data/`.

| Elemento | Contenido mínimo |
| :--- | :--- |
| Categoría raíz | `Trompeta` (sin padre) |
| Subcategoría | `Sordinas`, hija de `Trompeta` |
| Producto publicado | `status='published'`, `is_active=true` |
| **Producto borrador** | `status='draft'` — **imprescindible** para REQ-923 |
| Producto inactivo | `status='published'`, `is_active=false` |
| Usuario admin | creado con `tests.create_supabase_user()` + fila en `admin_profile` |
| Usuario NO admin | creado con `tests.create_supabase_user()`, sin fila en `admin_profile` |

## `010-rls-habilitado.sql`

| ID | Aserción | Helper | REQ |
| :-- | :--- | :--- | :--- |
| TEST-R01 | RLS habilitado en **todo** el esquema `public` | `tests.rls_enabled('public')` | REQ-921 |
| TEST-R02 | `vendor` tiene RLS aunque no tenga policy de escritura | `tests.rls_enabled('public','vendor')` | REQ-926 |
| TEST-R03 | `home_hero_image`, `home_item`, `home_section_product` con RLS | ídem | REQ-926 |
| TEST-R04 | `admin_profile` tiene RLS | ídem | REQ-927 |

## `020-rls-lectura.sql` — rol `anon`

| ID | Aserción | Método | REQ |
| :-- | :--- | :--- | :--- |
| TEST-R10 | `anon` lee productos publicados y activos | `isnt_empty` | REQ-922 |
| TEST-R11 | `anon` **no** ve productos en `draft` | `is_empty` | REQ-923 |
| TEST-R12 | `anon` lee categorías | `isnt_empty` | REQ-922 |
| TEST-R13 | `anon` lee fotos y características de productos publicados | `isnt_empty` | REQ-922 |
| TEST-R14 | `anon` **no** lee `admin_profile` | `is_empty` | REQ-927 |
| TEST-R15 | `anon` **no** ve fotos de un producto en `draft` | `is_empty` | REQ-923 |

> **TEST-R15 es el hueco que casi nadie tapa.** Se protege `product` y se olvida
> `product_photo`, que tiene su propia policy. El resultado: el producto no aparece,
> pero sus fotos sí se pueden enumerar — y el nombre del archivo suele decir de qué
> producto son.

## `030-rls-escritura.sql`

| ID | Rol | Operación | Esperado | REQ |
| :-- | :--- | :--- | :--- | :--- |
| TEST-R20 | `anon` | `UPDATE product SET price` | 0 filas afectadas | REQ-924 |
| TEST-R21 | `anon` | `INSERT INTO product` | rechazado | REQ-924 |
| TEST-R22 | `anon` | `DELETE FROM category` | 0 filas afectadas | REQ-924 |
| TEST-R23 | `anon` | `UPDATE site_configuration` | 0 filas afectadas | REQ-924 |
| TEST-R24 | autenticado **no** admin | `UPDATE product` | 0 filas afectadas | REQ-925 |
| TEST-R25 | autenticado **no** admin | `INSERT INTO gallery_item` | rechazado | REQ-925 |
| TEST-R26 | autenticado **no** admin | `INSERT INTO admin_profile` (autopromoción) | rechazado | REQ-925 |
| TEST-R27 | admin | `UPDATE product` | 1 fila afectada | REQ-925 |
| TEST-R28 | `anon` | `UPDATE vendor` | 0 filas afectadas | REQ-926 |
| TEST-R29 | autenticado no admin | `INSERT INTO home_item` | rechazado | REQ-926 |

> **TEST-R26 es el test de escalada de privilegios.** Si `admin_profile` acepta un
> `INSERT` de cualquier usuario autenticado, registrarse en el sitio equivale a ser
> administrador y las otras nueve filas de esta tabla dan igual.
>
> **TEST-R27 existe para que la suite no pueda pasar por exceso de celo.** Sin él,
> revocar todos los permisos a todo el mundo pondría los tests en verde y el panel
> de administración inutilizable.

---

## Cobertura de requisitos

| REQ | Tests | Cubierto |
| :--- | :--- | :--- |
| REQ-921 | TEST-R01 | ⏳ |
| REQ-922 | TEST-R10, R12, R13 | ⏳ |
| REQ-923 | TEST-R11, R15 | ⏳ |
| REQ-924 | TEST-R20..R23 | ⏳ |
| REQ-925 | TEST-R24..R27 | ⏳ |
| REQ-926 | TEST-R02, R03, R28, R29 | ⏳ |
| REQ-927 | TEST-R04, R14 | ⏳ |
| REQ-928 | estructura: `begin` / `rollback` en cada archivo | ⏳ |
| REQ-929 | `000-setup.sql` | ⏳ |
| REQ-930 | invocación con `supabase test db` | ⏳ |

## Reglas para el agente

- Toda aserción de vacío usa `is_empty`, **nunca** `SELECT count(*) = 0`. Contar
  filas devuelve cero también cuando la tabla no existe o la consulta está mal
  escrita, y entonces el test pasa sin haber verificado nada.
- Todo archivo empieza con `begin;` + `select plan(N);` y termina con
  `select * from finish();` + `rollback;`.
- `N` en `plan(N)` se actualiza al añadir un test. Si no cuadra, pgTAP lo reporta —
  y eso es una función, no una molestia.
- **Jamás** ejecutar esta suite contra el proyecto de producción (REQ-930). Los
  tests escriben antes de hacer rollback, y un rollback que no llega a ejecutarse
  deja datos reales modificados.

## Al cerrar

Anotar el resultado en el kanban de despliegue bajo `BZ-50`, con fecha. Si alguna
policy resulta estar mal, deja de ser una tarea de testing: es un incidente de
seguridad sobre un sitio ya publicado, y sube a P0 por delante de todo lo demás.
