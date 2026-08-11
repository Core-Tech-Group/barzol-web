import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import { updateGaleriaItem, deleteGaleriaItem } from '@shared/lib/galeria/galeriaService';
import { galeriaWriteSchema } from '@shared/lib/validation/galeriaSchema';
import { formatZodError } from '@shared/lib/validation/zodError';

// El cliente autenticado ya lo armó y validó el middleware — se reusa desde
// locals en vez de crear uno nuevo y volver a autenticar.
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    const validacion = galeriaWriteSchema.safeParse(await request.json());
    if (!validacion.success) return errorResponse(formatZodError(validacion.error), 400);

    const item = await updateGaleriaItem(locals.supabase!, params.id!, validacion.data);
    return jsonResponse(item);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    await deleteGaleriaItem(locals.supabase!, params.id!);
    return jsonResponse(null);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};
