/**
 * Setup del proyecto `workers` (Capa 3), que corre dentro de workerd real.
 *
 * Deliberadamente vacío por ahora. Los bindings los provee Miniflare desde
 * `wrangler.jsonc` más lo declarado en `vitest.config.ts`, y el aislamiento de
 * almacenamiento entre tests lo da el propio plugin: cada archivo arranca con
 * R2 y KV limpios, sin que haya que vaciarlos a mano.
 *
 * Constitución 5.1: acá NO se mockea ningún binding. Si un test necesita un
 * objeto en R2, lo escribe con `env.MEDIA.put()` y lee lo que quedó.
 */
export {};
