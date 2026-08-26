// SPEC-905 · REQ-981, REQ-983 — decidir si el valor guardado como imagen sirve.
//
// Una sola función, usada por las tres partes que necesitan la respuesta: el
// esquema de `/api/galeria`, el panel y la galería pública. Que sea una sola es
// el punto: `BZ-82` existió porque el panel daba por buena una cadena que el
// resto del sistema no podía usar, y nadie estaba en posición de contradecirlo.

export type EstadoImagen = 'ok' | 'ausente' | 'invalida';

const PROTOCOLOS = ['http:', 'https:'];

/**
 * ¿Es una URL que un `<img src>` puede resolver desde cualquier página?
 *
 * Absoluta y `http(s)` únicamente. Las relativas quedan fuera a propósito: no
 * son "casi válidas", son la forma que tenía el bug — `firefox_ix0xISR5X0.png`
 * se resolvía contra `/servicios/` y devolvía un 404 silencioso. Las imágenes
 * de esta galería viven en R2 y R2 las sirve por URL absoluta.
 *
 * `blob:`, `data:` y `javascript:` caen aquí también, y el último importa: el
 * valor acaba en un atributo `src` de una página pública.
 */
export function esUrlPublica(valor: string): boolean {
  const limpio = valor.trim();
  if (limpio === '') return false;

  try {
    return PROTOCOLOS.includes(new URL(limpio).protocol.toLowerCase());
  } catch {
    // `new URL` lanza con todo lo que no lleve esquema — un nombre de archivo,
    // una ruta relativa, texto suelto.
    return false;
  }
}

/**
 * Clasifica lo que hay guardado en tres estados, no en dos.
 *
 * "Ausente" e "inválida" piden cosas distintas al administrador: la primera es
 * una tarjeta nueva a la que todavía no le eligió foto; la segunda es una fila
 * de las que `BZ-82` dejó en producción, con un nombre de archivo dentro. El
 * panel dice "subí una" en un caso y "ésta no sirve, volvé a subirla" en el
 * otro, y esa diferencia es la que evita que alguien busque el archivo perdido.
 */
export function estadoImagen(valor: string | null | undefined): EstadoImagen {
  if (valor === null || valor === undefined || valor.trim() === '') return 'ausente';
  return esUrlPublica(valor) ? 'ok' : 'invalida';
}
