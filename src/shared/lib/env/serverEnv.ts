import { getEnvRecord } from '@shared/lib/env/envSource';

// Lectura de variables de entorno del lado servidor, con una sola
// implementación para todo el proyecto.
//
// En producción el sitio corre sobre workerd, donde el entorno llega por el
// objeto `env` de `cloudflare:workers`: ahí aparecen los `vars` de
// wrangler.jsonc, los secretos del panel de Cloudflare y, en desarrollo, lo que
// se cargue desde `.env`. En el despliegue local sobre Docker corre sobre Node
// y el entorno llega por `process.env`, poblado por docker-compose.
//
// Esa —y sólo esa— diferencia vive detrás de `@shared/lib/env/envSource`, que
// `astro.config.mjs` resuelve a una implementación o a la otra según
// `DEPLOY_TARGET`. Todo lo demás (validación, mensajes de error, diagnóstico)
// existe una sola vez, acá, y es idéntico en los dos objetivos.
//
// Lo que NO cambia en ninguno de los dos: no se usa `import.meta.env.BARZOL_*`.
// Vite reemplaza esos accesos por su valor de build time, y las variables de
// Cloudflare son invisibles en ese momento: quedan como `undefined` fijo dentro
// del bundle.
//
// Este archivo NUNCA debe importarse desde componentes de cliente: filtraría
// secretos al bundle del navegador.

/**
 * Valor crudo de una variable de texto, o `undefined` si no está definida o si
 * el nombre corresponde a un binding (un objeto, no configuración de texto).
 */
function leerCrudo(name: string): string | undefined {
  const valor = getEnvRecord()[name];
  return typeof valor === 'string' ? valor : undefined;
}

/**
 * Devuelve la variable, o `undefined` si no está definida o está vacía.
 *
 * @throws {InvalidEnvError} si el nombre termina en `_URL` y el valor no es una
 * URL absoluta http(s).
 */
export function readServerEnv(name: string): string | undefined {
  const valor = leerCrudo(name)?.trim();
  if (!valor) return undefined;

  assertUrlIfNeeded(name, valor);
  return valor;
}

export class MissingEnvError extends Error {
  constructor(public readonly missing: readonly string[]) {
    super(
      `Faltan variables de entorno: ${missing.join(', ')}. ` +
        'En local se declaran en `.env` (copiá `.env.example`); en producción, en ' +
        'Cloudflare → Workers & Pages → barzol-web → Settings → Variables and Secrets.'
    );
    this.name = 'MissingEnvError';
  }
}

export class InvalidEnvError extends Error {
  // `variable`, y no `name`: `Error.name` ya está tomado por el nombre del error.
  constructor(public readonly variable: string) {
    super(
      `La variable de entorno ${variable} no contiene una URL absoluta válida ` +
        '(debe empezar con http:// o https://). Revisá que el valor se haya pegado ' +
        'en crudo: los corchetes de un enlace de markdown, las comillas y los ' +
        'espacios sobrantes quedan dentro del valor y lo invalidan.'
    );
    this.name = 'InvalidEnvError';
  }
}

// El mensaje NO incluye el valor recibido a propósito: estos errores hoy pueden
// llegar al cliente (ver BZ-14) y una URL de servicio con token en el query
// string sería una fuga peor que el nombre de la variable.

/**
 * Convención del proyecto: toda variable cuyo nombre termina en `_URL` debe ser
 * una URL absoluta http(s). Se valida al leerla porque el consumidor típico
 * (`createClient`, `new URL`) falla mucho más lejos y con un mensaje que no
 * nombra la variable — un valor mal pegado en el panel de Cloudflare aparecía
 * como un 500 sin pista alguna.
 */
function assertUrlIfNeeded(name: string, valor: string): void {
  if (!name.endsWith('_URL')) return;

  let parsed: URL;
  try {
    parsed = new URL(valor);
  } catch {
    throw new InvalidEnvError(name);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new InvalidEnvError(name);
  }
}

// ─── Diagnóstico ──────────────────────────────────────────────────────────
//
// Lo de abajo existe para `GET /api/diagnostico`, que responde qué configuración
// ve el worker desplegado sin necesidad de abrir el panel ni tener wrangler.
//
// Regla que sostiene todo esto: el VALOR de una variable nunca sale de este
// archivo. Se devuelven hechos sobre su forma —presente, largo, qué la
// invalida— y nada más. Un diagnóstico que filtra la clave que diagnostica no
// sirve de nada.

export type ProblemaVariable =
  | 'corchetes-de-markdown'
  | 'comillas'
  | 'espacios-internos'
  | 'salto-de-linea'
  | 'no-es-url-http'
  | 'barra-final';

export interface InspeccionVariable {
  presente: boolean;
  /** Sólo el largo, para distinguir un valor completo de uno recortado al pegar. */
  longitud?: number;
  problemas?: ProblemaVariable[];
}

/** Radiografía de una variable, sin revelar su contenido. */
export function inspeccionarVariable(name: string): InspeccionVariable {
  const crudo = leerCrudo(name);
  const valor = crudo?.trim();
  if (!valor) return { presente: false };

  const problemas: ProblemaVariable[] = [];
  if (/[[\]]/.test(valor)) problemas.push('corchetes-de-markdown');
  if (/["'`]/.test(valor)) problemas.push('comillas');
  if (/\s/.test(valor)) problemas.push('espacios-internos');
  if (/[\r\n]/.test(valor)) problemas.push('salto-de-linea');

  if (name.endsWith('_URL')) {
    try {
      assertUrlIfNeeded(name, valor);
      // La barra final no rompe nada —`buildPublicUrl` la recorta— pero delata
      // un copiado desde la barra del navegador, así que conviene avisar.
      if (valor.endsWith('/')) problemas.push('barra-final');
    } catch {
      problemas.push('no-es-url-http');
    }
  }

  return { presente: true, longitud: valor.length, problemas };
}

/**
 * NOMBRES —nunca valores— de las variables de texto que recibió el worker.
 *
 * Sirve para una pregunta que ninguna otra función responde: *"¿con qué nombre
 * llegó realmente?"*. El panel de Cloudflare recorta los nombres largos en
 * pantalla, así que un `BARZOL_SUPABASE_ANON_KEY` mal escrito o guardado a
 * medias se ve idéntico al correcto. Comparar lo esperado contra lo recibido
 * distingue en una sola mirada entre "el valor no llegó" y "llegó con otro
 * nombre".
 *
 * Se excluyen los bindings, que son objetos y no configuración de texto.
 */
export function listarClavesEnv(): string[] {
  const env = getEnvRecord();
  return Object.keys(env)
    .filter((clave) => typeof env[clave] === 'string')
    .sort();
}

/** ¿El worker recibió este binding (R2, KV, Images, Assets)? */
export function hayBinding(name: string): boolean {
  const valor = getEnvRecord()[name];
  return valor !== undefined && valor !== null && typeof valor === 'object';
}

/**
 * Exige un grupo de variables y las devuelve tipadas por nombre. Reporta TODAS
 * las que faltan de una vez, en lugar de fallar en la primera: cuando falta la
 * configuración entera de un servicio, enterarse variable por variable obliga a
 * reintentar el arranque cinco veces.
 *
 * @throws {MissingEnvError} si alguna falta.
 * @throws {InvalidEnvError} si alguna `*_URL` está presente pero mal formada.
 */
export function requireServerEnv<const N extends readonly string[]>(
  names: N
): Record<N[number], string> {
  const resueltas = {} as Record<N[number], string>;
  const faltantes: string[] = [];

  for (const name of names) {
    const valor = readServerEnv(name);
    if (valor) resueltas[name as N[number]] = valor;
    else faltantes.push(name);
  }

  if (faltantes.length > 0) throw new MissingEnvError(faltantes);
  return resueltas;
}
