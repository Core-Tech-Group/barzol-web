import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import {
  getCategoriaById,
  updateCategoria,
  deleteCategoria,
} from '@shared/lib/categorias/categoriaService';

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
    const body = await request.json();
    const categoria = await updateCategoria(locals.supabase!, params.id!, body);
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
