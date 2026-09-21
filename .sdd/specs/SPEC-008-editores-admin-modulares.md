# SPEC-008 — Editores administrativos modulares

**Estado:** APROBADA por solicitud de cerrar BZ-101 y BZ-112 (2026-09-20)
**Capa:** presentación React; refactor sin cambio funcional.

## Contexto

`ProductsAdmin.tsx`, `InicioAdmin.tsx` y `CategoriesAdmin.tsx` superan 500 líneas. El refactor separa estado, operaciones y presentación sin alterar la experiencia ni el contrato de las API.

## Requisitos (EARS)

### [REQ-801] — Productos
CUANDO se abre el editor de productos, el sistema DEBE mostrar el mismo listado, filtros, paginación, acciones y formulario de edición; las operaciones de guardar, activar, duplicar y borrar DEBEN conservar sus destinos y payloads.

### [REQ-802] — Inicio
CUANDO se abre el editor del inicio, el sistema DEBE conservar secciones, banners, imágenes, productos seleccionados, orden, confirmaciones y el guardado existente.

### [REQ-803] — Categorías
CUANDO se abre el editor de categorías, el sistema DEBE conservar el árbol, la edición de nombres, el orden, las confirmaciones y el guardado existente.

### [REQ-804] — Límite y fuente única
CUANDO se separa un editor, cada archivo nuevo o modificado DEBE quedar bajo 500 líneas, y ninguna regla de negocio o llamada de red DEBE duplicarse entre estado y presentación.

## Invariantes

- Las props exportadas para las vistas Astro siguen siendo compatibles.
- La autorización permanece en middleware y RLS, no en la presentación.
- El editor de calificaciones sigue aislado del CRUD ordinario de productos.
- Las clases responsive de SPEC-906 permanecen en el DOM.

## Riesgos

Pérdida de handlers en JSX, cambios de orden de render o de estado React, alteración de cargas de imágenes y guardados.
