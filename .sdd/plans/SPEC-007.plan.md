# PLAN DE PRUEBAS — SPEC-007 · Estrellas administrables

**Fuente:** [SPEC-007](../specs/SPEC-007-estrellas-administrables.md)  
**Capas:** validación, mapper, API local y Astro SSR.

| ID | Escenario | Esperado | REQ |
| :--- | :--- | :--- | :--- |
| TEST-701 | Producto con conteo cero | Cinco estrellas vacías y «Sin calificaciones»; promedio cero | REQ-701 |
| TEST-702 | Promedio fuera de 0–5, demasiados decimales o conteo inválido | HTTP 400, ninguna escritura | REQ-702 |
| TEST-703 | PATCH sin sesión | HTTP 401, ninguna escritura | REQ-703 |
| TEST-704 | PUT ordinario de producto | Conserva columnas de rating | REQ-704 |
| TEST-705 | Tarjeta y ficha de producto calificado | Igual promedio/conteo y texto accesible | REQ-705 |
| TEST-706 | DB sin columnas nuevas | Catálogo sigue renderizando y panel explica migración pendiente | REQ-706 |
| TEST-707 | HTML público con números administrados | Sin `AggregateRating`, `Review` ni «verificado» | REQ-707 |
| TEST-708 | Abrir producto existente en el panel | Campos de promedio/conteo visibles y guardado dedicado | REQ-708 |

## Matriz REQ ↔ TEST

| REQ | Test |
| :--- | :--- |
| REQ-701 | TEST-701 |
| REQ-702 | TEST-702 |
| REQ-703 | TEST-703 |
| REQ-704 | TEST-704 |
| REQ-705 | TEST-705 |
| REQ-706 | TEST-706 |
| REQ-707 | TEST-707 |
| REQ-708 | TEST-708 |
