// Nivel de acceso al diagnóstico. Implementa SPEC-903.
//
// Vive separado del endpoint a propósito: la decisión de "cuánto puede ver quien
// pregunta" es una regla de seguridad, y una regla de seguridad enterrada dentro
// de un handler de 200 líneas no se puede probar sola ni revisar de un vistazo.
// Acá es lógica pura — sin entorno, sin red, sin reloj— y tiene sus propios tests.

/** Cabecera donde viaja el token. */
export const CABECERA_TOKEN = 'x-diagnostico-token';

/**
 * Tres niveles, no dos.
 *
 * - `completo`: el diagnóstico entero.
 * - `reducido`: lo mismo que `/api/salud` — vivo y qué commit corre, nada de
 *   configuración. Es el escalón que permite cerrar la fuga sin dejar al
 *   proyecto ciego mientras nadie ha configurado todavía el token.
 * - `oculto`: 404. Ni siquiera se admite que la ruta existe.
 */
export type NivelAcceso = 'completo' | 'reducido' | 'oculto';

export interface EntornoAcceso {
  /** Valor de `BARZOL_DIAGNOSTICO_TOKEN`, o `undefined` si no está configurada. */
  tokenConfigurado: string | undefined;
  /** Valor recibido en la cabecera, o `null` si no vino. */
  tokenPresentado: string | null;
}

/**
 * Compara sin que el tiempo dependa de cuántos caracteres coinciden (REQ-945).
 *
 * Un `===` sobre cadenas corta en la primera diferencia. Con suficientes
 * intentos, el tiempo de respuesta filtra el token carácter a carácter. Acá se
 * recorre siempre la cadena entera y se acumula la diferencia con XOR.
 *
 * La longitud sí se compara antes: es información que el atacante ya puede
 * obtener de otras formas, y recorrer longitudes distintas complica el bucle sin
 * comprar nada.
 */
export function comparacionSegura(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diferencia = 0;
  for (let i = 0; i < a.length; i += 1) {
    diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diferencia === 0;
}

/**
 * Decide cuánto puede ver quien pregunta.
 *
 * Un token configurado pero vacío —o solo con espacios— cuenta como NO
 * configurado (REQ-946). Es el caso real de un secreto mal cargado, y tratarlo
 * como configurado dejaría el endpoint en `oculto` para siempre: nadie podría
 * diagnosticar, y el motivo sería invisible precisamente porque el diagnóstico
 * está apagado.
 */
export function resolverNivelAcceso({
  tokenConfigurado,
  tokenPresentado,
}: EntornoAcceso): NivelAcceso {
  const esperado = tokenConfigurado?.trim() ?? '';

  if (esperado === '') return 'reducido';
  if (tokenPresentado === null) return 'oculto';

  return comparacionSegura(esperado, tokenPresentado) ? 'completo' : 'oculto';
}
