import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from '@shared/lib/auth/authClient';

// Protege /admin/** (páginas) y las escrituras de /api/** (POST/PUT/DELETE,
// GET queda público — es lo que ya lee el catálogo). /api/auth/** queda
// afuera porque ahí es donde se inicia sesión.
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isApiWrite =
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/auth/') &&
    context.request.method !== 'GET';

  if (!isAdminPage && !isApiWrite) return next();

  const supabase = await createSupabaseServerClient(context.request, context.cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isApiWrite) {
      return new Response(JSON.stringify({ success: false, data: null, message: 'No autenticado.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return context.redirect('/admin/login');
  }

  // Se reusa este mismo cliente (ya autenticado, `getUser()` ya corrido) en
  // los endpoints de escritura — evita que cada uno cree el suyo y vuelva a
  // pagar el round-trip de autenticación.
  context.locals.supabase = supabase;

  return next();
});
