// Lectura de variables de entorno del lado servidor, con una sola implementación
// para todo el proyecto.
//
// Se consultan DOS fuentes, en este orden:
//   1. `import.meta.env` — Vite/Astro lo rellena desde `.env` en desarrollo y lo
//      congela en el bundle durante el build.
//   2. `process.env` — el runtime Node de Vercel inyecta acá las variables
//      configuradas en el proyecto. Es la única fuente que refleja un cambio de
//      valor sin reconstruir.
//
// Consultar ambas hace que el mismo código sirva en `npm run dev` y en Vercel
// sin ramas por entorno. Este archivo NUNCA debe importarse desde componentes
// de cliente: filtraría secretos al bundle del navegador.

type EnvRecord = Record<string, string | undefined>;

function fuentes(): EnvRecord[] {
  const desdeImportMeta = import.meta.env as unknown as EnvRecord;
  const desdeProcess =
    typeof process !== 'undefined' && process.env ? (process.env as EnvRecord) : {};
  return [desdeImportMeta, desdeProcess];
}

/** Devuelve la variable, o `undefined` si no está definida o está vacía. */
export function readServerEnv(name: string): string | undefined {
  for (const fuente of fuentes()) {
    const valor = fuente[name]?.trim();
    if (valor) return valor;
  }
  return undefined;
}

export class MissingEnvError extends Error {
  constructor(public readonly missing: readonly string[]) {
    super(
      `Faltan variables de entorno: ${missing.join(', ')}. ` +
        'Copiá `.env.example` a `.env` y completá los valores (o cargalas en ' +
        'Vercel → Project Settings → Environment Variables).'
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
