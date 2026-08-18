// Carga en Cloudflare, como Secret, las variables secretas que estén en `.env`.
//
// Existe porque cargarlas a mano por el panel falló repetidamente: el campo
// recorta los nombres largos en pantalla y no hay forma de auditar desde afuera
// qué quedó guardado. `wrangler secret put` habla directo con la API.
//
// El valor NUNCA se imprime ni se pasa por la línea de comandos —donde quedaría
// en el historial del shell y en los logs—: viaja por stdin al proceso hijo.
//
// Uso:
//   npx wrangler login        (una vez)
//   node scripts/subir-secretos.mjs
//
// Sólo sube las que estén presentes y no vacías en `.env`. Las variables
// públicas NO van acá: se declaran en `wrangler.jsonc` → `vars`.

import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

/** Únicas variables que corresponden a un Secret. Ver ARCHITECTURE.md. */
const SECRETOS = ['BARZOL_SUPABASE_ANON_KEY', 'BARZOL_SUPABASE_SERVICE_ROLE_KEY'];

function leerEnv(ruta) {
  if (!existsSync(ruta)) return {};

  return Object.fromEntries(
    readFileSync(ruta, 'utf8')
      .split('\n')
      .map((linea) => linea.trim())
      .filter((linea) => linea && !linea.startsWith('#') && linea.includes('='))
      .map((linea) => {
        const corte = linea.indexOf('=');
        return [linea.slice(0, corte).trim(), linea.slice(corte + 1).trim()];
      })
  );
}

const env = leerEnv('.env');
let subidos = 0;

for (const nombre of SECRETOS) {
  const valor = env[nombre];

  if (!valor) {
    console.log(`- ${nombre}: ausente o vacío en .env, se omite`);
    continue;
  }

  // `input` entrega el valor por stdin; no aparece en la línea de comandos.
  const r = spawnSync('npx', ['wrangler', 'secret', 'put', nombre], {
    input: valor,
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: true,
  });

  if (r.status === 0) {
    console.log(`✔ ${nombre}: cargado (${valor.length} caracteres)`);
    subidos++;
  } else {
    console.error(`✖ ${nombre}: falló con código ${r.status}`);
    process.exitCode = 1;
  }
}

console.log(
  `\n${subidos} secreto(s) cargado(s). Verificá con:\n` +
    '  npx wrangler secret list\n' +
    '  curl https://barzol-web.willymichael-cardenas.workers.dev/api/diagnostico'
);
