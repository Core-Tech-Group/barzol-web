// Guardia estático de la Constitución 6.1 — determinismo en la lógica pura.
//
// Estaba planeado como un parche de `Date.now` en `tests/setup.node.ts`
// (`BZ-58`). No funciona: Vitest usa `Date.now` internamente —temporizadores,
// reporteros, duración de cada test—, así que romperlo durante la corrida
// produce fallos en sitios sin relación con el código bajo prueba.
//
// Acá es donde debía estar desde el principio: un análisis estático es
// determinista y no depende de que un test llegue a ejecutarse.

import { leer, listarArchivos } from './lectura.mjs';

const FUENTES_NO_DETERMINISTAS = [
  { patron: /\bDate\.now\s*\(/, nombre: 'Date.now()' },
  { patron: /\bnew Date\s*\(\s*\)/, nombre: 'new Date()' },
  { patron: /\bMath\.random\s*\(/, nombre: 'Math.random()' },
  { patron: /\bcrypto\.randomUUID\s*\(/, nombre: 'crypto.randomUUID()' },
];

/**
 * Marcador de excepción explícita. Va en la MISMA línea que la llamada:
 *
 *   const instante = deps.ahora?.() ?? new Date(); // sdd:determinismo-ok valor por defecto inyectable
 *
 * Se exige un motivo escrito a propósito. Una excepción que no se puede
 * justificar en una línea es una excepción que no debería existir.
 */
const MARCADOR = /\/\/\s*sdd:determinismo-ok\s+\S+/;

/**
 * Archivos que la Constitución 1.1 declara adaptadores, no lógica pura.
 * Ampliar esta lista requiere enmendar la Regla 1.1, no editar este array.
 */
const ADAPTADORES = [
  'db/client.ts',
  'auth/authClient.ts',
  'env/serverEnv.ts',
  'storage/r2Bucket.ts',
  'storage/mediaStorage.ts',
];

/**
 * Los `*Service.ts` orquestan I/O (Constitución 1.3): llaman a Supabase y
 * delegan la traducción al mapper. No son lógica pura y la Regla 6.1 no les
 * aplica — `categoriaService.ts` usa `Date.now()` para el TTL de su caché de
 * categorías, que es exactamente lo que se espera de un orquestador.
 *
 * Eso NO significa que su determinismo dé igual: significa que se resuelve
 * cuando cada servicio tenga su SPEC (BZ-75), inyectando el reloj junto con
 * el resto de sus dependencias.
 */
const esAdaptador = (ruta) =>
  ADAPTADORES.some((a) => ruta.endsWith(a)) || ruta.endsWith('Service.ts');

/**
 * Líneas de comentario. Sin esto, el propio JSDoc que documenta la inyección
 * de `new Date()` se reporta como incumplimiento — el checker se acusaría a sí
 * mismo de la deuda que acaba de saldar.
 */
const esComentario = (linea) => /^\s*(\/\/|\/\*|\*)/.test(linea);

export function fuentesNoDeterministas(dirLogica) {
  const archivos = listarArchivos(
    dirLogica,
    (r) => r.endsWith('.ts') && !r.endsWith('.d.ts')
  );

  const hallazgos = [];

  for (const archivo of archivos) {
    if (esAdaptador(archivo)) continue;

    const lineas = leer(archivo).split('\n');

    lineas.forEach((linea, i) => {
      if (esComentario(linea) || MARCADOR.test(linea)) return;

      for (const { patron, nombre } of FUENTES_NO_DETERMINISTAS) {
        if (!patron.test(linea)) continue;

        hallazgos.push({
          tipo: 'DETERMINISMO',
          archivo: `${archivo}:${i + 1}`,
          detalle: `${nombre} en lógica pura (Constitución 6.1). Inyéctalo o justifícalo con // sdd:determinismo-ok <motivo>`,
        });
      }
    });
  }

  return hallazgos;
}
