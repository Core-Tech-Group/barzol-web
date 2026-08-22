// Umbrales de cobertura POR CAPA (Constitución 7.1).
//
// Vitest solo sabe expresar umbrales globales o por glob dentro de un mismo
// provider, y este repo necesita tres números distintos sobre dos ejecuciones
// distintas (v8 para las capas 1 y 2, istanbul para la 3). Se leen del
// `coverage-summary.json` que deja el reportero `json-summary`.

import { leer } from './lectura.mjs';

/**
 * Capas de la Constitución 7.1. Los números son un punto de partida, no una
 * verdad: se miden una semana y se fijan en `BZ-73`. Hasta entonces el gate
 * los reporta pero no bloquea — ver `bloqueante` en `verificarCobertura`.
 */
export const CAPAS = [
  { nombre: 'Capa 1 · lógica pura', prefijo: 'src/shared/lib/', lineas: 95, ramas: 90 },
  { nombre: 'Capa 3 · endpoints', prefijo: 'src/pages/api/', lineas: 70, ramas: 60 },
];

function porcentaje(total, clave) {
  const dato = total?.[clave];
  if (!dato || typeof dato.pct !== 'number') return null;
  return dato.pct;
}

/**
 * Agrega la cobertura de todos los archivos cuya ruta empieza por el prefijo
 * de la capa. `coverage-summary.json` trae rutas absolutas, así que se
 * normalizan a POSIX y se compara por sufijo.
 */
function agregarCapa(resumen, prefijo) {
  let cubiertas = 0;
  let totales = 0;
  let ramasCubiertas = 0;
  let ramasTotales = 0;
  let archivos = 0;

  for (const [ruta, datos] of Object.entries(resumen)) {
    if (ruta === 'total') continue;
    if (!ruta.split('\\').join('/').includes(prefijo)) continue;

    archivos += 1;
    cubiertas += datos.lines?.covered ?? 0;
    totales += datos.lines?.total ?? 0;
    ramasCubiertas += datos.branches?.covered ?? 0;
    ramasTotales += datos.branches?.total ?? 0;
  }

  return {
    archivos,
    lineas: totales === 0 ? null : (cubiertas / totales) * 100,
    ramas: ramasTotales === 0 ? null : (ramasCubiertas / ramasTotales) * 100,
  };
}

/**
 * Devuelve el estado por capa. `bloqueante: false` mientras `BZ-73` no fije
 * los umbrales con datos reales; el informe se imprime igual, para que haya
 * esos datos.
 */
export function verificarCobertura(rutaResumen, { bloqueante = false } = {}) {
  const crudo = leer(rutaResumen);
  if (!crudo) {
    return { disponible: false, filas: [], hallazgos: [] };
  }

  let resumen;
  try {
    resumen = JSON.parse(crudo);
  } catch {
    return { disponible: false, filas: [], hallazgos: [] };
  }

  const filas = [];
  const hallazgos = [];

  for (const capa of CAPAS) {
    // `medido` va anidado a propósito: con spread, sus claves `lineas`/`ramas`
    // pisaban los umbrales de la capa y el informe imprimía el valor medido
    // como si fuera el mínimo exigido.
    const medido = agregarCapa(resumen, capa.prefijo);
    filas.push({ ...capa, medido });

    if (!bloqueante || medido.archivos === 0) continue;

    if (medido.lineas !== null && medido.lineas < capa.lineas) {
      hallazgos.push({
        tipo: 'COBERTURA',
        archivo: capa.prefijo,
        detalle: `líneas ${medido.lineas.toFixed(1)}% < ${capa.lineas}% requerido`,
      });
    }
    if (medido.ramas !== null && medido.ramas < capa.ramas) {
      hallazgos.push({
        tipo: 'COBERTURA',
        archivo: capa.prefijo,
        detalle: `ramas ${medido.ramas.toFixed(1)}% < ${capa.ramas}% requerido`,
      });
    }
  }

  const global = porcentaje(resumen.total, 'lines');

  return { disponible: true, filas, hallazgos, global };
}
