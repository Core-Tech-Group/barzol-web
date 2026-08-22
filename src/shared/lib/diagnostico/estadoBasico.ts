import { getBuildInfo } from '@shared/lib/build/buildInfo';

// Cuerpo reducido del diagnóstico. Implementa SPEC-903, contrato compartido.
//
// Lo usan `GET /api/salud` y `GET /api/diagnostico` cuando el nivel de acceso es
// `reducido`. Vive en un solo sitio porque INV-4 —que el cuerpo reducido sea un
// subconjunto estricto del completo— duraría hasta el primer cambio si cada
// endpoint armara el suyo.
//
// Lo que NO lleva es la parte interesante: ni `clavesRecibidas`, ni `bindings`,
// ni `variables`, ni `pistas`. Nada que describa la configuración del worker.
// Solo si está vivo y qué código corre.

export interface EstadoBasico {
  /** Si el worker puede atender lo esencial (hoy: si Supabase responde). */
  ok: boolean;
  /** SHA corto del commit desplegado. Lo necesita el humo para detectar bundles viejos. */
  commit: string;
  /** Momento de la respuesta, en ISO 8601. */
  momento: string;
}

/**
 * `ahora` es inyectable por la Regla 6.1. Sin eso este módulo dejaría de ser
 * lógica pura y el gate de determinismo lo reportaría, con razón.
 */
export function construirEstadoBasico(
  ok: boolean,
  ahora: () => Date = () => new Date() // sdd:determinismo-ok SPEC-903 valor-por-defecto-inyectable
): EstadoBasico {
  return {
    ok,
    commit: getBuildInfo().commit,
    momento: ahora().toISOString(),
  };
}

/** Respuesta JSON sin caché — el estado descrito es el de ESTE momento. */
export function respuestaEstado(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
