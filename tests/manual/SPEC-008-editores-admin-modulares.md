# Verificación manual pendiente — SPEC-008

Ejecutar con una sesión administrativa en un navegador real después del deploy.
Usar datos de prueba que puedan revertirse y registrar fecha, resultado y
producto/categoría/sección usados sin credenciales.

- [ ] **TEST-801 / REQ-801:** filtrar productos, abrir uno existente, cambiar un campo, guardar y comprobar que persiste tras recargar. Crear un borrador, duplicarlo y borrarlo; verificar confirmaciones y errores.
- [ ] **TEST-801 / REQ-801:** en el formulario, elegir y cancelar una foto, reordenar fotos y características, y guardar una foto válida en R2.
- [ ] **TEST-802 / REQ-802:** añadir y editar sección/banner, seleccionar producto, reordenar, guardar y comprobar el inicio público tras recargar.
- [ ] **TEST-803 / REQ-803:** editar una categoría/subcategoría, reordenar, guardar y comprobar el catálogo público tras recargar.
- [ ] **TEST-801/802/803:** probar escritorio y móvil, navegación con cambios pendientes y mensajes de error sin perder datos.

El render, las interacciones básicas, typecheck, build y el gate SDD se verifican
automáticamente. Esta lista cubre persistencia y efectos reales que esos gates
no reproducen.
