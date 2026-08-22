#!/usr/bin/env node
// Auditoría de RLS de SOLO LECTURA contra un Supabase vivo.
//
//   node scripts/auditar-rls.mjs                 usa .env
//   node scripts/auditar-rls.mjs --url <u> --key <k>
//
// Salida: 0 sin fallos · 1 algún fallo · 2 error de invocación.
// Los AVISO no cambian el código de salida: señalan lo que esta herramienta
// no puede decidir desde fuera.
//
// POR QUÉ EXISTE, si SPEC-902 ya define pgTAP:
//
// pgTAP es la verificación completa —incluidas las escrituras— pero necesita
// un stack local levantado, y este proyecto ni siquiera está inicializado como
// proyecto de Supabase CLI (`BZ-70`). Mientras tanto, `BZ-50` lleva abierta
// como P0 desde el 2026-08-08 sobre un sitio que **ya sirve datos al público**.
//
// Esto no reemplaza a pgTAP: cubre el subconjunto que se puede comprobar sin
// escribir nada, contra la base real, hoy. Es la diferencia entre "no lo hemos
// verificado" y "sabemos qué ve un visitante con la anon key".
//
// La anon key no es un secreto: viaja al navegador en cada visita.

import { readFileSync } from 'node:fs';
import {
  borradoresOcultos,
  catalogoPublicoLegible,
  perfilesAdminOcultos,
  tablasAlcanzables,
} from './rls/sondas.mjs';

// Tablas del esquema público según DATABASE_SCHEMA.md. `product` y
// `admin_profile` tienen sonda propia y no se repiten acá.
const TABLAS = [
  'vendor',
  'category',
  'product_photo',
  'product_feature',
  'gallery_item',
  'home_hero_image',
  'home_item',
  'home_section_product',
  'site_configuration',
];

function leerEnv(nombre) {
  try {
    const linea = readFileSync('.env', 'utf8')
      .split('\n')
      .find((l) => l.startsWith(`${nombre}=`));
    return linea ? linea.slice(nombre.length + 1).trim().replace(/^["']|["']$/g, '') : undefined;
  } catch {
    return undefined;
  }
}

function argumento(argv, nombre) {
  const i = argv.indexOf(`--${nombre}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
}

async function main() {
  const argv = process.argv.slice(2);
  const base = (
    argumento(argv, 'url') ??
    process.env.BARZOL_SUPABASE_URL ??
    leerEnv('BARZOL_SUPABASE_URL') ??
    ''
  ).replace(/\/$/, '');
  // Nunca se imprime, ni truncada.
  const clave =
    argumento(argv, 'key') ?? process.env.BARZOL_SUPABASE_ANON_KEY ?? leerEnv('BARZOL_SUPABASE_ANON_KEY');

  if (!base || !clave) {
    console.error('Uso: node scripts/auditar-rls.mjs [--url <u>] [--key <anon>]');
    console.error('Sin argumentos, los toma de .env. Faltan datos de conexión.');
    return 2;
  }

  console.log(`AUDITORÍA RLS · ${base}`);
  console.log('Rol: anon · SOLO LECTURA · las escrituras las cubre pgTAP (BZ-70)\n');

  const resultados = [
    await catalogoPublicoLegible(base, clave),
    await borradoresOcultos(base, clave),
    await perfilesAdminOcultos(base, clave),
    ...(await tablasAlcanzables(base, clave, TABLAS)),
  ];

  for (const r of resultados) {
    console.log(`[${r.estado}] ${r.id} · ${r.descripcion}`);
    if (r.detalle) console.log(`         ${r.detalle}`);
  }

  const fallos = resultados.filter((r) => r.estado === 'FALLA');
  const avisos = resultados.filter((r) => r.estado === 'AVISO');

  console.log('');
  console.log(
    `${resultados.length - fallos.length - avisos.length} en verde · ${avisos.length} aviso(s) · ${fallos.length} fallo(s).`
  );

  if (fallos.length > 0) {
    console.log(`AUDITORÍA · FALLA — ${fallos.map((r) => r.id).join(', ')}`);
    return 1;
  }

  console.log('AUDITORÍA · sin fallos. Los AVISO necesitan pgTAP para resolverse.');
  return 0;
}

process.exit(await main());
