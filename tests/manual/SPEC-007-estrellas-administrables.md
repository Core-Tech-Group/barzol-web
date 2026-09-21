# Verificación manual pendiente — SPEC-007

La migración Supabase se ejecutó el 2026-09-21 en SQL Editor; una lectura remota
con la clave pública confirmó `rating_avg` y `rating_count` (HTTP 200). Aún falta
probar el guardado con una sesión administrativa. Registrar producto de prueba
sin datos sensibles.

- [ ] **TEST-701 / REQ-701:** producto con `(0,0)` muestra cinco estrellas vacías y «Sin calificaciones» en Home, catálogo y ficha, sin cifra inventada.
- [ ] **TEST-702 / REQ-702:** panel rechaza promedio >5, más de una cifra decimal y conteo incoherente; base rechaza escritura directa inválida.
- [ ] **TEST-703 / REQ-703:** PATCH sin sesión responde 401 y no cambia datos.
- [ ] **TEST-704 / REQ-704:** editar otro campo conserva la calificación; PATCH solo modifica `rating_avg` y `rating_count`.
- [ ] **TEST-705 / REQ-705:** el mismo producto muestra promedio y cantidad iguales en Home, catálogo, búsqueda, carrusel y ficha; lector de pantalla recibe un texto español completo.
- [ ] **TEST-706 / REQ-706:** antes de migrar, el catálogo sigue disponible y el panel informa migración pendiente al intentar guardar.
- [ ] **TEST-707 / REQ-707:** HTML no contiene `AggregateRating`, `Review` ni badge «comprador verificado»; el panel explica la procedencia administrada.
- [ ] **TEST-708 / REQ-708:** al abrir un producto existente, la sección «Calificación del producto» está visible arriba de las fotos; promedio y cantidad se guardan por separado y persisten al recargar. Un producto nuevo indica que debe guardarse primero.
