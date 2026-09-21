# SPEC-012 · resumen global de calificaciones

- [ ] **TEST-M1204 · REQ-1203/1204:** en `/` a 1904, 1366, 768 y 390 px, ver el resumen debajo del hero con estrellas, promedio y cantidad legibles sin desbordamiento.
- [ ] **TEST-M1204 · REQ-1203/1204:** comparar el total mostrado con la suma de `rating_count` de todos los productos publicados y activos, incluidos los que no están en `/admin/inicio`; comparar el promedio ponderado a una cifra decimal.
- [ ] **TEST-M1204 · REQ-1204:** comprobar que Home, tarjetas, catálogo y ficha mantienen sus calificaciones individuales, que no se ve una séptima tarjeta parcial en escritorio y que el carrusel móvil sigue desplazándose.
- [ ] **TEST-M1204 · REQ-1203:** con todos los conteos a cero, verificar «Sin calificaciones» y que no se atribuyen opiniones a personas o compradores verificados.

La fuente son los conteos administrados de productos. Una calificación no
representa necesariamente una persona única; la interfaz debe decir
«calificaciones», no «personas» ni «reseñas verificadas».
