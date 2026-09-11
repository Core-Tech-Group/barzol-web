import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import { createVendedor } from '@shared/lib/productos/productoService';
import { vendedorWriteSchema } from '@shared/lib/validation/productoSchema';
import { formatZodError } from '@shared/lib/validation/zodError';
import { respuestaDeError } from './_respuesta';

// Alta de vendedor. El middleware ya exige sesión de administrador para toda
// escritura bajo /api/ y deja el cliente autenticado en locals.
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const validacion = vendedorWriteSchema.safeParse(await request.json());
    if (!validacion.success) return errorResponse(formatZodError(validacion.error), 400);

    const vendedor = await createVendedor(locals.supabase!, validacion.data.nombre);
    return jsonResponse(vendedor, 201);
  } catch (error) {
    return respuestaDeError(error);
  }
};
