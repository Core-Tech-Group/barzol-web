# SPEC-001 — Resolución de precio de catálogo

**Estado:** BORRADOR — pendiente de aprobación humana
**Capa:** 1 (lógica pura) · **Autor:** Claude Code (Opus 5) · **Fecha:** 2026-08-21
**Unidad destino:** `src/shared/lib/pricing/catalogPrice.ts`
**Consumidores previstos:** `src/landing/producto/ProductCard.astro`,
`src/landing/producto/ProductoView.astro`

---

## Contexto

Cada producto del catálogo tiene un precio de venta vigente (`price`) y,
opcionalmente, un precio anterior (`original_price`). Cuando el segundo es mayor
que el primero, la ficha muestra el precio tachado y el ahorro.

**Hoy ese cálculo no existe como unidad.** Está implícito en las plantillas
`.astro`, que es la razón por la que no se puede probar sin renderizar. Esta SPEC
lo extrae. Es una **refactorización con contrato**, no una funcionalidad nueva: el
comportamiento visible del sitio no debe cambiar.

## Fuera de alcance

- Cálculo de IGV.
- Costos de envío.
- Precios por volumen o mayoristas.
- Lectura desde Supabase — eso es el mapper (`SPEC-004`, sin escribir).
- **La migración de `price numeric` a entero en Postgres** — decisión abierta
  (`BZ-63`). Esta SPEC opera sobre céntimos que le entrega el borde.

## Vocabulario

- `centimos`: entero. `S/ 160.00` → `16000`.
- `precioVenta`: lo que el cliente paga hoy.
- `precioLista`: precio anterior, tachado. Opcional.

---

## Requisitos (EARS)

### [REQ-001] — Ubicuo
El sistema DEBE representar y devolver todos los montos como enteros en céntimos,
sin realizar aritmética de punto flotante sobre ellos.

### [REQ-002] — Dirigido por estado
MIENTRAS `precioListaCentimos` esté presente y sea estrictamente mayor que
`precioVentaCentimos`, el sistema DEBE marcar la oferta como activa, con
`ahorroCentimos = precioLista - precioVenta` y
`descuentoPct = floor(ahorroCentimos * 100 / precioLista)`.

### [REQ-003] — Dirigido por evento
CUANDO `precioListaCentimos` esté ausente, sea `null`, sea igual o sea menor que
`precioVentaCentimos`, el sistema DEBE devolver la oferta como inactiva, con
`ahorroCentimos = 0`, `descuentoPct = 0` y `precioListaCentimos = null`.

### [REQ-004] — No deseado
SI `precioVentaCentimos` no es un entero mayor que 0, ENTONCES el sistema DEBE
lanzar `PricingError` con código `PRECIO_VENTA_INVALIDO` y no devolver ningún
precio.

### [REQ-005] — No deseado
SI `precioListaCentimos` está presente y no es un entero mayor que 0, ENTONCES el
sistema DEBE lanzar `PricingError` con código `PRECIO_LISTA_INVALIDO`.

### [REQ-006] — Opcional
DONDE se solicite representación textual, el sistema DEBE formatear el monto con
locale `es-PE`, moneda `PEN` y exactamente dos decimales.

### [REQ-007] — No deseado
SI un valor decimal proveniente de Postgres no puede convertirse a un entero de
céntimos exacto —es decir, `Math.round(valor * 100)` difiere de `valor * 100` en
más de una tolerancia de `1e-6`— ENTONCES el conversor DEBE lanzar `PricingError`
con código `PRECIO_NO_REPRESENTABLE`.

> REQ-007 es el requisito que el documento base no tenía y que la realidad del
> repo exige: mientras la base de datos guarde `numeric`, alguien puede escribir
> `160.005` desde el panel. Callarlo y redondear es cómo se pierde un céntimo por
> venta sin que nadie lo note durante un año.

---

## Contrato

```typescript
export type PricingErrorCode =
  | 'PRECIO_VENTA_INVALIDO'
  | 'PRECIO_LISTA_INVALIDO'
  | 'PRECIO_NO_REPRESENTABLE';

export interface CatalogPriceInput {
  precioVentaCentimos: number;
  precioListaCentimos?: number | null;
}

export interface CatalogPrice {
  precioVentaCentimos: number;
  precioListaCentimos: number | null;
  ahorroCentimos: number;
  descuentoPct: number;
  ofertaActiva: boolean;
}

export function resolveCatalogPrice(input: CatalogPriceInput): CatalogPrice;
export function formatPEN(centimos: number): string;
export function decimalACentimos(valor: number): number; // REQ-007
```

## Invariantes verificables

- **INV-1:** `precioVentaCentimos + ahorroCentimos === precioListaCentimos`
  siempre que `ofertaActiva === true`.
- **INV-2:** `descuentoPct` ∈ `[0, 99]`.
- **INV-3:** `ofertaActiva === false` ⟺ `precioListaCentimos === null`.
- **INV-4:** `resolveCatalogPrice` es total: para toda entrada, o devuelve un
  `CatalogPrice` que cumple INV-1..3, o lanza `PricingError`. Nunca `undefined`,
  nunca `NaN`.

## Datos reales de referencia

Tomados de `BARZOL_CONTEXTO.md`, para que la matriz de pruebas no invente cifras:

| Producto | Venta | Lista |
| :--- | ---: | ---: |
| Sordina silenciador trombón | S/ 160.00 | — |
| Sordina silenciador trompeta | S/ 120.00 | — |
| BERP | S/ 85.00 | — |
| Atril de celular trombón (tudel delgado) | S/ 100.00 | — |

**Ninguno tiene hoy `original_price` cargado.** Los casos de oferta de la matriz de
pruebas son sintéticos y están marcados como tales — asumir lo contrario sería
inventar datos de negocio.
