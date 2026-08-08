// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

// https://astro.build/config
export default defineConfig({
  output: 'server',

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
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

  adapter: vercel()
});