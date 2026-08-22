# PLAN DE PRUEBAS — SPEC-001 · Precio de catálogo

**Archivo destino:** `tests/unit/pricing/catalogPrice.test.ts`
**Proyecto Vitest:** `unit` · **Umbral:** líneas ≥95%, ramas ≥90%
**Fuente:** [`../specs/SPEC-001-precio-catalogo.md`](../specs/SPEC-001-precio-catalogo.md)

---

## Matriz — `resolveCatalogPrice`

| ID | Escenario | Entrada (céntimos) | Esperado | REQ |
| :-- | :--- | :--- | :--- | :--- |
| TEST-001 | Sin precio de lista (Sordina trombón, dato real) | `{ venta: 16000 }` | `oferta:false · lista:null · ahorro:0 · pct:0` | REQ-003 |
| TEST-002 | Oferta activa (sintético) | `{ venta: 16000, lista: 18000 }` | `oferta:true · ahorro:2000 · pct:11` | REQ-002 |
| TEST-003 | Oferta activa, segundo caso (sintético) | `{ venta: 8500, lista: 10000 }` | `oferta:true · ahorro:1500 · pct:15` | REQ-002 |
| TEST-004 | Lista igual a venta | `{ venta: 12000, lista: 12000 }` | `oferta:false · lista:null` | REQ-003 |
| TEST-005 | Lista menor que venta | `{ venta: 12000, lista: 10000 }` | `oferta:false · lista:null` | REQ-003 |
| TEST-006 | Lista explícitamente `null` | `{ venta: 10000, lista: null }` | `oferta:false` | REQ-003 |
| TEST-007 | Venta cero | `{ venta: 0 }` | lanza `PRECIO_VENTA_INVALIDO` | REQ-004 |
| TEST-008 | Venta negativa | `{ venta: -100 }` | lanza `PRECIO_VENTA_INVALIDO` | REQ-004 |
| TEST-009 | Venta decimal | `{ venta: 160.5 }` | lanza `PRECIO_VENTA_INVALIDO` | REQ-001, REQ-004 |
| TEST-010 | Venta `NaN` | `{ venta: NaN }` | lanza `PRECIO_VENTA_INVALIDO` | REQ-004 |
| TEST-011 | Lista decimal | `{ venta: 16000, lista: 180.5 }` | lanza `PRECIO_LISTA_INVALIDO` | REQ-005 |
| TEST-012 | Lista cero (presente pero inválida) | `{ venta: 16000, lista: 0 }` | lanza `PRECIO_LISTA_INVALIDO` | REQ-005 |
| TEST-013 | El pct se trunca, no se redondea | `{ venta: 19999, lista: 20000 }` | `pct:0` y `oferta:true` | REQ-002 |
| TEST-014 | INV-1 e INV-2 en 200 casos generados | semilla fija `20260821` | `venta+ahorro===lista` y `pct∈[0,99]` | REQ-002 |

> TEST-012 merece una nota: `lista: 0` es "presente e inválida", no "ausente". Si la
> implementación comprueba la ausencia con `if (!lista)`, el cero cae por la rama
> equivocada y este test es el único que lo detecta.

## Matriz — `formatPEN`

| ID | Escenario | Entrada | Esperado | REQ |
| :-- | :--- | ---: | :--- | :--- |
| TEST-015 | Formato base | `16000` | `"S/ 160.00"` | REQ-006 |
| TEST-016 | Agrupación de miles | `123456789` | `"S/ 1,234,567.89"` | REQ-006 |
| TEST-017 | Cero | `0` | `"S/ 0.00"` | REQ-006 |
| TEST-018 | Sin espacio duro (NBSP) en la salida | `8500` | la cadena no contiene ` ` | REQ-006 |

> TEST-018 no es cosmético. `Intl` emite un NBSP tras el símbolo de moneda; si no se
> normaliza, cualquier aserción de igualdad escrita con un espacio normal falla y
> el siguiente que la lea la "arreglará" con un `toContain` que ya no verifica nada.

## Matriz — `decimalACentimos`

| ID | Escenario | Entrada | Esperado | REQ |
| :-- | :--- | ---: | :--- | :--- |
| TEST-019 | Decimal exacto de dos cifras | `160.00` | `16000` | REQ-007 |
| TEST-020 | Decimal con error de coma flotante | `1.005` | lanza `PRECIO_NO_REPRESENTABLE` | REQ-007 |
| TEST-021 | Entero limpio | `85` | `8500` | REQ-007 |
| TEST-022 | Tres decimales significativos | `160.005` | lanza `PRECIO_NO_REPRESENTABLE` | REQ-007 |
| TEST-023 | Negativo | `-1` | lanza `PRECIO_NO_REPRESENTABLE` | REQ-007 |

---

## Cobertura de requisitos

| REQ | Tests | Cubierto |
| :--- | :--- | :--- |
| REQ-001 | TEST-009, TEST-014 | ✅ |
| REQ-002 | TEST-002, 003, 013, 014 | ✅ |
| REQ-003 | TEST-001, 004, 005, 006 | ✅ |
| REQ-004 | TEST-007, 008, 009, 010 | ✅ |
| REQ-005 | TEST-011, 012 | ✅ |
| REQ-006 | TEST-015..018 | ✅ |
| REQ-007 | TEST-019..023 | ✅ |

## Reglas para el agente

- No añadir casos fuera de esta matriz sin actualizar antes la SPEC.
- Prohibido `toMatchSnapshot()`. Todas las aserciones son explícitas.
- TEST-014 usa un generador determinista con semilla fija — nada de `Math.random()`.
- Los casos marcados *(sintético)* no son datos de negocio reales. No convertirlos
  en fixtures compartidas ni citarlos como precios de Barzol.
