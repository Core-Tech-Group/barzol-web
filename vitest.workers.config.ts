import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

/**
 * CAPA 3 — endpoints dentro de workerd real (Miniflare).
 *
 * Vive en su propio archivo, y no como un tercer proyecto de
 * `vitest.config.ts`, porque Vitest aplica un único provider de cobertura por
 * ejecución y esta capa necesita **istanbul**: `@vitest/coverage-v8` depende de
 * `node:inspector`, y workerd solo expone un stub no funcional. Dos configs,
 * dos pasadas. Es la Constitución 7.4.
 *
 * Los bindings se declaran acá y NO con `wrangler: { configPath }`. Apuntar el
 * plugin a `wrangler.jsonc` arrastraría su `main`
 * (`@astrojs/cloudflare/entrypoints/server`), un entrypoint generado que solo
 * tiene forma utilizable después de `astro build`. Para probar handlers no hace
 * falta el worker de la aplicación: hacen falta sus bindings.
 */
export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityDate: '2026-07-22',
        compatibilityFlags: ['global_fetch_strictly_public'],
        r2Buckets: ['MEDIA'],
        // SESSION lo inyecta @astrojs/cloudflare v14 al construir: no está en
        // `wrangler.jsonc` pero sí en producción (verificado en
        // `dist/server/wrangler.json` y en `/api/diagnostico`). Sin declararlo,
        // el entorno de prueba diverge del real.
        kvNamespaces: ['SESSION'],
        bindings: {
          BARZOL_SUPABASE_URL: 'http://localhost:54321',
          BARZOL_R2_PUBLIC_URL: 'http://localhost:8788',
        },
      },
    }),
  ],
  test: {
    name: 'workers',
    include: ['tests/workers/**/*.test.ts'],
    setupFiles: ['./tests/setup.workers.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage/workers',
      include: ['src/pages/api/**'],
    },
  },
});
