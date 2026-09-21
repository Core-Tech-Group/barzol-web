# SPEC-011 — Seis productos visibles en los carruseles del inicio

**Estado:** APROBADA por solicitud explícita del responsable (2026-09-21)
**Capa:** presentación Astro/CSS
**Unidades:** `src/landing/home/HomeView.astro`, `src/landing/producto/ProductCarousel.astro`
**Tablero:** BZ-117

## Contexto

En escritorio, el contenedor de productos del inicio tiene `max-width:1200px` y
32 px de padding a cada lado. El carrusel usa tarjetas de 218 px y separación
de 12 px: solo caben cinco de forma simultánea. Las capturas del responsable
muestran margen lateral sobrante. Hay secciones con más de cinco productos;
«Sordinas» solo contiene cinco y no debe inventarse un sexto.

## Requisitos (EARS)

### [REQ-1101] — Seis tarjetas en escritorio amplio
MIENTRAS una sección del inicio tenga al menos seis productos y el viewport de
escritorio mida 1366 px o más, el sistema DEBE mostrar seis tarjetas completas
en la primera posición del carrusel, sin cortar la sexta. El bloque DEBE quedar
centrado horizontalmente con márgenes laterales equilibrados.

### [REQ-1102] — Menos de seis y pantallas estrechas
MIENTRAS una sección tenga menos de seis productos, el sistema DEBE centrar
sus tarjetas dentro del mismo bloque. SI el viewport es más estrecho, el
sistema DEBE conservar el desplazamiento horizontal, flechas de escritorio y
comportamiento móvil existentes, sin desbordamiento horizontal de la página.

### [REQ-1103] — Contenido y otras vistas
CUANDO cambie el ancho del carrusel del inicio, el sistema DEBE conservar el
orden y las tarjetas que administra `/admin/inicio`, así como el ancho previo
de las tarjetas del carrusel de la ficha de producto y de los catálogos.

## Límites

No se cambia el número de productos guardados en Supabase ni se agrega un
producto a secciones que solo contienen cinco. No se cambia el hero, cabecera,
catálogo, búsqueda ni ficha de producto.
