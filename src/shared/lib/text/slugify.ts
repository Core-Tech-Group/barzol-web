// Slug público del sitio. Implementa SPEC-003.
//
// Estaba duplicado literalmente en `categorias/categoriaMapper.ts` y
// `productos/productoMapper.ts`. Vive acá porque el slug ES la URL pública y
// **no se persiste**: se recalcula desde el `nombre` en cada lectura. Con dos
// copias, basta que una gane un `.trim()` para que categorías y productos
// empiecen a generar rutas con reglas distintas, y el síntoma aparece en
// producción como un 404 en un enlace que ayer funcionaba.
//
// Por el mismo motivo esto es una EXTRACCIÓN, no una mejora: REQ-303 exige que
// devuelva exactamente lo mismo que las copias anteriores. Cualquier cambio de
// algoritmo cambia todas las URLs del sitio a la vez, sin redirecciones, y
// necesita su propia SPEC.
//
// La variante de `storage/mediaKey.ts` NO se unifica acá: comparte la forma
// pero no el contrato (trunca a 60 caracteres y no aplica `trim`).

/**
 * Convierte un nombre administrado en el slug de su ruta pública.
 *
 * El orden de las operaciones es parte del contrato (REQ-302): `trim` va
 * ANTES del colapso de guiones, y moverlo cambia el resultado en nombres con
 * espacios en los bordes.
 *
 * Devuelve cadena vacía cuando no queda nada que normalizar (REQ-304). Es
 * deliberado: inventar un sustituto sería comportamiento no especificado.
 */
export function slugify(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // marcas diacríticas que dejó el NFD
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
