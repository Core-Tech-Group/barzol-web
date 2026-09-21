# SPEC-007 — Estrellas administrables

**Estado:** APROBADA por solicitud de implementación del tablero BZ-99 (2026-09-20)  
**Capa:** datos, lógica, API y presentación  
**Unidad destino:** `product`, `src/shared/lib/productos`, `src/pages/api/productos/[id]/calificacion.ts`, `src/landing/producto`

**Módulos nuevos:** `calificacionSchema.ts`, `calificacionService.ts`.

## Contexto

El paquete contratado muestra promedio y cantidad definidos desde el panel. No hay votación pública ni reseñas de compradores verificadas.

## Fuera de alcance

Formulario público, tokens, comentarios, moderación, favoritos, insignia de compra verificada y datos estructurados `Review`/`AggregateRating`.

## Requisitos (EARS)

### [REQ-701] — Estado vacío
MIENTRAS `rating_count` sea cero, el sistema DEBE tratar el producto como sin valoración y con promedio cero. Las tarjetas y la ficha DEBEN mostrar cinco estrellas vacías y el texto «Sin calificaciones», sin insinuar votos existentes.

### [REQ-702] — Rango
CUANDO un administrador guarda una calificación, el sistema DEBE aceptar solamente un promedio entre 0 y 5 con una cifra decimal como máximo y un conteo entero no negativo; un conteo positivo requiere promedio mayor que cero.

### [REQ-703] — Autorización
SI una escritura de calificación carece de sesión administrativa válida, ENTONCES el sistema DEBE rechazarla sin modificar datos.

### [REQ-704] — Guardado aislado
CUANDO se edita precio, fotos u otro campo del producto, el sistema DEBE conservar la calificación; la edición de la calificación solo modifica sus dos columnas.

### [REQ-705] — Lectura pública
CUANDO se carga un producto publicado y activo, el sistema DEBE transportar su promedio y conteo mediante el mapper compartido y renderizarlos en tarjeta y ficha usando el mismo componente SSR accesible.

### [REQ-706] — Compatibilidad de despliegue
MIENTRAS la migración de columnas aún no esté aplicada, el sistema DEBE mantener operativo el catálogo público y mostrar estado sin valoración; la escritura DEBE informar claramente que falta habilitar la función.

### [REQ-707] — Procedencia
El sistema DEBE identificar los números como administrados por Barzol y NO DEBE emitir datos estructurados de reseñas ni afirmar compras verificadas.

### [REQ-708] — Editor encontrable
CUANDO un administrador abre un producto existente, el formulario DEBE mostrar promedio y cantidad en una sección visible. El guardado de esos valores DEBE usar el endpoint dedicado, informar el resultado y no sobrescribir otros campos. Un producto nuevo solo podrá recibir calificación después de crearse.

## Enmienda 2026-09-21

La revisión visual en producción mostró que todos los productos conservaban el valor `(0,0)` y que el único editor estaba oculto en un panel plegado encima del listado. REQ-701 ahora exige un estado vacío visible y REQ-708 sitúa la edición dentro del producto, según la revisión del usuario. Ningún valor se inventa ni se presenta como reseña verificada.

## Invariantes

- `rating_count = 0` implica `rating_avg = 0`.
- `rating_count > 0` implica `0 < rating_avg <= 5`.
- Ningún cliente sin sesión puede escribir las columnas.
- Ningún componente público añade JavaScript por las estrellas.

## Riesgo de regresión

Lecturas que fallen antes de aplicar SQL, sobrescritura del rating por el CRUD normal y exposición de valores administrados como reseñas verificadas.
