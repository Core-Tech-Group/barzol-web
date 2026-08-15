// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

// SHA del commit que generó este bundle, para que `/api/diagnostico` pueda
// decir qué versión está atendiendo. Se resuelve acá, en tiempo de build,
// porque estas variables sólo existen en el entorno de compilación de
// Cloudflare — en el runtime del worker no están.
//
// `WORKERS_CI_COMMIT_SHA` lo inyecta Workers Builds; `CF_PAGES_COMMIT_SHA`
// queda por si el proyecto se desplegara alguna vez desde Pages, y `GITHUB_SHA`
// cubre una ejecución desde GitHub Actions.
const commitSha = (
  process.env.WORKERS_CI_COMMIT_SHA ??
  process.env.CF_PAGES_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  'desconocido'
).slice(0, 7);

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
        '@': srcDir,
        '@landing': `${srcDir}/landing`,
        '@admin': `${srcDir}/admin`,
        '@shared': `${srcDir}/shared`
      }
    }
  },

  adapter: cloudflare()
});