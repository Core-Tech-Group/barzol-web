# SPEC-006 — SEO Esencial

**Estado:** APROBADA por solicitud de implementación del tablero BZ-98 (2026-09-20)  
**Capa:** presentación, lógica pura y Workers  
**Unidad destino:** `src/landing/layout/PublicLayout.astro`, `src/pages/sitemap.xml.ts`, `src/pages/robots.txt.ts`

**Módulos puros/adaptadores:** `sitemap.ts`, `sitemapRepository.ts`.
**Sondas:** `scripts/smoke/seo.mjs`.

## Contexto

El sitio SSR publicado en `https://barzol3d.com` carece de sitemap y enlace canónico. Ya emite título, descripción y Open Graph. El alcance vigente es SEO Esencial.

## Fuera de alcance

JSON-LD de producto, campañas, analítica, promesas de indexación, cambios de URL de productos y acceso a Google Search Console sin cuenta autorizada.

## Requisitos (EARS)

### [REQ-601] — Canónica
CUANDO se renderiza una página pública indexable, el sistema DEBE emitir una única URL canónica absoluta bajo `https://barzol3d.com`, sin parámetros de orden ni rastreo. Un producto DEBE usar `productoUrl()` del producto resuelto, incluso cuando la ruta solicitada contenga un slug antiguo.

### [REQ-602] — Búsqueda y error
CUANDO se renderiza búsqueda, login o una página de error, el sistema DEBE emitir `noindex`; una categoría desconocida DEBE quedar fuera del índice.

### [REQ-603] — Sitemap
CUANDO se solicita `/sitemap.xml`, el sistema DEBE responder XML UTF-8 con URLs absolutas de páginas públicas estables, categorías activas y productos publicados y activos, sin duplicados ni borradores.

### [REQ-604] — Consulta completa
CUANDO se construye el sitemap, el sistema DEBE recorrer todas las páginas de resultados de Supabase en lotes, sin depender del límite implícito de mil filas.

### [REQ-605] — Fallo de datos
SI Supabase falla durante el sitemap, ENTONCES el sistema DEBE devolver un error HTTP y no un XML 200 incompleto.

### [REQ-606] — Robots
CUANDO se solicita `/robots.txt`, el sistema DEBE indicar la ruta absoluta del sitemap y evitar el rastreo de rutas internas, sin usarlo como control de acceso.

### [REQ-607] — Metadatos
CUANDO se renderizan páginas públicas, el sistema DEBE conservar los títulos, descripciones y Open Graph existentes; fichas y categorías DEBEN tener descripción específica cuando exista contenido útil.

## Invariantes

- Ninguna URL del sitemap corresponde a `/api`, `/admin`, `/busqueda`, borrador o producto inactivo.
- Las canónicas no dependen del encabezado `Host` del request.
- La generación de XML escapa los caracteres reservados.

## Riesgo de regresión

Sitemap vacío por fallos de Supabase, contenido duplicado por parámetros o slugs anteriores y pérdida de tarjetas de WhatsApp si se altera Open Graph.
