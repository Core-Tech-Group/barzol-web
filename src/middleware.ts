import { defineMiddleware } from 'astro:middleware';
import type { APIContext, MiddlewareNext } from 'astro';
import { createSupabaseServerClient } from '@shared/lib/auth/authClient';
import { logServerError } from '@shared/lib/errors/logServerError';

// Protege /admin/** (páginas) y las escrituras de /api/** (POST/PUT/DELETE,
// GET queda público — es lo que ya lee el catálogo). /api/auth/** queda
// afuera porque ahí es donde se inicia sesión.
//
// Además deja rastro de cualquier error que lo atraviese: hasta ahora una
// excepción subía muda hasta 500.astro y no quedaba registrada en ningún lado,
// así que producción sólo mostraba "Algo salió mal" y el diagnóstico había que
// hacerlo sondeando rutas desde afuera.
export const onRequest = defineMiddleware(async (context, next) => {
  try {
    return await manejar(context, next);
  } catch (error) {
    logServerError(
      { contexto: 'middleware', ruta: context.url.pathname, metodo: context.request.method },
      error
    );
    // Se relanza a propósito: Astro necesita el error para responder 500 y
    // renderizar 500.astro. Acá sólo se lo registra al pasar.
    throw error;
  }
});

// NOTA sobre el alcance de ese try/catch: con streaming activado, la respuesta
// puede empezar a viajar antes de que termine de renderizarse el cuerpo de la
// página, y un error lanzado en ese tramo no pasa por acá. Por eso el rastreo no
// depende sólo de este borde — `GET /api/diagnostico` responde el estado de la
// configuración sin necesidad de provocar el error.

async function manejar(context: APIContext, next: MiddlewareNext): Promise<Response> {
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
}
