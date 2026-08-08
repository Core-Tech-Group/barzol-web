import { createClient } from '@supabase/supabase-js';
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
// Las variables se leen con `requireServerEnv`, NO con `import.meta.env.X`
// directo: Vite reemplaza esos accesos por su valor de build time y, si la
// variable no estaba definida entonces, deja `undefined` fijo en el bundle —
// pliega el `if` de abajo en un `throw` incondicional y borra el `createClient`
// como código muerto. El resultado es un build que falla en cada request por
// más que Vercel tenga las variables bien cargadas. `requireServerEnv` consulta
// `process.env` en runtime y no se puede plegar.
const env = requireServerEnv(['BARZOL_SUPABASE_URL', 'BARZOL_SUPABASE_ANON_KEY']);

export const supabase = createClient(env.BARZOL_SUPABASE_URL, env.BARZOL_SUPABASE_ANON_KEY);
