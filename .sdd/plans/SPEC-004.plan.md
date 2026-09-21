# PLAN DE PRUEBAS — SPEC-004 · Orden manual de productos

**Archivos destino:**
`tests/unit/productos/ordenProducto.test.ts` ·
`tests/unit/validation/ordenProductosSchema.test.ts` ·
`tests/unit/landing/ordenProductos.test.ts` ·
`tests/unit/admin/ordenAdmin.test.ts` ·
`tests/unit/productos/migracionOrden.test.ts` ·
`tests/workers/api/productosOrden.test.ts`
**Proyecto Vitest:** `unit` + `workers` · **Umbral:** Capa 1 ≥95 % líneas / ≥90 % ramas · Capa 3 ≥70 %
**Fuente:** [`../specs/SPEC-004-orden-productos.md`](../specs/SPEC-004-orden-productos.md)

---

## Matriz

| ID | Escenario | Entrada | Esperado | REQ |
| :-- | :--- | :--- | :--- | :--- |
| TEST-060 | Instrumento vacío | `siguienteOrden([])` | `0` | REQ-402 |
| TEST-061 | Con huecos | `siguienteOrden([0, 5, 2])` | `6` | REQ-402 |
| TEST-062 | Alta | `ordenAlGuardar({ instrumentoAnterior: null, …, ordenesDelInstrumentoNuevo: [0, 1] })` | `2` | REQ-402 |
| TEST-063 | Edición sin cambiar instrumento | anterior = nuevo = `'1'`, `ordenActual: 4` | `4` | REQ-403 |
| TEST-064 | Cambio de instrumento | anterior `'1'`, nuevo `'2'`, órdenes del nuevo `[0, 3]` | `4` | REQ-403 |
| TEST-065 | Orden ascendente | tres productos con `orden` 2, 0, 1 | `0, 1, 2` | REQ-401, REQ-413 |
| TEST-066 | Empate | mismo `orden`; distinta fecha, luego misma fecha e ids 7 y 9 | reciente primero; a igual fecha, id 9 primero | REQ-404 |
| TEST-067 | Determinismo | todas las permutaciones de 4 productos | misma salida siempre | REQ-404 |
| TEST-068 | Varios instrumentos | mapa `{a: 1, b: 0}`, productos de `a` y `b` | todos los de `b` antes que los de `a`, cada grupo por `orden` | REQ-414 |
| TEST-069 | Instrumento no recibido | producto con `categoriaId` fuera del mapa | queda último | REQ-414 |
| TEST-070 | Nada que guardar | `orden` = índice en toda la lista | `[]` | REQ-408 |
| TEST-071 | Intercambio | A(0), B(1), C(2) → B, A, C | `[{B,0},{A,1}]` | REQ-408 |
| TEST-072 | Huecos | A(0), B(2), C(5) sin mover | `[{B,1},{C,2}]` | REQ-408 |
| TEST-073 | Mapper | fila con `sort_order: 3` | `Product.orden === 3` | REQ-401 |
| TEST-074 | Cuerpo válido | `{ cambios: [{ id: '1', orden: 0 }] }` | `success: true` | REQ-411 |
| TEST-075 | Cuerpo inválido (`it.each`) | `[]`, id repetido, `-1`, `1.5`, `'2'`, sin `cambios` | `success: false` | REQ-411 |
| TEST-076 | Opciones | `ORDEN_OPCIONES`, `ORDEN_POR_DEFECTO` | primera y por defecto `'recomendados'`; siguen las otras tres | REQ-412 |
| TEST-077 | Parámetro | `parseOrden(null)`, `('xyz')`, `('nuevos')` | `recomendados`, `recomendados`, `nuevos` | REQ-416 |
| TEST-078 | Enlaces | `hrefParaOrden('/busqueda', q=sordina&page=3, …)` | por defecto: `/busqueda?q=sordina`; otra opción: con `orden`, sin `page` | REQ-412 |
| TEST-079 | Catálogo de un instrumento | `ordenarProductos(…, 'recomendados', mapa)` | por `orden` | REQ-413 |
| TEST-080 | Catálogo completo | productos de dos instrumentos | instrumento, luego `orden` | REQ-414 |
| TEST-081 | Sin mutar | arreglo congelado con `Object.freeze` | no lanza; el original igual | REQ-413 |
| TEST-082 | Modo del listado | `(null,'')`, `('Trompeta','')`, `('Trompeta','sor')` | `recientes`, `reordenar`, `recientes` | REQ-405, REQ-406 |
| TEST-083 | Orden del admin | mismos productos en ambos modos | `reordenar`: por `orden`, `paginar: false`; `recientes`: por fecha, `paginar: true` | REQ-405, REQ-406 |
| TEST-084 | Cambios sin guardar | lista en su índice / lista movida | `false` / `true` | REQ-407 |
| TEST-085 | Guardar | `guardarOrden(cambios, fake)` | una sola petición `PATCH /api/productos/orden` con esos `cambios` | REQ-408 |
| TEST-086 | Fallo | el fake responde `{ success: false, message: 'X' }` | lanza con `'X'` | REQ-409 |
| TEST-087 | Migración: columna | contenido de `supabase/pendiente-orden-productos.sql` | agrega `sort_order int NOT NULL`, numera por instrumento con `created_at DESC, id DESC` | REQ-415 |
| TEST-088 | Migración: función | mismo archivo | declara `reordenar_productos(jsonb)` con `security invoker`, un único `update … from jsonb_to_recordset`, `revoke` a `public`/`anon` y `grant` a `authenticated` | REQ-410, REQ-415 |
| TEST-W060 | PATCH válido | admin, dos cambios | `200`; cambian esos `sort_order`; fotos y características intactas | REQ-410 |
| TEST-W063 | Una sola llamada | admin, 12 cambios | el fake de Supabase registra **una** llamada, a `rpc('reordenar_productos')` | REQ-410 |
| TEST-W061 | PATCH inválido | id repetido | `400`; ningún `sort_order` cambió | REQ-411 |
| TEST-W062 | Sin sesión | PATCH sin cookie | `401` | REQ-411 |
| TEST-089 | Índice y movimiento numérico en categoría | mover de posición 7 a 1 | números visibles `1..N`, orden local actualizado | REQ-417 |
| TEST-090 | DB sin columna/función | fila antigua o RPC ausente | listado estable; guardado informa migración pendiente | REQ-418 |

> Prefijos: sin prefijo = capa 1 · `W` = workerd.

## Cobertura de requisitos

| REQ | Tests | Cubierto |
| :--- | :--- | :--- |
| REQ-401 | TEST-065, TEST-073 | ⏳ |
| REQ-402 | TEST-060, TEST-061, TEST-062 | ⏳ |
| REQ-403 | TEST-063, TEST-064 | ⏳ |
| REQ-404 | TEST-066, TEST-067 | ⏳ |
| REQ-405 | TEST-082, TEST-083 | ⏳ |
| REQ-406 | TEST-082, TEST-083 | ⏳ |
| REQ-407 | TEST-084 | ⏳ |
| REQ-408 | TEST-070, TEST-071, TEST-072, TEST-085 | ⏳ |
| REQ-409 | TEST-086 | ⏳ |
| REQ-410 | TEST-W060, TEST-W063, TEST-088 | ⏳ |
| REQ-411 | TEST-074, TEST-075, TEST-W061, TEST-W062 | ⏳ |
| REQ-412 | TEST-076, TEST-078 | ⏳ |
| REQ-413 | TEST-065, TEST-079, TEST-081 | ⏳ |
| REQ-414 | TEST-068, TEST-069, TEST-080 | ⏳ |
| REQ-415 | TEST-087, TEST-088 | ⏳ |
| REQ-416 | TEST-077 | ⏳ |
| REQ-417 | TEST-089 | ⏳ |
| REQ-418 | TEST-090 | ⏳ |

**Huecos declarados:**
- **REQ-405–407 y REQ-409** tienen pruebas de lógica y una interacción de la isla
  en jsdom (`ordenAdminUI.test.ts`). El arrastre físico y la navegación real
  siguen pendientes de la matriz manual y de un navegador compatible.
- **REQ-415 (TEST-087, TEST-088)** comprueba lo que la migración **declara**,
  no que esté aplicada. Igual que SPEC-904 REQ-979.
- **La atomicidad de REQ-410 no la prueba ningún test de este plan.** El fake
  de Supabase no es Postgres: TEST-W063 prueba que hay una sola llamada, y
  TEST-088 que la función es una sola sentencia. Que un fallo no deje filas a
  medias lo garantiza Postgres (una sentencia es atómica); verificarlo contra
  la base real es `BZ-70` (pgTAP).

## Reglas para el agente

- No añadir casos fuera de esta matriz sin actualizar antes la SPEC.
- Prohibido `toMatchSnapshot()` (Constitución 5.5).
- Prohibido asertar sobre mocks cuando exista una aserción observable (5.4).
  En TEST-085 lo observable es la petición que recibe el fake: se afirma sobre
  su URL, método y cuerpo, no sobre `toHaveBeenCalledWith`. **TEST-W063** sí
  cuenta las llamadas registradas por el fake de Supabase: la cantidad de viajes
  a la base **es** el comportamiento especificado (INV-7) y no hay otra forma de
  observarla.
- Un solo `Act` por test (2.3). Estructura AAA con `// Arrange`, `// Act`, `// Assert`.
- `ordenProducto.ts` es lógica pura: sin `Date.now()` ni `new Date()` (6.1).
  Las fechas llegan en los productos.
- TEST-W060–W062 usan el fake de Supabase de `tests/fakes/` (5.2) y los bindings
  reales de Miniflare (5.1).
- **No agregar la UI de reordenar dentro de `ProductsAdmin.tsx`** (1.423 líneas,
  trinquete `BZ-79`): va en un componente aparte que usa `ordenAdmin.ts`.
