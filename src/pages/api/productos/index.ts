import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import { getProductos, createProducto } from '@shared/lib/productos/productoService';
import { productoWriteSchema } from '@shared/lib/validation/productoSchema';
import { formatZodError } from '@shared/lib/validation/zodError';

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
    const validacion = productoWriteSchema.safeParse(await request.json());
    if (!validacion.success) return errorResponse(formatZodError(validacion.error), 400);

    const producto = await createProducto(locals.supabase!, validacion.data);
    return jsonResponse(producto, 201);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};
