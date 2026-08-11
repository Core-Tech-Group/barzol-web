import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireServerEnv } from '@shared/lib/env/serverEnv';

// Cliente único de Supabase para todo el server-side del proyecto (services,
// endpoints de pages/api/**). Nunca se importa desde código que corre en el
// navegador, así que las variables no llevan el prefijo PUBLIC_ de Astro.
//
// La anon key está pensada para exponerse (Supabase la protege con RLS — ver
// supabase/schema.sql). service_role SÍ es secreta: queda reservada para
// cuando exista autenticación de admin y haga falta saltar RLS en escrituras
// privilegiadas; hoy ningún código la usa.
//
// DOS reglas sostienen este archivo:
//
// 1. Las variables se leen con `requireServerEnv`, NO con `import.meta.env.X`
//    directo. Vite reemplaza esos accesos por su valor de build time y, si la
//    variable no estaba definida entonces, deja `undefined` fijo en el bundle:
//    pliega el `if (!url) throw` en un `throw` incondicional y borra el
//    `createClient` como código muerto. En workerd las variables llegan en
//    runtime por `cloudflare:workers`, así que ese inlining siempre falla.
//
// 2. La instancia es PEREZOSA. En workerd el entorno no existe mientras se
//    evalúan los módulos, sólo dentro de una petición; crear el cliente en el
//    cuerpo del módulo fallaría al arrancar el worker.

let cache: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cache) return cache;

  const env = requireServerEnv(['BARZOL_SUPABASE_URL', 'BARZOL_SUPABASE_ANON_KEY']);
  cache = createClient(env.BARZOL_SUPABASE_URL, env.BARZOL_SUPABASE_ANON_KEY);

  return cache;
}
