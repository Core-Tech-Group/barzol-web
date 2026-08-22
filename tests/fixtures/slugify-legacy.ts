/**
 * COPIA CONGELADA — no tocar, no modernizar, no "arreglar".
 *
 * Es la implementación que vivía duplicada en `categoriaMapper.ts:17` y
 * `productoMapper.ts:34` antes de `BZ-61`. Su único valor es ser el pasado
 * exacto: TEST-320/321 comparan contra ella para demostrar que la extracción
 * no cambió ni una sola URL pública.
 *
 * Verificado el 2026-08-22: las dos copias del repositorio eran idénticas
 * carácter por carácter (TEST-322), así que una sola función las representa a
 * ambas.
 *
 * El cuerpo es byte a byte el del original, incluido el rango literal de
 * diacríticos combinantes (U+0300 a U+036F) que deja el `normalize('NFD')`.
 *
 * Se elimina en un commit propio cuando `BZ-61` esté cerrada y verde.
 */
export function slugifyLegacy(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
