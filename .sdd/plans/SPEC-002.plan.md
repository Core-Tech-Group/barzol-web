# PLAN DE PRUEBAS — SPEC-002 · Claves de objeto en R2

**Archivo destino:** `tests/unit/storage/mediaKey.test.ts`
**Proyecto Vitest:** `unit` · **Umbral:** líneas ≥95%, ramas ≥90%
**Fuente:** [`../specs/SPEC-002-media-key-r2.md`](../specs/SPEC-002-media-key-r2.md)

> **Orden de trabajo.** Los tests de `sanitizeFileName` (TEST-101..112) se pueden
> escribir hoy: la función ya es pura. Los de `buildMediaKey` que exigen
> determinismo (TEST-120..124) **dependen de `REQ-208`** y por tanto de `BZ-62`.
> Hasta entonces solo se verifica lo que se puede verificar sin congelar relojes
> globales (TEST-113..117).

---

## Matriz — `sanitizeFileName` (hoy)

| ID | Escenario | Entrada | Esperado | REQ |
| :-- | :--- | :--- | :--- | :--- |
| TEST-101 | Nombre limpio | `foto.webp` | `foto.webp` | REQ-204 |
| TEST-102 | Tildes | `sordina-trombón.webp` | `sordina-trombon.webp` | REQ-204 |
| TEST-103 | Espacios y mayúsculas | `Atril De Celular.PNG` | `atril-de-celular.png` | REQ-204 |
| TEST-104 | Paréntesis (caso real del catálogo) | `Atril para trombón (tudel delgado).jpg` | `atril-para-trombon-tudel-delgado.jpg` | REQ-204 |
| TEST-105 | Ruta POSIX | `../../etc/passwd` | `passwd` | REQ-203 |
| TEST-106 | Ruta Windows | `C:\Users\willy\foto.webp` | `foto.webp` | REQ-203 |
| TEST-107 | Solo símbolos | `!!!.webp` | `archivo.webp` | REQ-206 |
| TEST-108 | Cadena vacía | `''` | `archivo` | REQ-206 |
| TEST-109 | Sin extensión | `mi archivo` | `mi-archivo` | REQ-205 |
| TEST-110 | Punto inicial (archivo oculto) | `.gitignore` | `gitignore` | REQ-205 |
| TEST-111 | Base de 120 caracteres | `<120 × 'a'>.webp` | base de exactamente 60 + `.webp` | REQ-206 |
| TEST-112 | Idempotencia (INV-3) | 12 entradas de arriba | `sanitize(sanitize(x)) === sanitize(x)` | INV-3 |

> TEST-110 documenta el comportamiento **actual**: `lastIndexOf('.')` devuelve `0`
> para `.gitignore`, y la condición es `> 0`, así que el nombre entero se trata como
> base y el punto se colapsa. No es obvio leyendo el código. Se fija como contrato
> para que nadie lo "arregle" sin darse cuenta de que cambia claves ya escritas en
> el bucket.

## Matriz — `buildMediaKey` sin inyección (hoy)

| ID | Escenario | Aserción | REQ |
| :-- | :--- | :--- | :--- |
| TEST-113 | Forma general | coincide con `/^(productos\|galeria\|home)\/\d{4}\/\d{2}\/[0-9a-f-]{36}-.+$/` | REQ-201, REQ-207 |
| TEST-114 | Mes con dos dígitos | el tercer segmento siempre tiene longitud 2 | REQ-201 |
| TEST-115 | INV-1 · sin travesía | la clave de `../../secreto.webp` no contiene `..` ni `\` | REQ-203, INV-1 |
| TEST-116 | INV-2 · prefijo válido | la clave empieza por la carpeta pedida + `/` | REQ-202, INV-2 |
| TEST-117 | Unicidad | 100 llamadas con el mismo nombre → 100 claves distintas | REQ-207 |

## Matriz — `buildMediaKey` con inyección (**tras `BZ-62` / REQ-208**)

| ID | Escenario | Entrada | Esperado | REQ |
| :-- | :--- | :--- | :--- | :--- |
| TEST-120 | Clave completamente determinista | `ahora: 2026-08-21T14:30:00Z`, `nuevoId: 'aaaa...'` | `productos/2026/08/aaaa...-foto.webp` | REQ-208, INV-5 |
| TEST-121 | Enero rellena a dos dígitos | `ahora: 2026-01-05` | segmento `01` | REQ-201 |
| TEST-122 | Se usa UTC, no la hora local | `ahora: 2026-01-01T02:00:00Z` con `TZ=America/Lima` | año `2026`, mes `01` | REQ-201 |
| TEST-123 | La firma antigua sigue funcionando | `buildMediaKey('home','x.png')` sin tercer argumento | no lanza y cumple TEST-113 | REQ-208 |
| TEST-124 | Misma entrada, misma salida | dos llamadas con `deps` idénticas | cadenas idénticas | INV-5 |

> **TEST-122 es el que justifica todo el ejercicio.** Barzol está en Perú
> (`UTC-5`). Con `new Date()` y hora local, una subida del 31 de diciembre a las
> 21:00 se archivaría bajo `2027/01`. Hoy el código usa `getUTCFullYear`, así que
> está bien — pero nada lo protege, y este test lo protege.
>
> **TEST-123 es el que impide la regresión.** Si falla, `BZ-62` rompió llamadas
> existentes y no debe fusionarse.

---

## Cobertura de requisitos

| REQ | Tests | Cubierto |
| :--- | :--- | :--- |
| REQ-201 | TEST-113, 114, 121, 122 | ✅ |
| REQ-202 | TEST-116 | ✅ |
| REQ-203 | TEST-105, 106, 115 | ✅ |
| REQ-204 | TEST-101..104 | ✅ |
| REQ-205 | TEST-109, 110 | ✅ |
| REQ-206 | TEST-107, 108, 111 | ✅ |
| REQ-207 | TEST-113, 117 | ✅ |
| REQ-208 | TEST-120..124 | ⏳ bloqueado por `BZ-62` |

## Reglas para el agente

- Prohibido `vi.setSystemTime()` para cubrir TEST-120..124. El punto de REQ-208 es
  **no necesitar** congelar el reloj global. Si el test lo necesita, la inyección
  está mal hecha.
- El tipo `MediaFolder` es cerrado: no hace falta probar carpetas inválidas en
  tiempo de ejecución — lo impide el compilador. Un test con `@ts-expect-error`
  para eso es ruido, no cobertura.
