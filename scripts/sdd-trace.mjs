#!/usr/bin/env node
// Gate 4 de SPEC-900 — trazabilidad SDD.
//
//   node scripts/sdd-trace.mjs            verifica y devuelve 0 o 1
//   node scripts/sdd-trace.mjs --baseline reescribe .sdd/baseline.json
//
// Sin dependencias externas (SPEC-900 INV-1). La lógica vive en `scripts/sdd/`.

import { readFileSync, writeFileSync } from 'node:fs';
import { verificarCobertura } from './sdd/cobertura.mjs';
import { fuentesNoDeterministas } from './sdd/determinismo.mjs';
import { archivosDemasiadoLargos, inventarioDemasiadoLargos } from './sdd/tamano.mjs';
import {
  archivosSinSpec,
  requisitosSinTest,
  verificarNoVacuidad,
} from './sdd/trazabilidad.mjs';

const DIR_SPECS = '.sdd/specs';
const DIRS_DOC = ['.sdd/specs', '.sdd/plans'];
const DIRS_TEST = ['tests', 'supabase/tests'];
const DIR_LOGICA = 'src/shared/lib';
const BASELINE = '.sdd/baseline.json';
const RESUMEN_COBERTURA = 'coverage/coverage-summary.json';
// Constitución 9.1 — se revisa el código; la documentación solo se avisa.
const DIRS_CODIGO = ['src', 'scripts', 'tests', 'supabase'];
const DIRS_DOC_LARGA = ['.sdd', 'docs/2_backlog'];

const ci = Boolean(process.env.CI);
const bullet = (t) => `  ${t}`;

function leerBaseline() {
  try {
    const datos = JSON.parse(readFileSync(BASELINE, 'utf8'));
    return {
      sinSpec: datos.sinSpec ?? [],
      demasiadoLargos: datos.demasiadoLargos ?? [],
    };
  } catch {
    return { sinSpec: [], demasiadoLargos: [] };
  }
}

function imprimirHallazgos(titulo, hallazgos) {
  if (hallazgos.length === 0) return;
  console.log(`\n${titulo}`);
  for (const h of hallazgos) {
    console.log(bullet(`[${h.tipo}] ${h.archivo} — ${h.detalle}`));
    if (ci) console.log(`::error file=${h.archivo}::[${h.tipo}] ${h.detalle}`);
  }
}

function regenerarBaseline() {
  const { hallazgos } = archivosSinSpec(DIR_LOGICA, DIRS_DOC, []);
  const sinSpec = hallazgos.map((h) => h.archivo).sort();
  const demasiadoLargos = inventarioDemasiadoLargos(DIRS_CODIGO);

  writeFileSync(
    BASELINE,
    `${JSON.stringify(
      {
        _comentario:
          'Deuda heredada de cuando se montaron los gates. Ambas listas solo pueden ENCOGER: cualquier archivo NUEVO que incumpla bloquea. Ver BZ-75 (specs) y BZ-79 (tamaño).',
        _generado: new Date().toISOString().slice(0, 10),
        sinSpec,
        demasiadoLargos,
      },
      null,
      2
    )}\n`
  );

  console.log(
    `Baseline regenerada: ${sinSpec.length} sin SPEC, ${demasiadoLargos.length} por encima de 500 líneas.`
  );
}

function main() {
  if (process.argv.includes('--baseline')) {
    regenerarBaseline();
    return 0;
  }

  console.log('GATE 4 · trazabilidad SDD');

  const baseline = leerBaseline();
  const vacuidad = verificarNoVacuidad(DIR_SPECS, DIRS_TEST);
  const reqs = requisitosSinTest(DIR_SPECS, DIRS_TEST);
  const archivos = archivosSinSpec(DIR_LOGICA, DIRS_DOC, baseline.sinSpec);
  const determinismo = fuentesNoDeterministas(DIR_LOGICA);
  const tamano = archivosDemasiadoLargos(DIRS_CODIGO, DIRS_DOC_LARGA, baseline.demasiadoLargos);
  const cobertura = verificarCobertura(RESUMEN_COBERTURA);

  const bloqueantes = [
    ...vacuidad,
    ...reqs.hallazgos,
    ...archivos.hallazgos,
    ...determinismo,
    ...tamano.hallazgos,
    ...cobertura.hallazgos,
  ];

  imprimirHallazgos('FALLOS', bloqueantes);
  imprimirHallazgos('Informativo — specs en borrador, no bloquean:', reqs.informativos);
  imprimirHallazgos('Informativo — tamaño (Constitución 9.1):', tamano.avisos);

  const saldados = [...archivos.especificados, ...tamano.saldados];
  if (saldados.length > 0) {
    console.log('\nDeuda saldada — quitar de .sdd/baseline.json con `--baseline`:');
    for (const a of saldados) console.log(bullet(a));
  }

  if (archivos.huerfanos.length > 0) {
    console.log('\nBaseline desactualizada — estos archivos ya no existen:');
    for (const a of archivos.huerfanos) console.log(bullet(a));
  }

  if (cobertura.disponible) {
    console.log('\nCobertura por capa (Constitución 7.1 — informativa hasta BZ-73):');
    for (const f of cobertura.filas) {
      const pct = (v) => (v === null ? 'sin datos' : `${v.toFixed(1)}%`);
      console.log(
        bullet(
          `${f.nombre}: líneas ${pct(f.medido.lineas)} (min ${f.lineas}%) · ` +
            `ramas ${pct(f.medido.ramas)} (min ${f.ramas}%) · ${f.medido.archivos} archivos`
        )
      );
    }
  } else {
    console.log('\nCobertura: sin datos. Ejecuta `npm run test:cov` antes del gate.');
  }

  console.log(
    `\nDeuda en baseline: ${baseline.sinSpec.length} sin SPEC (BZ-75) · ` +
      `${baseline.demasiadoLargos.length} por encima de 500 líneas (BZ-79).`
  );

  if (bloqueantes.length > 0) {
    console.log(`\nGATE 4 · FALLA — ${bloqueantes.length} hallazgo(s) bloqueante(s).`);
    return 1;
  }

  console.log('\nGATE 4 · PASA');
  return 0;
}

process.exit(main());
