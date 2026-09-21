# PLAN — SPEC-011 · carruseles del inicio

**Aprobación:** solicitud explícita del responsable, 2026-09-21.
**Verificación:** matriz manual en `tests/manual/SPEC-011-carrusel-home.md`,
typecheck, build, gate SDD y humo de producción.

| Caso | Situación | Resultado esperado | REQ |
| :--- | :--- | :--- | :--- |
| TEST-M1101 | Escritorio 1366 y 1904 px; sección con ≥7 productos | Seis tarjetas completas, ninguna parte de la séptima, bloque centrado | REQ-1101 |
| TEST-M1102 | Sección con 5 y luego 3 productos | Todas centradas, sin tarjetas inventadas | REQ-1102 |
| TEST-M1103 | Escritorio estrecho y móvil | Sin scroll horizontal de página; carrusel y flechas/gestos siguen funcionando | REQ-1102 |
| TEST-M1104 | Comparar orden con `/admin/inicio` y revisar ficha | Mismo orden y contenido; tarjeta de ficha mantiene 218 px | REQ-1103 |

La prueba visual es manual porque el repositorio no tiene runner Astro de capa 2
y la Orange Pi no inicia `workerd` por TCMalloc. La aritmética de ancho del CSS
es una revisión previa, no sustituye la inspección en navegador.
