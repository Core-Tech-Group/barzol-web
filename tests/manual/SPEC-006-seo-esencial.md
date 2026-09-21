# Verificación manual pendiente — SPEC-006

Usar `astro dev` o `astro preview` en un entorno donde `workerd` arranque y registrar URL, fecha y HTML observado.

- [ ] **TEST-601 / REQ-601:** producto visitado con slug antiguo y `?utm_source=x` emite una sola canónica con slug actual, en `https://barzol3d.com`.
- [ ] **TEST-602 / REQ-602:** `/busqueda?q=...`, `/admin/login` y `/404` emiten `noindex`; categoría desconocida no se indexa.
- [ ] **TEST-603 / REQ-603:** sitemap omite productos en borrador/inactivos y categorías inactivas.
- [ ] **TEST-605 / REQ-605:** con proveedor fallando, `/sitemap.xml` responde 503, nunca XML 200 vacío.
- [ ] **TEST-607 / REQ-607:** título, descripción y OG de Home, catálogo y producto siguen en el HTML; ficha usa descripción de producto.
