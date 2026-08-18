// Identidad del bundle desplegado: qué commit lo generó y cuándo.
//
// Existe por una confusión concreta que costó una sesión entera de diagnóstico:
// el worker estuvo dos commits atrasado y no había forma de notarlo salvo
// adivinando por rutas —pedir una que sólo existiera en el código nuevo y ver
// si daba 404—. La primera pregunta ante cualquier fallo en producción es
// "¿estoy mirando el código que creo?", y hasta ahora no se podía responder.
//
// Los valores se congelan en tiempo de compilación desde `astro.config.mjs`
// (`vite.define`). Tiene que ser así: `WORKERS_CI_COMMIT_SHA` sólo existe en el
// entorno de build de Cloudflare, no en el runtime del worker, así que leerlo
// con `serverEnv.ts` devolvería siempre `undefined`. Es la única excepción a la
// regla de leer configuración por ahí, y por eso vive en su propio archivo.

declare const __COMMIT_SHA__: string;
declare const __BUILD_TIME__: string;

export interface BuildInfo {
  /** SHA corto del commit. `'desconocido'` en builds locales. */
  commit: string;
  /** Momento del build en ISO 8601. */
  compiladoEn: string;
}

export function getBuildInfo(): BuildInfo {
  return {
    commit: typeof __COMMIT_SHA__ === 'string' ? __COMMIT_SHA__ : 'desconocido',
    compiladoEn: typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : 'desconocido',
  };
}
