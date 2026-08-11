import { createServerClient } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import { requireServerEnv } from '@shared/lib/env/serverEnv';

// Dominio del email sintético interno (ver DATABASE_SCHEMA.md § Nota sobre
// login del admin, Escenario B). El admin nunca ve ni usa este email — solo
// escribe su `username`. Se arma como `${username}@ADMIN_EMAIL_DOMAIN` tanto
// al crear el usuario en Supabase Auth como al iniciar sesión, así que no
// hace falta guardarlo en ningún lado ni consultarlo — es 100% determinístico.
export const ADMIN_EMAIL_DOMAIN = 'barzol.internal';

export function usernameToSyntheticEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${ADMIN_EMAIL_DOMAIN}`;
}

function parseCookieHeader(header: string): { name: string; value: string }[] {
  if (!header) return [];
  return header.split(';').map((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return { name: pair.trim(), value: '' };
    return { name: pair.slice(0, idx).trim(), value: decodeURIComponent(pair.slice(idx + 1).trim()) };
  });
}

// Cliente de Supabase con sesión persistida en cookies (no en localStorage,
// que no existe en SSR) — necesario para que /admin/** y las rutas de
// escritura de /api/** puedan saber, en cada request, si hay un admin logueado.
//
// Es async y llama a `auth.getUser()` antes de devolver el cliente: sin esto,
// el cliente recién creado arma sus consultas `.from(...)` usando solo la
// anon key (sin el token del usuario), así que `auth.uid()` sale NULL del
// lado de Postgres y CUALQUIER escritura choca contra RLS ("new row violates
// row-level security policy") aunque la policy y la sesión estén bien —
// `getUser()` es lo que sincroniza la sesión leída de las cookies con los
// headers que usa el resto del cliente.
export async function createSupabaseServerClient(request: Request, cookies: AstroCookies) {
  // Ver la nota en `shared/lib/db/client.ts`: la lectura va por `requireServerEnv`
  // y no por `import.meta.env.X`, que Vite congela en build time y que en workerd
  // nunca tiene los valores.
  const env = requireServerEnv(['BARZOL_SUPABASE_URL', 'BARZOL_SUPABASE_ANON_KEY']);

  const client = createServerClient(env.BARZOL_SUPABASE_URL, env.BARZOL_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get('cookie') ?? ''),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options);
        });
      },
    },
  });

  await client.auth.getUser();
  return client;
}
