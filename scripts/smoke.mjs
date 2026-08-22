#!/usr/bin/env node
// Verificación de humo post-despliegue — implementa SPEC-901, cierra BZ-24.
//
//   node scripts/smoke.mjs --url https://barzol-web.willymichael-cardenas.workers.dev \
//                          [--commit <sha>] [--token <t>]
//
// Salida: 0 todas pasan · 1 alguna falla · 2 error de invocación.
//
// Sin dependencias externas (REQ-960): `fetch` nativo y nada más. Tiene que
// poder ejecutarse desde una máquina limpia un sábado por la noche.
//
// Solo GET y HEAD (REQ-961). Un humo que escribe en R2 o en Supabase de
// producción es un generador de basura que nadie autorizó.

import {
  catalogoConDatos,
  diagnostico,
  imagenDesdeR2,
  paginaNoEncontrada,
  portadaViva,
} from './smoke/sondas.mjs';

const URL_POR_DEFECTO = 'https://barzol-web.willymichael-cardenas.workers.dev';

function argumentos(argv) {
  const leer = (nombre) => {
    const i = argv.indexOf(`--${nombre}`);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
  };

  return {
    url: leer('url') ?? process.env.BARZOL_URL ?? URL_POR_DEFECTO,
    commit: leer('commit') ?? process.env.BARZOL_COMMIT,
    // El token nunca se imprime, ni truncado (INV-3).
    token: leer('token') ?? process.env.BARZOL_DIAGNOSTICO_TOKEN,
  };
}

async function main() {
  const { url, commit, token } = argumentos(process.argv.slice(2));

  let base;
  try {
    base = new URL(url).toString().replace(/\/$/, '');
  } catch {
    console.error(`Uso: node scripts/smoke.mjs --url <base> [--commit <sha>] [--token <t>]`);
    console.error(`URL inválida: ${url}`);
    return 2;
  }

  console.log(`HUMO · ${base}`);
  console.log(commit ? `commit esperado: ${commit}` : 'commit esperado: (no indicado)');
  console.log('');

  // Todas se ejecutan aunque alguna falle (REQ-959): saber qué SÍ funciona
  // mientras algo falla es lo que descarta media docena de hipótesis de golpe.
  const resultados = [
    await portadaViva(base),
    await catalogoConDatos(base),
    await paginaNoEncontrada(base),
    ...(await diagnostico(base, { token, commit })),
    await imagenDesdeR2(base),
  ];

  for (const r of resultados) {
    const marca = r.estado === 'PASA' ? 'PASA' : 'FALLA';
    console.log(`[${marca}] ${r.id} · ${r.descripcion} (${r.ms} ms)`);
    if (r.detalle) console.log(`         ${r.detalle}`);
  }

  const fallidas = resultados.filter((r) => r.estado === 'FALLA');
  console.log('');
  console.log(`${resultados.length - fallidas.length}/${resultados.length} sondas en verde.`);

  if (fallidas.length > 0) {
    console.log(`HUMO · FALLA — ${fallidas.map((r) => r.id).join(', ')}`);
    return 1;
  }

  console.log('HUMO · PASA');
  return 0;
}

process.exit(await main());
