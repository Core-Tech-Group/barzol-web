// Detección de nombres de variable "casi correctos".
//
// Nace de un caso real: el panel de Cloudflare recorta los nombres largos en
// pantalla, así que `BARZOL_SUPABASE_ANON_KEY` se muestra como
// `BARZOL_SUPABASE_ANON_` y no hay forma visual de distinguir un nombre bien
// escrito de uno guardado a medias. Cuando una variable esperada no llega,
// saber si llegó *otra parecida* separa dos causas muy distintas: el valor no
// se cargó, o se cargó con el nombre equivocado.
//
// Sólo compara NOMBRES. Los valores no entran acá en ningún momento.

/** Cuántos caracteres iniciales en común bastan para sospechar del mismo nombre. */
const PREFIJO_MINIMO = 12;

function normalizar(nombre: string): string {
  return nombre.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Devuelve, de entre `recibidas`, los nombres que se parecen a `esperado`
 * sin ser exactamente iguales.
 *
 * Cubre los tres errores que se dan en la práctica: diferencias de mayúsculas
 * o guiones, nombres cortados al pegar, y sufijos mal escritos.
 */
export function buscarNombresParecidos(
  esperado: string,
  recibidas: readonly string[]
): string[] {
  const objetivo = normalizar(esperado);

  return recibidas.filter((recibida) => {
    if (recibida === esperado) return false;

    const candidata = normalizar(recibida);
    if (candidata === objetivo) return true;

    const comun = Math.min(candidata.length, objetivo.length);
    if (comun < PREFIJO_MINIMO) return false;

    return candidata.slice(0, comun) === objetivo.slice(0, comun);
  });
}
