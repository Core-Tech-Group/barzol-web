import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import { getGaleria, createGaleriaItem } from '@shared/lib/galeria/galeriaService';
import { galeriaWriteSchema } from '@shared/lib/validation/galeriaSchema';
import { formatZodError } from '@shared/lib/validation/zodError';

export const GET: APIRoute = async () => {
  try {
    const galeria = await getGaleria();
    return jsonResponse(galeria);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};

// El cliente autenticado ya lo armó y validó el middleware — se reusa desde
// locals en vez de crear uno nuevo y volver a autenticar.
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const validacion = galeriaWriteSchema.safeParse(await request.json());
    if (!validacion.success) return errorResponse(formatZodError(validacion.error), 400);

    const item = await createGaleriaItem(locals.supabase!, validacion.data);
    return jsonResponse(item, 201);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};
