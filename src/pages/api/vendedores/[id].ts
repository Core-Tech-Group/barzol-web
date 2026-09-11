import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import { updateVendedor, deleteVendedor } from '@shared/lib/productos/productoService';
import { vendedorWriteSchema } from '@shared/lib/validation/productoSchema';
import { formatZodError } from '@shared/lib/validation/zodError';
import { respuestaDeError } from './_respuesta';

// Renombrar y eliminar un vendedor. Mismo contrato de sesión que index.ts.
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    const validacion = vendedorWriteSchema.safeParse(await request.json());
    if (!validacion.success) return errorResponse(formatZodError(validacion.error), 400);

    const vendedor = await updateVendedor(locals.supabase!, params.id!, validacion.data.nombre);
    return jsonResponse(vendedor);
  } catch (error) {
    return respuestaDeError(error);
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    await deleteVendedor(locals.supabase!, params.id!);
    return jsonResponse(null);
  } catch (error) {
    return respuestaDeError(error);
  }
};
