# SPEC-004 · comprobación manual en producción

**Prerequisito:** ejecutar `supabase/pendiente-orden-productos.sql` en el SQL Editor y comprobar que devuelve `Success`. Entrar al panel con una sesión administrativa. No usar una sesión anónima para validar el guardado.

1. Abrir `/admin/productos`. En «Todos», confirmar que no aparecen números de posición ni botón «Guardar orden» y que siguen la paginación y las acciones de editar/duplicar/borrar.
2. Elegir «Trombón». Confirmar que aparecen todos sus productos con posiciones `1..N`, sin paginación. Mover uno con el selector de posición y confirmar que cambia la lista sin abrir el editor. Recargar **antes de guardar** y confirmar que el orden público no cambió.
3. Volver a mover un producto. Confirmar que «Guardar orden» está habilitado y que intentar salir por el sidebar pide confirmación. Guardar; debe verse «Orden guardado».
4. Recargar admin y `/catalogo/trombon` sin `?orden=`. Confirmar que ambos presentan la secuencia guardada. Comprobar también `/catalogo?orden=nuevos`: debe seguir ordenando por fecha.
5. Con una búsqueda activa en el admin, confirmar que desaparecen los controles de orden y se mantiene la paginación.
6. Editar nombre, precio, fotos o características de un producto y comprobar que el orden no se pierde. Crear un producto en la categoría: debe quedar al final. Moverlo a otra categoría: debe quedar al final de la nueva.
7. En una ventana sin sesión, intentar `PATCH /api/productos/orden` con un cuerpo válido: debe responder `401`. Con sesión, probar un cuerpo repetido o posición negativa: debe responder `400` y no cambiar la lista.

**Estado 2026-09-21:** SQL remoto aplicado; lectura de 26 productos y rechazo de RPC anónima verificados. Pendiente navegador autenticado para los casos 1–6 y comprobación con sesión real del caso 7.
