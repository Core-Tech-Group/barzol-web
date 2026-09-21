# Verificación manual pendiente — SPEC-007

La migración Supabase se aplicará después del push por el responsable. Registrar fecha y producto de prueba sin datos sensibles.

- [ ] **TEST-701 / REQ-701:** producto con `(0,0)` no muestra estrellas.
- [ ] **TEST-702 / REQ-702:** panel rechaza promedio >5, más de una cifra decimal y conteo incoherente; base rechaza escritura directa inválida.
- [ ] **TEST-703 / REQ-703:** PATCH sin sesión responde 401 y no cambia datos.
- [ ] **TEST-704 / REQ-704:** editar otro campo conserva la calificación; PATCH solo modifica `rating_avg` y `rating_count`.
- [ ] **TEST-705 / REQ-705:** el mismo producto muestra promedio y cantidad iguales en Home, catálogo, búsqueda, carrusel y ficha; lector de pantalla recibe un texto español completo.
- [ ] **TEST-706 / REQ-706:** antes de migrar, el catálogo sigue disponible y el panel informa migración pendiente al intentar guardar.
- [ ] **TEST-707 / REQ-707:** HTML no contiene `AggregateRating`, `Review` ni badge «comprador verificado»; el panel explica la procedencia administrada.
