# PLAN — SPEC-013 · detalle textual de ingeniería

**Fuente:** [SPEC-013](../specs/SPEC-013-texto-ingenieria.md)
**Verificación:** manual en `tests/manual/SPEC-013-texto-ingenieria.md`,
`npm run typecheck`, `npm run build`, `npm run sdd:trace` y humo público.

| ID | Escenario | Resultado esperado | REQ |
| :--- | :--- | :--- | :--- |
| TEST-M1301 | Página pública de ingeniería | Tres párrafos nuevos entre hero y galería | REQ-1301 |
| TEST-M1302 | Hero e imágenes de galería | Hero y lightbox conservan su funcionamiento | REQ-1302 |
| TEST-M1303 | 390, 768 y 1366 px | Texto legible, sin scroll horizontal de documento | REQ-1303 |

La revisión de layout es manual; una prueba que busque el mismo literal en el
archivo no verificaría la lectura ni las imágenes.
