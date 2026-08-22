# SPEC-003 — Slug público unificado

**Estado:** BORRADOR — pendiente de aprobación humana
**Capa:** 1 (lógica pura) · **Fecha:** 2026-08-21
**Unidad destino:** `src/shared/lib/text/slugify.ts` (**no existe todavía**)
**Reemplaza a:** `categoriaMapper.ts:17` y `productoMapper.ts:34`

---

## Contexto

`slugify()` está **copiado literalmente en dos archivos**:

| Archivo | Línea | Qué produce |
| :--- | ---: | :--- |
| `src/shared/lib/categorias/categoriaMapper.ts` | 17 | El slug de `/catalogo/[slug]` |
| `src/shared/lib/productos/productoMapper.ts` | 34 | El slug de la ficha de producto |

Además existe una **tercera variante divergente** en
`src/shared/lib/storage/mediaKey.ts:32` (la función local `limpiar`), que hace casi
lo mismo pero no aplica `.trim()` y sí trunca a 60 caracteres.

Esto viola la Regla 9.2. Y no es una molestia estética: **el slug es la URL
pública**. Si las dos copias se separan —una gana un `.trim()`, la otra no— las
categorías y los productos empiezan a generar rutas con reglas distintas, y el
síntoma aparece en producción como un 404 en un enlace que ayer funcionaba.

## Riesgo de regresión — leer antes de tocar

El slug **no se persiste**: se recalcula en cada lectura desde el `nombre`. Por lo
tanto **cualquier cambio en el algoritmo cambia todas las URLs del sitio a la vez**,
sin migración y sin redirección.

De ahí el requisito central de esta SPEC: la función unificada debe producir
**exactamente** la misma salida que las copias actuales. Es una extracción, no una
mejora. Cualquier mejora del algoritmo es otra SPEC, con su propia decisión sobre
redirecciones 301.

## Fuera de alcance

- Persistir el slug en base de datos.
- Redirecciones para slugs históricos.
- Unificar la variante de `mediaKey.ts` — comparte forma pero **no** contrato:
  trunca a 60 y no aplica `trim`. Se evalúa aparte, en `BZ-61`, y por defecto
  **no se toca**.

---

## Requisitos (EARS)

### [REQ-301] — Ubicuo
El sistema DEBE exponer una única función `slugify(nombre: string): string` en
`src/shared/lib/text/slugify.ts`, y ambos mapeadores DEBEN importarla en lugar de
declarar una copia local.

### [REQ-302] — Ubicuo
El sistema DEBE aplicar, en este orden exacto: normalización `NFD`, eliminación de
marcas diacríticas combinantes (`̀-ͯ`), minúsculas, `trim`, colapso de
todo carácter fuera de `[a-z0-9]` en un único guion, y recorte de guiones al inicio
y al final.

> El orden importa. `trim` **antes** del colapso de guiones da un resultado
> distinto que después, en nombres con espacios al borde. Se fija el orden actual.

### [REQ-303] — Ubicuo · equivalencia estricta
El sistema DEBE producir, para todo nombre de entrada, **la misma cadena** que
producen hoy `categoriaMapper.slugify` y `productoMapper.slugify`.

### [REQ-304] — Dirigido por evento
CUANDO el nombre normalizado quede vacío —entrada vacía, solo símbolos, solo
espacios—, el sistema DEBE devolver la cadena vacía, **no** un valor sustituto.

> Es el comportamiento actual y se conserva a propósito. Devolver `'producto'` o
> similar sería inventar comportamiento no especificado (Regla 2.4). Si una cadena
> vacía es un problema aguas abajo, se arregla aguas abajo y con su propio REQ.

### [REQ-305] — Ubicuo
El sistema DEBE ser idempotente: `slugify(slugify(x)) === slugify(x)`.

---

## Contrato

```typescript
export function slugify(nombre: string): string;
```

## Invariantes verificables

- **INV-1:** La salida solo contiene `[a-z0-9-]`.
- **INV-2:** La salida no empieza ni termina en `-`.
- **INV-3:** La salida nunca contiene `--`.
- **INV-4:** Idempotencia (REQ-305).
- **INV-5:** Equivalencia con las dos implementaciones actuales sobre el corpus de
  nombres reales de categorías y productos (REQ-303).

## Estrategia de verificación de no-regresión

El PLAN incluye un test que ejecuta la implementación **nueva** y una copia
congelada de la **vieja** sobre el mismo corpus, y exige igualdad. Cuando el test
esté verde y `BZ-61` cerrada, la copia congelada se elimina en un commit aparte.

Corpus mínimo obligatorio: los nombres reales de categorías del menú
(`Soportes`, `Sordinas`, instrumentos) y de los productos listados en
`BARZOL_CONTEXTO.md`, incluidos los que llevan paréntesis y tildes —
`Atril de celular para trombón (tudel delgado)` es el caso que más reglas ejercita
de una sola vez.
