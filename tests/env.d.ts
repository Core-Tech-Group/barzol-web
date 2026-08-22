/// <reference types="@cloudflare/vitest-plugin/types" />

// Tipos para los tests de Capa 3.
//
// `cloudflare:test` expone `env` con el tipo `Cloudflare.Env`, que genera
// `wrangler types` a partir de `wrangler.jsonc`. Por eso ahí NO aparece
// `SESSION`: ese binding lo inyecta `@astrojs/cloudflare` v14 al construir y
// nunca pasa por la config del repo. Se declara acá para que los tests que lo
// usan compilen, y la declaración deja constancia de la asimetría.
//
// Sin `export {}` a propósito: con él, el archivo sería un módulo y el
// namespace quedaría local en vez de fusionarse con el global.
//
// Nota para quien venga del documento base: el módulo virtual se llama
// `cloudflare:test`, NO `cloudflare:workers`. Verificado el 2026-08-22 contra
// `@cloudflare/vitest-plugin@1.0.0`.

declare namespace Cloudflare {
  interface Env {
    /** KV de sesiones inyectado por @astrojs/cloudflare, ausente en wrangler.jsonc. */
    SESSION: KVNamespace;
    /**
     * Token del diagnóstico (SPEC-903). Opcional a propósito: los tests de
     * `BZ-72` lo asignan y lo borran para ejercitar los tres niveles de acceso
     * en la misma corrida, y declararlo acá evita el `as unknown as` que
     * prohíbe la Regla 4.1.
     */
    BARZOL_DIAGNOSTICO_TOKEN?: string;
  }
}

