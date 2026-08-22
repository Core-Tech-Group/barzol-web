// Gate 4 de SPEC-900: trazabilidad REQ ↔ TEST ↔ archivo.

import { basename } from 'node:path';
import {
  estadoDeSpec,
  leer,
  leerTodos,
  listarArchivos,
  requisitosDe,
} from './lectura.mjs';

const ES_MD = (r) => r.endsWith('.md');
const ES_TS = (r) => r.endsWith('.ts') && !r.endsWith('.d.ts');

/**
 * REQ-905a — todo requisito de una SPEC **aprobada** debe estar citado en al
 * menos un archivo de prueba.
 *
 * La búsqueda se hace SOLO sobre `tests/` y `supabase/tests/`. Buscar en todo
 * el repositorio sería la trampa clásica: cada REQ se encontraría a sí mismo
 * en su propia SPEC y el gate aprobaría siempre (TEST-T06).
 */
export function requisitosSinTest(dirSpecs, dirsTest) {
  const specs = listarArchivos(dirSpecs, ES_MD);
  const textoTests = leerTodos(dirsTest.flatMap((d) => listarArchivos(d)));

  const hallazgos = [];
  const informativos = [];

  for (const spec of specs) {
    const contenido = leer(spec);
    const aprobada = estadoDeSpec(contenido) === 'APROBADA';

    for (const req of requisitosDe(contenido)) {
      if (textoTests.includes(req)) continue;

      const hallazgo = { tipo: 'HUECO', archivo: spec, detalle: `${req} sin test que lo cubra` };
      if (aprobada) hallazgos.push(hallazgo);
      else informativos.push({ ...hallazgo, detalle: `${hallazgo.detalle} (spec en borrador)` });
    }
  }

  return { hallazgos, informativos };
}

/**
 * REQ-905b — todo archivo de lógica debe estar nombrado en alguna SPEC o PLAN.
 *
 * `baseline` lista lo que ya existía sin especificar cuando se montó el gate.
 * Sin ese trinquete el gate nace en rojo con veinte archivos heredados, y un
 * gate que nunca ha estado verde se ignora igual que uno que nunca ha fallado.
 * Lo que el trinquete SÍ impide es que la lista crezca.
 */
export function archivosSinSpec(dirLogica, dirsDoc, baseline = []) {
  const archivos = listarArchivos(dirLogica, ES_TS);
  const textoDocs = leerTodos(dirsDoc.flatMap((d) => listarArchivos(d, ES_MD)));
  const conocidos = new Set(baseline);

  const hallazgos = [];
  const especificados = [];

  for (const archivo of archivos) {
    const nombre = basename(archivo);
    const documentado = textoDocs.includes(nombre);

    if (documentado) {
      if (conocidos.has(archivo)) especificados.push(archivo);
      continue;
    }
    if (conocidos.has(archivo)) continue; // deuda heredada, ya contabilizada

    hallazgos.push({
      tipo: 'SIN-SPEC',
      archivo,
      detalle: 'archivo nuevo sin SPEC ni PLAN que lo nombre (Constitución 2.1)',
    });
  }

  const huerfanos = baseline.filter((r) => !archivos.includes(r));

  return { hallazgos, especificados, huerfanos };
}

/**
 * INV-3 — el gate no puede aprobar por vacuidad.
 *
 * Es el modo de fallo característico de este patrón: sin specs o sin tests el
 * bucle no itera, el contador queda en cero y el proceso sale con éxito. Verde
 * eterno, cero valor (TEST-G10, TEST-G11, TEST-T04).
 */
export function verificarNoVacuidad(dirSpecs, dirsTest) {
  const hallazgos = [];

  if (listarArchivos(dirSpecs, ES_MD).length === 0) {
    hallazgos.push({
      tipo: 'VACUIDAD',
      archivo: dirSpecs,
      detalle: 'no hay ninguna SPEC: el gate no tiene nada que verificar',
    });
  }

  if (dirsTest.every((d) => listarArchivos(d).length === 0)) {
    hallazgos.push({
      tipo: 'VACUIDAD',
      archivo: dirsTest.join(', '),
      detalle: 'no hay ningún archivo de prueba: el gate no tiene nada que verificar',
    });
  }

  return hallazgos;
}
