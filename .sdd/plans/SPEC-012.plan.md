# PLAN DE PRUEBAS — SPEC-012 · resumen global

**Fuente:** [SPEC-012](../specs/SPEC-012-calificacion-global.md)
**Proyecto Vitest:** unit; presentación Astro mediante matriz manual.

| ID | Escenario | Esperado | REQ |
| :--- | :--- | :--- | :--- |
| TEST-1201 | Dos productos con promedios y conteos diferentes | Media ponderada y suma exacta, no media simple | REQ-1201 |
| TEST-1202 | Varias páginas y producto nuevo | Todos los conteos se agregan una vez | REQ-1202 |
| TEST-1203 | Sin valoraciones | Total y promedio cero | REQ-1203 |
| TEST-M1204 | Portada escritorio y móvil | Resumen visible y accesible; carrusel y ratings individuales intactos | REQ-1203, REQ-1204 |

## Cobertura de requisitos

| REQ | Tests | Cubierto |
| :--- | :--- | :--- |
| REQ-1201 | TEST-1201 | ✅ |
| REQ-1202 | TEST-1202 | ✅ |
| REQ-1203 | TEST-1203, TEST-M1204 | ✅ lógica, ⏳ visual |
| REQ-1204 | TEST-M1204 | ⏳ |
