# SPEC-011 · carrusel de productos en la portada

- [ ] **TEST-M1101 · REQ-1101:** abrir `/` a 1366 px y a 1904 px de ancho. En «Soportes de celular» y «Accesorios de estudio» se ven seis tarjetas completas sin mover el carrusel. Los márgenes exteriores quedan equilibrados.
- [ ] **TEST-M1102 · REQ-1102:** revisar «Sordinas» (5 productos) y «Barriletes y campanas» (3). Sus tarjetas quedan centradas y no aparecen huecos como si fueran productos.
- [ ] **TEST-M1103 · REQ-1102:** a 1280, 768 y 390 px, desplazar el carrusel. Ninguna tarjeta se corta de forma permanente, el documento no tiene scroll horizontal y las flechas de escritorio siguen avanzando y retrocediendo.
- [ ] **TEST-M1104 · REQ-1103:** comparar la secuencia con `/admin/inicio`, comprobar que las tarjetas conservan precio, foto y calificación, y que el carrusel de la ficha de un producto mantiene su tamaño anterior.

**Estado:** pendiente de inspección visual tras despliegue; build y smoke validan compilación y SSR, no el ancho real del navegador.
