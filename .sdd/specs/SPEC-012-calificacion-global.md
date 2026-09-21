# SPEC-012 — Resumen global de calificaciones

**Estado:** APROBADA por solicitud explícita del responsable (2026-09-21)
**Capa:** lógica pura, consulta pública y presentación Astro
**Unidades:** `src/shared/lib/productos/calificacionGlobal.ts`, `calificacionGlobalService.ts`, `src/landing/home/CalificacionGlobal.astro`
**Tablero:** BZ-119

## Contexto

La portada muestra calificaciones por producto, definidas desde el panel, pero
no ofrece un resumen general. La solicitud pide promedio de estrellas y suma
de cantidades a medida que se agreguen productos o se editen sus valores.

## Fuera de alcance

Opiniones escritas, votos públicos, recuento de personas únicas, integración
con terceros y datos estructurados `Review` o `AggregateRating`.

## Requisitos (EARS)

### [REQ-1201] — Total y promedio ponderado
CUANDO se carga la portada, el sistema DEBE sumar `rating_count` de todos los
productos publicados y activos con conteo positivo y calcular el promedio
ponderado por esos conteos, redondeado a una cifra decimal. Un producto no
DEBE contarse dos veces por aparecer en varias secciones del inicio.

### [REQ-1202] — Crecimiento y edición
CUANDO se añaden productos o se actualizan sus calificaciones en el panel, el
siguiente render SSR de la portada DEBE usar los valores vigentes de todos los
productos públicos, aunque no figuren en los carruseles. La consulta DEBE
paginar para no truncarse con el límite de filas de Supabase.

### [REQ-1203] — Presentación honesta
MIENTRAS el total sea positivo, la portada DEBE mostrar estrellas, promedio de
cinco y número total de **calificaciones de productos** de forma accesible,
sin atribuirlas a personas únicas ni a compradores verificados. SI el total es
cero, ENTONCES DEBE mostrar un estado sin calificaciones y promedio cero.

### [REQ-1204] — Integridad y vistas
El resumen DEBE reutilizar el componente visual de estrellas existente y
quedar entre el hero y las secciones de productos, sin cambiar los valores
individuales, el diseño móvil del carrusel ni emitir datos estructurados de
reseñas.

## Invariantes

- Total = suma de conteos válidos de productos publicados y activos.
- Promedio = suma de `rating_avg × rating_count` dividida entre el total,
  redondeada a una cifra decimal; con total cero, promedio cero.
- La cantidad es un conteo administrado por producto, no usuarios únicos.

## Riesgo de regresión

Promediar productos sin ponderar, duplicar valoraciones por secciones del
inicio, omitir productos fuera del inicio, cortar resultados al superar mil
filas, afirmar reseñas verificadas o mostrar más de seis tarjetas en escritorio.
