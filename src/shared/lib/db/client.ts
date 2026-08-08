import { createClient } from '@supabase/supabase-js';

// Cliente único de Supabase para todo el server-side del proyecto (services,
// endpoints de pages/api/**). URL y anon key se resuelven en build time desde
// `.env` (import.meta.env) — nunca se importan en código que corre en el
// navegador, así que no hace falta el prefijo PUBLIC_ de Astro.
//
// La anon key está pensada para exponerse (Supabase la protege con RLS — ver
// supabase/schema.sql). service_role SÍ es secreta: queda reservada para
// cuando exista autenticación de admin y haga falta saltar RLS en escrituras
// privilegiadas; hoy ningún código la usa.
const url = import.meta.env.BARZOL_SUPABASE_URL;
const anonKey = import.meta.env.BARZOL_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Faltan BARZOL_SUPABASE_URL / BARZOL_SUPABASE_ANON_KEY. Copiá .env.example a .env y completá los valores del proyecto de Supabase.'
  );
}

export const supabase = createClient(url, anonKey);
