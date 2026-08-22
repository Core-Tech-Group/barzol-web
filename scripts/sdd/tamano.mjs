// Guardia de la Constitución 9.1 — ningún archivo supera las 500 líneas.
//
// La regla estaba escrita desde el primer día y **nadie la comprobaba**. Una
// regla que solo vive en un documento se cumple mientras alguien se acuerde;
// este módulo la convierte en un gate (`BZ-78`).
//
// El límite no es un número mágico: es el punto donde un archivo deja de caber
// en la cabeza de quien lo lee. Al llegar, se parte por responsabilidad —no por
// número de líneas—, que es lo que dice la propia regla.

import { leer, listarArchivos } from './lectura.mjs';

const LIMITE = 500;
const AVISO = 450; // margen para partirlo con calma, antes de que bloquee

/** Extensiones que cuentan. Los `.md` crecen por acumular historia, no lógica. */
const EXTENSIONES = ['.ts', '.tsx', '.astro', '.mjs', '.js', '.sql'];

/**
 * Archivos generados o de declaración que no se parten.
 * `worker-configuration.d.ts` lo genera `wrangler types` y tiene medio millón
 * de líneas; partirlo no significaría nada.
 */
const EXENTOS = ['worker-configuration.d.ts', 'src/env.d.ts', 'tests/env.d.ts'];

const esExento = (ruta) => EXENTOS.some((e) => ruta.endsWith(e));
const cuenta = (ruta) => leer(ruta).split('\n').length;

/**
 * Revisa los directorios indicados y devuelve hallazgos, avisos y deuda saldada.
 *
 * `baseline` es el trinquete: los archivos que YA superaban el límite cuando se
 * montó el gate quedan registrados y no bloquean. Partir un componente de 1378
 * líneas es un refactor con riesgo real de regresión, y hacerlo a la fuerza para
 * que el gate se ponga verde sería el peor orden posible.
 *
 * Lo que el trinquete SÍ impide es que la lista crezca: cualquier archivo nuevo
 * que pase de 500 líneas bloquea. Y si uno del baseline se parte, se reporta
 * como saldado para poder podar la lista.
 *
 * Los `.md` de `.sdd/` y `docs/` quedan fuera del bloqueo a propósito: un
 * tablero kanban o una spec crecen por acumular historia, no complejidad, y
 * forzar su partición produciría documentos peores. Se reportan como avisos
 * para que dividirlos sea una decisión consciente.
 */
export function archivosDemasiadoLargos(directorios, documentacion = [], baseline = []) {
  const conocidos = new Set(baseline);
  const hallazgos = [];
  const avisos = [];
  const saldados = [];

  for (const dir of directorios) {
    const archivos = listarArchivos(dir, (r) => EXTENSIONES.some((e) => r.endsWith(e)));

    for (const archivo of archivos) {
      if (esExento(archivo)) continue;

      const lineas = cuenta(archivo);
      const heredado = conocidos.has(archivo);

      if (lineas > LIMITE) {
        const hallazgo = {
          tipo: 'TAMANO',
          archivo,
          detalle: heredado
            ? `${lineas} líneas — deuda heredada, registrada en baseline (BZ-79)`
            : `${lineas} líneas > ${LIMITE} (Constitución 9.1). Partir por responsabilidad`,
        };
        (heredado ? avisos : hallazgos).push(hallazgo);
        continue;
      }

      if (heredado) {
        saldados.push(archivo);
      } else if (lineas > AVISO) {
        avisos.push({
          tipo: 'TAMANO',
          archivo,
          detalle: `${lineas} líneas, acercándose al límite de ${LIMITE}`,
        });
      }
    }
  }

  for (const dir of documentacion) {
    for (const archivo of listarArchivos(dir, (r) => r.endsWith('.md'))) {
      const lineas = cuenta(archivo);
      if (lineas > LIMITE) {
        avisos.push({
          tipo: 'TAMANO-DOC',
          archivo,
          detalle: `${lineas} líneas — documentación, no bloquea, pero conviene dividirla`,
        });
      }
    }
  }

  return { hallazgos, avisos, saldados };
}

/** Archivos de código que superan el límite hoy. Alimenta `--baseline`. */
export function inventarioDemasiadoLargos(directorios) {
  return archivosDemasiadoLargos(directorios, [], [])
    .hallazgos.map((h) => h.archivo)
    .sort();
}
