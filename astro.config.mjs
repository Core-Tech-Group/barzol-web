// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

// Objetivo de despliegue. `cloudflare` (el de producción) es el valor por
// defecto a propósito: un build sin `DEPLOY_TARGET` compila exactamente igual
// que antes de que existiera el despliegue local, adaptador y binding R2
// incluidos. `node` lo activa el despliegue en Docker sobre la Orange Pi
// (scripts/desplegar-local.sh).
//
// Sólo dos módulos del proyecto dependen del runtime, y ninguno de los dos es
// una vista, un service ni un mapper: de dónde salen las variables de entorno y
// dónde se escriben los bytes del multimedia. Se resuelven por alias en el
// build y no con un `if` en tiempo de ejecución porque `cloudflare:workers` se
// importa de forma estática: en un build de Node el módulo no existe y la
// compilación falla al resolverlo, antes de que ninguna condición se evalúe.
// Ver la ficha OP-04 en docs/2_backlog/20260818-0520-kanban-despliegue-local-orangepi.md
const objetivo = process.env.DEPLOY_TARGET === 'node' ? 'node' : 'cloudflare';

// SHA del commit que generó este bundle, para que `/api/diagnostico` pueda
// decir qué versión está atendiendo. Se resuelve acá, en tiempo de build,
// porque estas variables sólo existen en el entorno de compilación de
// Cloudflare — en el runtime del worker no están.
//
// `WORKERS_CI_COMMIT_SHA` lo inyecta Workers Builds; `CF_PAGES_COMMIT_SHA`
// queda por si el proyecto se desplegara alguna vez desde Pages, y `GITHUB_SHA`
// cubre una ejecución desde GitHub Actions.
// El recorte a 7 caracteres se aplica sólo cuando hay SHA: si no, el texto de
// respaldo saldría cortado ("descono") y parecería un hash corrupto.
const shaCompleto =
  process.env.WORKERS_CI_COMMIT_SHA ??
  process.env.CF_PAGES_COMMIT_SHA ??
  process.env.GITHUB_SHA;
const commitSha = shaCompleto ? shaCompleto.slice(0, 7) : 'desconocido';

// https://astro.build/config
export default defineConfig({
  output: 'server',

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
    // Los consume shared/lib/build/buildInfo.ts. Van como literales JSON
    // porque `define` sustituye texto crudo en el código fuente.
    define: {
      __COMMIT_SHA__: JSON.stringify(commitSha),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },
    resolve: {
      // Debe reflejar los mismos alias definidos en tsconfig.json
      // ("paths"): tsconfig solo cubre el chequeo de tipos, Vite
      // necesita esta entrada aparte para resolverlos en build/dev.
      alias: {
        // Los dos alias por objetivo van PRIMERO: el orden importa. Vite
        // resuelve el primer alias cuyo prefijo coincida, y `@shared` también
        // coincidiría con estas rutas — declarado después, nunca las intercepta.
        '@shared/lib/env/envSource': `${srcDir}/shared/lib/env/envSource.${objetivo}.ts`,
        '@shared/lib/storage/mediaDriver': `${srcDir}/shared/lib/storage/mediaDriver.${objetivo}.ts`,
        '@': srcDir,
        '@landing': `${srcDir}/landing`,
        '@admin': `${srcDir}/admin`,
        '@shared': `${srcDir}/shared`
      }
    }
  },

  // `standalone` levanta su propio servidor HTTP y es lo que arranca el
  // contenedor (`node dist/server/entry.mjs`); no hace falta un Express que lo
  // envuelva. Escucha en HOST/PORT, que fija docker-compose.
  adapter: objetivo === 'node' ? node({ mode: 'standalone' }) : cloudflare()
});