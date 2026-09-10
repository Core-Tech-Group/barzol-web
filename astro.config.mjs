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
// El recorte a 7 caracteres se aplica sólo cuando hay SHA: si no, el texto de
// respaldo saldría cortado ("descono") y parecería un hash corrupto.
//
// El valor se VALIDA como SHA antes de usarlo (SPEC-908 REQ-1009). No es
// paranoia: el despliegue de la cuenta nueva informaba `commit: "main"` — el
// nombre de la rama llegó por una de estas variables. Un valor que no es un SHA
// hace algo peor que faltar: `TEST-S06` compara el commit desplegado contra el
// que se acaba de publicar, y con una constante que nunca coincide la sonda
// falla siempre, deja de significar nada y se termina ignorando. Justo la sonda
// que existe porque dos commits tardaron un día en publicarse sin que nadie lo
// notara (BZ-52). Si no hay SHA, el contrato es decirlo: `desconocido`.
const ES_SHA = /^[0-9a-f]{7,40}$/i;
const candidato =
  process.env.WORKERS_CI_COMMIT_SHA ??
  process.env.CF_PAGES_COMMIT_SHA ??
  process.env.GITHUB_SHA;
const shaCompleto = candidato && ES_SHA.test(candidato.trim()) ? candidato.trim() : undefined;
const commitSha = shaCompleto ? shaCompleto.slice(0, 7) : 'desconocido';

// https://astro.build/config
export default defineConfig({
  output: 'server',

  // `/servicios` existía como página propia y renderizaba ServiciosView. El
  // renombrado a AccesoriosView la dejó importando un archivo inexistente y el
  // build entero dejó de compilar.
  //
  // No se borra la ruta a secas: hay enlaces ya publicados que apuntan ahí.
  // (El botón "Servicios →" del hero ya no la usa: lleva a #servicios, la
  // sección de servicios de la propia home.) Se redirige al destino que esa
  // URL ya servía —accesorios personalizados—, así que lo que ve el visitante
  // no cambia y queda una sola URL canónica.
  redirects: {
    '/servicios': '/servicios/accesorios-personalizados',
  },

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