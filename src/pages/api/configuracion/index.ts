import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import { getConfiguracion, updateConfiguracion } from '@shared/lib/configuracion/configuracionService';

export const GET: APIRoute = async () => {
  try {
    const configuracion = await getConfiguracion();
    return jsonResponse(configuracion);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};

// Nunca hay POST: site_configuration es singleton, la fila ya existe.
// El cliente autenticado ya lo armó y validó el middleware — se reusa desde
// locals en vez de crear uno nuevo y volver a autenticar.
export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const configuracion = await updateConfiguracion(locals.supabase!, body);
    return jsonResponse(configuracion);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};
