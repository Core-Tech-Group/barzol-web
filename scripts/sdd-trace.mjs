#!/usr/bin/env node
// Gate 4 de SPEC-900 — trazabilidad SDD.
//
//   node scripts/sdd-trace.mjs            verifica y devuelve 0 o 1
//   node scripts/sdd-trace.mjs --baseline reescribe .sdd/baseline.json
//
// Sin dependencias externas (SPEC-900 INV-1). La lógica vive en `scripts/sdd/`.

import { readFileSync, writeFileSync } from 'node:fs';
import { fuentesNoDeterministas } from './sdd/determinismo.mjs';
import { verificarCobertura } from './sdd/cobertura.mjs';
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

const ci = Boolean(process.env.CI);
const bullet = (t) => `  ${t}`;

function leerBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE, 'utf8')).sinSpec ?? [];
  } catch {
    return [];
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

  writeFileSync(
    BASELINE,
    `${JSON.stringify(
      {
        _comentario:
          'Deuda heredada: archivos de lógica que existían sin SPEC cuando se montó el gate (BZ-66). La lista solo puede ENCOGER. Ver BZ-75.',
        _generado: new Date().toISOString().slice(0, 10),
        sinSpec,
      },
      null,
      2
    )}\n`
  );

  console.log(`Baseline regenerada: ${sinSpec.length} archivos sin SPEC.`);
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
  const archivos = archivosSinSpec(DIR_LOGICA, DIRS_DOC, baseline);
  const determinismo = fuentesNoDeterministas(DIR_LOGICA);
  const cobertura = verificarCobertura(RESUMEN_COBERTURA);

  const bloqueantes = [
    ...vacuidad,
    ...reqs.hallazgos,
    ...archivos.hallazgos,
    ...determinismo,
    ...cobertura.hallazgos,
  ];

  imprimirHallazgos('FALLOS', bloqueantes);
  imprimirHallazgos('Informativo — specs en borrador, no bloquean:', reqs.informativos);

  if (archivos.especificados.length > 0) {
    console.log('\nDeuda saldada — quitar de .sdd/baseline.json con `--baseline`:');
    for (const a of archivos.especificados) console.log(bullet(a));
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
    `\nDeuda heredada en baseline: ${baseline.length} archivos sin SPEC (ver BZ-75).`
  );

  if (bloqueantes.length > 0) {
    console.log(`\nGATE 4 · FALLA — ${bloqueantes.length} hallazgo(s) bloqueante(s).`);
    return 1;
  }

  console.log('\nGATE 4 · PASA');
  return 0;
}

process.exit(main());
