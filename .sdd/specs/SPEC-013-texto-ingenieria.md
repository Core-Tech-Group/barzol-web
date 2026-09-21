# SPEC-013 — Detalle textual de ingeniería avanzada

**Estado:** APROBADA por solicitud explícita del responsable (2026-09-21)
**Capa:** presentación Astro
**Unidades:** `src/landing/servicios/IngenieriaView.astro`, `IngenieriaIntro.astro`
**Tablero:** BZ-121

## Contexto

El hero de ingeniería resume el servicio y enlaza directamente con la galería.
El responsable aportó tres párrafos adicionales sobre métodos, aplicaciones y
materiales, para explicar mejor el alcance antes de mostrar los trabajos.

## Requisitos (EARS)

### [REQ-1301] — Contenido
CUANDO se carga la página de ingeniería avanzada, el sistema DEBE mostrar el
texto aportado sobre escaneo 3D, ingeniería inversa, CAD/CAE, repuestos,
réplicas, piezas personalizadas, maquetas, aplicaciones y materiales entre el
hero y la galería.

### [REQ-1302] — Conservación
CUANDO se añade el texto, el sistema DEBE conservar el hero, su imagen y
fundido, la galería dinámica con lightbox y los estilos de ambas secciones.

### [REQ-1303] — Lectura adaptable
MIENTRAS el viewport sea móvil o de escritorio, el nuevo texto DEBE mantener
ancho y espacio legibles sin desbordamiento horizontal ni alterar el orden de
lectura del hero y la galería.

## Límites

Sin cambios de datos, rutas, SEO, galería o componentes compartidos. El
contenido aportado no se convierte en afirmación de certificación médica ni
de material específico de un producto del catálogo.
