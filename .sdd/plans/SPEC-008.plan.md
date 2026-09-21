# PLAN DE PRUEBAS — SPEC-008 · Editores administrativos modulares

**Fuente:** [SPEC-008](../specs/SPEC-008-editores-admin-modulares.md)

| ID | Escenario | Esperado | REQ |
| :--- | :--- | :--- | :--- |
| TEST-801 | Render inicial, apertura/cierre y validación vacía de producto | Nombre, precio, estado, formulario y errores obligatorios | REQ-801 |
| TEST-802 | Render inicial y nuevo listado con título | Producto visible; sección nueva y aviso de cambios pendientes | REQ-802 |
| TEST-803 | Render inicial y nueva categoría con nombre | Árbol visible; categoría nueva y aviso de cambios pendientes | REQ-803 |
| TEST-804 | Gate de tamaño y trazabilidad | Archivos <500 líneas sin lógica duplicada | REQ-804 |

## Verificación adicional

- `npm run typecheck`, `npm run test:node`, `npm run build`, `npm run sdd:trace`.
- CI de workerd en x86 y smoke de producción después del push.
- Inspección manual de los tres editores autenticados antes de dar por cerrado BZ-111. Las credenciales no viven en el repo.
