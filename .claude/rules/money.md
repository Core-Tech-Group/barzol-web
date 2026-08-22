---
alwaysApply: true
---

# Regla de dinero — barzol-web

Moneda: **PEN**. Locale: **es-PE**. Precios reales en soles (S/ 85.00 – S/ 210.00).

## Dentro de la lógica pura: céntimos enteros

`S/ 160.00` → `16000`. Los nombres terminan en `Centimos` / `_centimos`.

Prohibido: `parseFloat`, `toFixed` sobre precios, aritmética de punto flotante
sobre montos, `/ 100` fuera de `formatPEN()`.

Los porcentajes: `Math.floor((parte * 100) / total)`. Nunca redondeo implícito.

## En la frontera: el mapper convierte

Postgres guarda `price` y `original_price` como `numeric`, y llegan al dominio como
`number` decimal. La conversión ocurre **en el mapper**:

```ts
const precioCentimos = Math.round(row.price * 100);
```

validada con `Number.isInteger` y con el margen de error de `SPEC-001` REQ-007.

## Lo que NO se hace en un commit suelto

`Product.precio` y `Product.precioOriginal` siguen siendo `number` decimal **hasta
que `BZ-63` se decida**. Cambiar ese tipo obliga a migrar Postgres y a tocar admin,
landing y mapeadores a la vez. Es una migración, no un refactor, y es exactamente
la clase de cambio que rompe producción un sábado.

## Oferta

No es una columna: es estado derivado. Hay oferta cuando `precioOriginal` existe y
es **estrictamente mayor** que `precio`. Contrato completo en `SPEC-001`.

Cuidado con `if (!precioOriginal)`: el valor `0` es "presente e inválido", no
"ausente", y cae por la rama equivocada.
