# SPEC-004 — Orden manual de productos ("Recomendados")

**Estado:** BORRADOR
**Capa:** 1 lógica + 3 workerd + 4 base de datos + presentación
**Autor:** Claude (a pedido del responsable) · **Fecha:** 2026-09-11
**Unidades destino:**
`src/shared/lib/productos/ordenProducto.ts` (**no existe**) ·
`productoMapper.ts` · `productoService.ts` · `validation/productoSchema.ts` ·
`src/pages/api/productos/orden.ts` (**no existe**) ·
`src/landing/shared/ordenProductos.ts` · `SortSelect.astro` · `CatalogoView.astro` ·
`BusquedaView.astro` · `src/admin/productos/ordenAdmin.ts` (**no existe**) + isla del
admin · `supabase/pendiente-orden-productos.sql` (**no existe**)

---

## Contexto

El responsable quiere decidir qué productos se ven primero dentro de cada
categoría del sitio. Hoy no se puede: `product` no tiene columna de orden —se
quitó a propósito (`supabase/schema.sql:110`)— y el catálogo solo ordena por
fecha o precio (`landing/shared/ordenProductos.ts`, opción por defecto
`'nuevos'`). El listado del admin ordena "más recientes primero" desde el
2026-09-10 (`ProductosView.astro`).

Cada producto pertenece a **un solo instrumento** (`Product.categoriaId`, que el
mapper deriva aunque `product.category_id` apunte a una subcategoría — ver
`GLOSSARY.md`). Por eso alcanza con **una** columna `sort_order` en `product`: la
prioridad del producto dentro de su instrumento. No hace falta tabla intermedia.

Decisiones ya tomadas con el responsable (2026-09-10): reordenar arrastrando en
el admin con botón "Guardar orden"; enviar solo lo que cambió; producto nuevo al
final; "Recomendados" como orden por defecto del sitio.

## Fuera de alcance

- **"Más productos de {categoría}"** en la ficha y las **secciones del home**: el
  home tiene su propio orden en `/admin/inicio`, y la ficha pide 4 productos con
  `limit` sin `order` (arbitrarios). Candidato a SPEC siguiente.
- **Prioridad por subcategoría**: el grupo de orden es el instrumento.
- **Dos administradores guardando a la vez**: gana el último guardado. No hay
  bloqueo optimista.
- **Reordenar en táctil**: el arrastre del panel en pantallas táctiles es
  `SPEC-907` (BORRADOR).
- **Reenumerar al borrar**: borrar un producto deja un hueco en `sort_order`; el
  orden relativo de los demás no cambia y no se reescribe nada.
- **Relevancia textual** en la búsqueda.

## Vocabulario

- **Orden** (`orden` en el dominio, `sort_order` en la base): entero ≥ 0,
  menor = antes. Solo compara productos del mismo instrumento.
- **Recomendados**: la opción del selector "Ordenar por" que usa ese orden.

---

## Requisitos (EARS)

### Datos

### [REQ-401] — Ubicuo · prioridad por instrumento
El sistema DEBE guardar para cada producto un `orden` entero ≥ 0 que define su
posición entre los productos de su mismo instrumento.

### [REQ-402] — Dirigido por evento · alta al final
CUANDO se cree un producto, el sistema DEBE asignarle como `orden` el mayor
`orden` de su instrumento más uno, o `0` si el instrumento no tiene productos.

> No se delega en `DEFAULT 0` de la columna: con eso cada alta empataría en el
> primer lugar.

### [REQ-403] — Dirigido por evento · cambio de instrumento
CUANDO se edite un producto, el sistema DEBE conservar su `orden` si su
instrumento no cambió, y DEBE asignarle el mayor `orden` del instrumento nuevo
más uno si cambió.

### [REQ-404] — No deseado · empates
SI dos productos comparados por `orden` tienen el mismo valor, ENTONCES el
sistema DEBE ubicar antes el de `createdAt` más reciente y, a igual fecha, el de
`id` numérico mayor.

> Hace el orden total y determinista: la misma entrada da siempre la misma lista.

### Admin

### [REQ-405] — Dirigido por estado · modo reordenar
MIENTRAS el listado del admin esté filtrado por un instrumento y sin texto de
búsqueda, el sistema DEBE mostrar todos los productos de ese instrumento en su
`orden`, sin paginar, y DEBE permitir reordenarlos arrastrando.

> Sin paginar porque no se puede arrastrar un producto a otra página.

### [REQ-406] — Dirigido por estado · fuera del modo reordenar
MIENTRAS el filtro sea "todas las categorías" o haya texto de búsqueda, el
sistema DEBE listar "más recientes primero" y NO DEBE permitir arrastrar.

### [REQ-407] — Dirigido por estado · cambios sin guardar
MIENTRAS haya un orden modificado sin guardar, el sistema DEBE mostrar el botón
"Guardar orden" y DEBE pedir confirmación antes de abandonar la página (mecanismo
existente `window.__adminHasUnsavedChanges`).

### [REQ-408] — Dirigido por evento · solo lo que cambió
CUANDO el administrador guarde el orden, el sistema DEBE enviar únicamente los
productos cuyo `orden` actual difiere de su nueva posición (índice 0..n-1 en la
lista), cada uno con esa posición como `orden`.

### [REQ-409] — Dirigido por evento · el fallo se ve
CUANDO el guardado del orden falle, el sistema DEBE mostrar el mensaje del
servidor y NO DEBE dar el orden por guardado.

### Endpoint

### [REQ-410] — Dirigido por evento · escribir solo el orden, en una transacción
CUANDO llegue `PATCH /api/productos/orden` con un cuerpo válido y sesión de
administrador, el sistema DEBE actualizar únicamente `sort_order` de los
productos indicados **en una sola sentencia**, mediante la función
`reordenar_productos(jsonb)`, y DEBE responder `200`.

> No reutiliza `PUT /api/productos/[id]`: ese reemplaza fotos y características
> completas en cada llamada (`replacePhotosAndFeatures`).
>
> **Decisión del responsable (2026-09-11).** Mover el último producto al primer
> lugar cambia la posición de todos los de la categoría. Con un `UPDATE` por
> fila serían N viajes a Supabase y, sin transacción, un fallo a mitad dejaría
> el orden a medias. Una sola sentencia es 1 viaje y todo-o-nada. Se descartó
> la numeración con huecos (1000, 2000…): ahorra escrituras pero obliga a
> renumerar, y los catálogos de este tamaño no lo justifican.

### [REQ-411] — No deseado · cuerpo inválido
SI el cuerpo no tiene cambios, repite un `id` o trae un `orden` que no es entero
≥ 0, ENTONCES el sistema DEBE responder `400` y NO DEBE escribir nada.

> La falta de sesión la rechaza el middleware existente con `401`
> (`src/middleware.ts:53`). **Verificado el 2026-09-11:** la condición es
> `method !== 'GET'` (`middleware.ts:41`), así que cubre `PATCH` aunque el
> comentario solo nombre POST/PUT/DELETE.

### Sitio público

### [REQ-412] — Ubicuo · la opción y su valor por defecto
El selector "Ordenar por" DEBE ofrecer "Recomendados" como primera opción y
como valor por defecto, además de "Más recientes", "Precio: menor a mayor" y
"Precio: mayor a menor". Los enlaces que el sistema genera para el valor por
defecto (selector y "Limpiar") NO DEBEN incluir `?orden=`.

### [REQ-416] — No deseado · parámetro ausente o desconocido
SI `?orden=` falta o no corresponde a una opción del selector, ENTONCES el
sistema DEBE aplicar "Recomendados".

> Incluye `?orden=nuevos` de enlaces viejos: esa opción sigue existiendo y se
> respeta; solo deja de ser la de por defecto.

### [REQ-413] — Dirigido por estado · una categoría
MIENTRAS se liste un instrumento (`/catalogo/[categoria]`) con "Recomendados",
el sistema DEBE ordenar por `orden` ascendente, con el desempate de REQ-404.

### [REQ-414] — Dirigido por estado · varias categorías
MIENTRAS se liste el catálogo completo (`/catalogo`) o una búsqueda
(`/busqueda`) con "Recomendados", el sistema DEBE ordenar primero por el orden
del instrumento (`category.sort_order`, el del admin de categorías) y luego por
el `orden` del producto. Un producto cuyo instrumento no figure en las
categorías recibidas DEBE ir al final.

### Migración

### [REQ-415] — Dirigido por evento · valor inicial
CUANDO se aplique la migración, el sistema DEBE crear `product.sort_order`,
DEBE numerar los productos existentes de cada instrumento desde `0`, en el orden
"más recientes primero" (REQ-404 como desempate), y DEBE crear la función
`reordenar_productos(jsonb)` con `security invoker`, ejecutable por
`authenticated` y no por `anon`.

> `security invoker`: corre con los permisos del administrador conectado, así
> que la policy RLS "admin write" de `product` sigue decidiendo quién escribe.
> Postgres concede `EXECUTE` a `PUBLIC` por defecto; se revoca explícitamente.

> **Supuesto:** así "Recomendados" arranca mostrando lo mismo que hoy muestra el
> sitio por defecto, y nada cambia de lugar el día que se publica.

---

## Contrato

```typescript
// src/shared/types/index.ts
interface Product {
  // ...campos existentes
  orden: number; // REQ-401 · sort_order
}

// src/shared/lib/productos/ordenProducto.ts — lógica pura, nuevo
type ProductoOrdenable = Pick<Product, 'id' | 'categoriaId' | 'orden' | 'createdAt'>;

/** REQ-402 — mayor + 1, o 0 si no hay. */
export function siguienteOrden(ordenesDelInstrumento: readonly number[]): number;

/** REQ-402/403 — el `sort_order` que se escribe al crear o editar.
 *  `instrumentoAnterior: null` = alta. */
export function ordenAlGuardar(p: {
  instrumentoAnterior: string | null;
  instrumentoNuevo: string;
  ordenActual: number | null;
  ordenesDelInstrumentoNuevo: readonly number[];
}): number;

/** REQ-404/413 — comparador total para productos de un instrumento. */
export function compararPorOrden(a: ProductoOrdenable, b: ProductoOrdenable): number;

/** REQ-414 — instrumento por `ordenInstrumento`, luego `compararPorOrden`. */
export function compararRecomendado(
  ordenInstrumento: ReadonlyMap<string, number>
): (a: ProductoOrdenable, b: ProductoOrdenable) => number;

export interface CambioOrden { id: string; orden: number }

/** REQ-408 — los que no están en su índice, con el índice como orden. */
export function cambiosDeOrden(lista: readonly Pick<Product, 'id' | 'orden'>[]): CambioOrden[];

// src/shared/lib/validation/productoSchema.ts
export const ordenProductosSchema: z.ZodType<{ cambios: CambioOrden[] }>; // REQ-411

// src/shared/lib/productos/productoService.ts
// REQ-410 — una sola llamada: supabaseAuth.rpc('reordenar_productos', { cambios })
export function actualizarOrdenProductos(supabaseAuth: SupabaseClient, cambios: CambioOrden[]): Promise<void>;

// supabase/pendiente-orden-productos.sql — REQ-410/415
// create function reordenar_productos(cambios jsonb) returns void
//   language sql security invoker as $$
//   update product p set sort_order = c.orden
//   from jsonb_to_recordset(cambios) as c(id int, orden int)
//   where p.id = c.id; $$;
// revoke execute … from public, anon; grant execute … to authenticated;
// createProducto / updateProducto calculan sort_order (REQ-402/403)

// src/pages/api/productos/orden.ts
export const PATCH: APIRoute; // REQ-410/411

// src/landing/shared/ordenProductos.ts
// ORDEN_OPCIONES gana { valor: 'recomendados', label: 'Recomendados' } primero
// ORDEN_POR_DEFECTO = 'recomendados'
export function ordenarProductos<T extends ProductoOrdenable & Pick<Product, 'precio'>>(
  productos: T[],
  orden: OrdenValor,
  ordenInstrumento: ReadonlyMap<string, number>
): T[];
/** REQ-412 — href de cada opción: conserva los demás parámetros, quita `page`
 *  y omite `orden` si es el valor por defecto. Lo usan SortSelect y "Limpiar". */
export function hrefParaOrden(pathname: string, params: URLSearchParams, valor: OrdenValor): string;

// src/admin/productos/ordenAdmin.ts — lógica del panel, fuera de la isla
// (mismo criterio que admin/shared/guardarGaleria.ts en SPEC-905)
export type ModoListado = 'reordenar' | 'recientes';
/** REQ-405/406 — `filtroInstrumento: null` = todas las categorías. */
export function modoListado(filtroInstrumento: string | null, busqueda: string): ModoListado;
/** REQ-405/406 — orden del listado y si se pagina. */
export function ordenarParaAdmin<T extends ProductoOrdenable>(productos: T[], modo: ModoListado): { items: T[]; paginar: boolean };
/** REQ-407 */
export function hayOrdenSinGuardar(lista: readonly Pick<Product, 'id' | 'orden'>[]): boolean;
/** REQ-408/409 — PATCH con `cambiosDeOrden`; lanza con el mensaje del servidor. */
export function guardarOrden(cambios: CambioOrden[], enviar?: (url: string, init: RequestInit) => Promise<Response>): Promise<void>;
```

## Invariantes verificables

- **INV-1:** `siguienteOrden([]) === 0` y, para toda lista no vacía `xs`,
  `siguienteOrden(xs) === Math.max(...xs) + 1`.
- **INV-2:** para toda permutación `p` de una lista `xs`,
  `[...p].sort(compararPorOrden)` es igual a `[...xs].sort(compararPorOrden)`.
- **INV-3:** si `lista` ya tiene `orden === índice` en todos sus elementos,
  `cambiosDeOrden(lista)` es `[]`; y aplicar sus cambios deja
  `orden === índice` en todos.
- **INV-4:** `ordenarProductos` no muta el arreglo recibido.
- **INV-5:** `parseOrden(null) === 'recomendados'`,
  `parseOrden('cualquier-cosa') === 'recomendados'` y
  `parseOrden('nuevos') === 'nuevos'`.
- **INV-6:** un `PATCH /api/productos/orden` que responde `400` deja
  `sort_order` de todos los productos igual que antes.
- **INV-7:** un `PATCH` válido produce exactamente **una** llamada a Supabase
  (`rpc('reordenar_productos')`), sin importar cuántos productos cambien.

## Riesgo de regresión

- **Pisar fotos al guardar el orden**, si se reutiliza `PUT /api/productos/[id]`
  (REQ-410 existe por esto).
- **Todo empatado en 0** si el alta usa el default de la columna: los productos
  nuevos saltarían al primer lugar (REQ-402).
- **Enlaces viejos con `?orden=nuevos`** tienen que seguir funcionando: la
  opción no se quita, solo deja de ser la de por defecto.
- **Cambio de orden visible el día del despliegue** si la migración numera
  distinto de "más recientes primero" (REQ-415).
- **`ProductsAdmin.tsx` tiene 1.423 líneas** y está en el trinquete de `BZ-79`.
  La UI de reordenar va en un módulo aparte, no dentro de ese archivo.
- `schema.sql:110`, `DATABASE_SCHEMA.md` y `SCHEMA_REFERENCE.md` dicen que
  `product` no tiene `sort_order`: hay que corregirlos con la migración.
