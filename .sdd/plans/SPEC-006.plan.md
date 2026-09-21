# PLAN DE PRUEBAS — SPEC-006 · SEO Esencial

**Fuente:** [SPEC-006](../specs/SPEC-006-seo-esencial.md)  
**Capas:** lógica pura, Astro local y HTTP local.

| ID | Escenario | Esperado | REQ |
| :--- | :--- | :--- | :--- |
| TEST-601 | Canonical de producto con slug anterior y query | Apunta a `productoUrl()` en dominio oficial | REQ-601 |
| TEST-602 | Búsqueda, login, error y categoría inexistente | `noindex` o respuesta no indexable | REQ-602 |
| TEST-603 | Catálogo con publicados, borradores e inactivos | Sitemap incluye solo públicos | REQ-603 |
| TEST-604 | Más de un lote de resultados | Todas las URLs aparecen una vez | REQ-604 |
| TEST-605 | Fallo del proveedor | HTTP distinto de 200, sin XML parcial | REQ-605 |
| TEST-606 | Solicitud robots | Sitemap absoluto y rutas internas excluidas | REQ-606 |
| TEST-607 | HTML de páginas públicas | Metadatos existentes conservados y descripción contextual | REQ-607 |

## Matriz REQ ↔ TEST

| REQ | Test |
| :--- | :--- |
| REQ-601 | TEST-601 |
| REQ-602 | TEST-602 |
| REQ-603 | TEST-603 |
| REQ-604 | TEST-604 |
| REQ-605 | TEST-605 |
| REQ-606 | TEST-606 |
| REQ-607 | TEST-607 |
