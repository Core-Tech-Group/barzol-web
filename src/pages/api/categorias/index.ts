import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import { getCategorias, createCategoria } from '@shared/lib/categorias/categoriaService';

export const GET: APIRoute = async () => {
  try {
    const categorias = await getCategorias();
    return jsonResponse(categorias);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};

// El cliente autenticado ya lo armó y validó el middleware — se reusa desde
// locals en vez de crear uno nuevo y volver a autenticar.
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const categoria = await createCategoria(locals.supabase!, body);
    return jsonResponse(categoria, 201);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};
