import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import {
  getCategoriaById,
  updateCategoria,
  deleteCategoria,
} from '@shared/lib/categorias/categoriaService';
import { categoriaWriteSchema } from '@shared/lib/validation/categoriaSchema';
import { formatZodError } from '@shared/lib/validation/zodError';

export const GET: APIRoute = async ({ params }) => {
  try {
    const categoria = await getCategoriaById(params.id!);
    if (!categoria) return errorResponse('Categoría no encontrada', 404);
    return jsonResponse(categoria);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};

// El cliente autenticado ya lo armó y validó el middleware — se reusa desde
// locals en vez de crear uno nuevo y volver a autenticar.
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    const validacion = categoriaWriteSchema.safeParse(await request.json());
    if (!validacion.success) return errorResponse(formatZodError(validacion.error), 400);

    const categoria = await updateCategoria(locals.supabase!, params.id!, validacion.data);
    return jsonResponse(categoria);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    await deleteCategoria(locals.supabase!, params.id!);
    return jsonResponse(null);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};
