import { defineConfig } from 'vitest/config';
import { alias } from './vitest.alias';

/**
 * CAPA 1 — lógica pura (`src/shared/lib/**`), en Node.
 *
 * La CAPA 3 (endpoints en workerd) vive en `vitest.workers.config.ts`, en su
 * propio archivo porque necesita el provider de cobertura `istanbul` y Vitest
 * solo admite uno por ejecución.
 *
 * La CAPA 2 (componentes `.astro` con Container API) todavía NO está montada.
 * Ver la nota de abajo y `BZ-60`.
 */
export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
          setupFiles: ['./tests/setup.node.ts'],
        },
      },

      // ── CAPA 2 · componentes .astro — PENDIENTE (BZ-60) ───────────────
      //
      // El plan era añadir aquí `getViteConfig({ test: { name: 'components' } })`.
      // No funciona en este proyecto, y conviene dejar escrito por qué antes de
      // que alguien lo vuelva a intentar:
      //
      // `getViteConfig()` carga `astro.config.mjs` entero, con sus integraciones.
      // Entre ellas está `@astrojs/cloudflare` v14, que por dentro registra
      // `@cloudflare/vite-plugin`; ese plugin arranca workerd sobre el entrypoint
      // del servidor y falla con `ReferenceError: module is not defined`, porque
      // ese entrypoint solo tiene forma utilizable después de `astro build`.
      //
      // El fallo ocurre al RESOLVER los proyectos, así que tumbaba la ejecución
      // entera —incluida la Capa 1— aunque no hubiera ni un test de componente.
      // Verificado el 2026-08-22: `--project unit` y el proyecto `workers` pasan
      // por separado, y cualquier combinación que incluya `components` no arranca.
      //
      // El material base daba `getViteConfig()` por drop-in. No lo es cuando el
      // adaptador trae su propio plugin de Vite. BZ-60 tiene que resolver eso
      // primero, probablemente con una config de Astro sin adaptador.
    ],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/shared/lib/**'],
      exclude: ['src/shared/types/**'], // solo interfaces, sin código ejecutable
      // Los umbrales POR CAPA (Constitución 7.1) los valida
      // `scripts/sdd-trace.mjs` contra json-summary: Vitest no sabe expresarlos
      // por proyecto. Se fijan de verdad en BZ-73, tras medir con datos reales.
      thresholds: { lines: 0, functions: 0, branches: 0, statements: 0 },
    },
  },
});
