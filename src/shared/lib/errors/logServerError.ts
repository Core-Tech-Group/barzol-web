// Único punto de escritura de errores del servidor.
//
// Sale por `console.error`, que en Cloudflare llega a Observability —ya
// habilitada en wrangler.jsonc— y se lee en el panel del worker o en vivo con
// `wrangler tail barzol-web`. Ver el runbook en docs/3_recursos/.
//
// Emite UNA sola línea de JSON por error. El visor de Cloudflare agrupa y filtra
// por texto, así que un formato estable permite buscar por `contexto` en vez de
// leer todo el flujo; y una línea por error evita que dos peticiones simultáneas
// entrelacen sus stacks.
//
// Lo que NUNCA entra acá: valores de variables de entorno, cuerpos de petición,
// cookies y cabeceras. Puede haber tokens en cualquiera de los cuatro. Esta es
// la contracara de la regla de `apiResponse`: el detalle va al log, al cliente
// va un mensaje genérico.

export interface ContextoError {
  /** Dónde ocurrió, en formato estable y buscable: `middleware`, `api.diagnostico`. */
  contexto: string;
  ruta?: string;
  metodo?: string;
}

export function logServerError(contexto: ContextoError, error: unknown): void {
  const err = error instanceof Error ? error : undefined;

  console.error(
    JSON.stringify({
      nivel: 'error',
      ...contexto,
      // Los errores de Supabase (PostgrestError) no son `Error` y traen `code`:
      // ese código es lo que distingue "clave inválida" de "RLS bloqueó la
      // consulta", y sin él ambos casos se ven igual desde afuera.
      error: err?.name ?? typeof error,
      codigo: (error as { code?: unknown } | null)?.code,
      mensaje: err?.message ?? String(error),
      stack: err?.stack,
    })
  );
}
