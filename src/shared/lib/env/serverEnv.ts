import { env as workerEnv } from 'cloudflare:workers';

// Lectura de variables de entorno del lado servidor, con una sola
// implementación para todo el proyecto.
//
// El sitio corre sobre workerd, donde el entorno llega por el objeto `env` de
// `cloudflare:workers`: ahí aparecen los `vars` de wrangler.jsonc, los secretos
// del panel de Cloudflare y, en desarrollo, lo que se cargue desde `.env`.
//
// Se lee de ahí y NO de `import.meta.env.BARZOL_*`. Vite reemplaza esos accesos
// por su valor de build time, y las variables de Cloudflare son invisibles en
// ese momento: quedan como `undefined` fijo dentro del bundle. Tampoco se usa
// `process.env`, que en el worker se compila a un objeto vacío.
//
// Este archivo NUNCA debe importarse desde componentes de cliente: filtraría
// secretos al bundle del navegador.

type EnvRecord = Record<string, string | undefined>;

/** Devuelve la variable, o `undefined` si no está definida o está vacía. */
export function readServerEnv(name: string): string | undefined {
  const valor = (workerEnv as unknown as EnvRecord)[name]?.trim();
  return valor ? valor : undefined;
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

/**
 * Exige un grupo de variables y las devuelve tipadas por nombre. Reporta TODAS
 * las que faltan de una vez, en lugar de fallar en la primera: cuando falta la
 * configuración entera de un servicio, enterarse variable por variable obliga a
 * reintentar el arranque cinco veces.
 *
 * @throws {MissingEnvError} si alguna falta.
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
