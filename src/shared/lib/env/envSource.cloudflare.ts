import { env } from 'cloudflare:workers';

// Origen crudo de las variables de entorno cuando el sitio corre sobre workerd
// (objetivo de despliegue `cloudflare`, el de producción).
//
// Es la mitad intercambiable de `serverEnv.ts`: acá vive únicamente DE DÓNDE
// salen los valores, y toda la validación, los mensajes de error y el
// diagnóstico siguen existiendo una sola vez en ese archivo. `astro.config.mjs`
// resuelve el alias `@shared/lib/env/envSource` a este archivo o a
// `envSource.node.ts` según `DEPLOY_TARGET` — ver la ficha OP-04 del kanban de
// despliegue local.
//
// La selección se hace con un alias de build y no con un `if` en tiempo de
// ejecución porque este `import` es estático: en un build de Node el módulo
// `cloudflare:workers` no existe y la compilación falla al resolverlo, antes de
// que ninguna condición llegue a evaluarse.

/**
 * Entorno del worker: los `vars` de wrangler.jsonc, los secretos del panel y,
 * en desarrollo, lo que se cargue desde `.env`. Incluye además los bindings
 * (R2, KV, Assets), que son objetos y no texto — por eso el valor es `unknown`.
 *
 * Se lee dentro de una función y nunca en el cuerpo del módulo: en workerd el
 * entorno sólo está poblado durante una petición.
 */
export function getEnvRecord(): Record<string, unknown> {
  return env as unknown as Record<string, unknown>;
}
