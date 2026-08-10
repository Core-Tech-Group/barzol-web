import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import { getProductos, createProducto } from '@shared/lib/productos/productoService';

export const GET: APIRoute = async () => {
  try {
    const productos = await getProductos();
    return jsonResponse(productos);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};

// El cliente autenticado ya lo armó y validó el middleware (auth.getUser())
// — se reusa desde locals en vez de crear uno nuevo y volver a autenticar.
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const producto = await createProducto(locals.supabase!, body);
    return jsonResponse(producto, 201);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};
