# PLAN DE PRUEBAS — SPEC-003 · Slug público unificado

**Archivo destino:** `tests/unit/text/slugify.test.ts`
**Proyecto Vitest:** `unit` · **Umbral:** líneas ≥95%, ramas ≥90%
**Fuente:** [`../specs/SPEC-003-slug-publico.md`](../specs/SPEC-003-slug-publico.md)

> Este PLAN tiene una particularidad: su test más importante no verifica que la
> función haga algo bien, sino que **haga exactamente lo mismo que antes**. El slug
> es la URL pública y no se persiste, así que cualquier diferencia rompe enlaces
> vivos sin migración posible.

---

## Matriz — comportamiento

| ID | Escenario | Entrada | Esperado | REQ |
| :-- | :--- | :--- | :--- | :--- |
| TEST-301 | Nombre simple | `Sordinas` | `sordinas` | REQ-302 |
| TEST-303 | Tildes | `Trombón` | `trombon` | REQ-302 |
| TEST-304 | Diéresis y eñe | `Piñón güiro` | `pinon-guiro` | REQ-302 |
| TEST-305 | Paréntesis (caso real) | `Atril de celular para trombón (tudel delgado)` | `atril-de-celular-para-trombon-tudel-delgado` | REQ-302 |
| TEST-306 | Espacios al borde | `  Soportes  ` | `soportes` | REQ-302 |
| TEST-307 | Espacios múltiples internos | `Sordina    trompeta` | `sordina-trompeta` | REQ-302 |
| TEST-308 | Símbolos colapsados | `BERP / trompeta & trombón` | `berp-trompeta-trombon` | REQ-302 |
| TEST-309 | Números conservados | `Barzol 3D Industry` | `barzol-3d-industry` | REQ-302 |
| TEST-310 | Guiones ya presentes | `soporte--celular` | `soporte-celular` | REQ-302 |
| TEST-311 | Entrada vacía | `''` | `''` | REQ-304 |
| TEST-312 | Solo símbolos | `!!!` | `''` | REQ-304 |
| TEST-313 | Solo espacios | `'   '` | `''` | REQ-304 |
| TEST-314 | Idempotencia | corpus completo | `slugify(slugify(x)) === slugify(x)` | REQ-305, INV-4 |
| TEST-315 | INV-1..3 sobre el corpus | corpus completo | solo `[a-z0-9-]`, sin `-` en los bordes, sin `--` | INV-1..3 |

> TEST-311 a TEST-313 fijan el retorno vacío como **contrato**, no como accidente.
> Están juntos a propósito: si alguien decide más adelante devolver un valor
> sustituto, los tres fallan a la vez y obligan a pasar por la SPEC.

## Matriz — no regresión (REQ-303)

| ID | Escenario | Método | REQ |
| :-- | :--- | :--- | :--- |
| TEST-320 | Equivalencia con `categoriaMapper.slugify` | copia congelada en `tests/fixtures/slugify-legacy.ts`, comparada sobre el corpus | REQ-303 |
| TEST-321 | Equivalencia con `productoMapper.slugify` | ídem | REQ-303 |
| TEST-322 | Las dos copias actuales son idénticas entre sí | comparar ambas sobre el corpus | REQ-303 |

> **TEST-322 hay que ejecutarlo primero y en solitario.** Toda la SPEC asume que las
> dos copias ya son idénticas. Si no lo son, no estamos ante una extracción sino
> ante un bug en producción —dos partes del sitio generando URLs con reglas
> distintas—, y `BZ-61` cambia de naturaleza antes de escribir una línea de código.

## Corpus obligatorio

Definido en `tests/fixtures/nombres-reales.ts`. Mínimo:

- **Categorías del menú:** `Soportes`, `Sordinas`, `Trompeta`, `Trombón`, `Tuba`,
  `Euphonium`.
- **Productos de `BARZOL_CONTEXTO.md`:** las cuatro variantes de atril con tudel
  (`delgado` / `ancho`, `King/Yamaha/Jupiter`), `Sordina silenciador para trombón`,
  `Sordina silenciador para trompeta`, `BERP (para trombón, trompeta y euphonium)`.
- **Bordes:** los de TEST-311..313.

Añadir un nombre al corpus no requiere enmienda a la SPEC. Quitarlo, sí.

---

## Cobertura de requisitos

| REQ | Tests | Cubierto |
| :--- | :--- | :--- |
| REQ-301 | verificado por el gate 4 de trazabilidad, no por un test unitario | ✅ |
| REQ-302 | TEST-301..310 | ✅ |
| REQ-303 | TEST-320, 321, 322 | ✅ |
| REQ-304 | TEST-311, 312, 313 | ✅ |
| REQ-305 | TEST-314 | ✅ |

> REQ-301 (*"ambos mapeadores importan la función común"*) no se puede comprobar con
> una aserción sobre valores: se comprueba con `grep`. Es exactamente el tipo de
> requisito para el que existe el gate 4 de `SPEC-900`.

## Reglas para el agente

- La copia congelada de `tests/fixtures/slugify-legacy.ts` se copia **literalmente**
  del código actual. No se limpia, no se moderniza, no se le arregla nada. Su valor
  es ser el pasado exacto.
- Esa copia se elimina en un commit propio, después de que `BZ-61` esté cerrada y
  verde. Mientras exista, el gate 4 la ignorará por estar bajo `tests/fixtures/`.
