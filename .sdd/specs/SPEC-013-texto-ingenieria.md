# SPEC-013 — Detalle textual de ingeniería avanzada

**Estado:** APROBADA por solicitud explícita del responsable (2026-09-21)
**Capa:** presentación Astro
**Unidades:** `src/landing/servicios/IngenieriaView.astro`, `HeroServicio.astro`
**Tablero:** BZ-121

## Contexto

El responsable reemplazó el bloque explicativo inferior por dos párrafos más
compactos que deben formar parte del hero de ingeniería, antes de la galería.

## Requisitos (EARS)

### [REQ-1301] — Contenido
CUANDO se carga la página de ingeniería avanzada, el hero DEBE mostrar los dos
párrafos aportados sobre escaneo 3D, ingeniería inversa, CAD/CAE, aplicaciones
y materiales. El sistema NO DEBE repetirlos en un bloque inferior.

### [REQ-1302] — Conservación
CUANDO se reemplaza el texto, el sistema DEBE conservar la imagen y fundido del
hero y la galería dinámica con lightbox.

### [REQ-1303] — Lectura adaptable
MIENTRAS el viewport sea móvil o de escritorio, el hero DEBE disponer de altura
suficiente para el nuevo texto, sin superponerlo a la imagen, recortarlo ni
provocar desbordamiento horizontal.

## Límites

Sin cambios de datos, rutas, SEO o galería. `HeroServicio` solo puede recibir
una altura mínima opcional y compatible con las otras páginas de servicio.
