import type { APIRoute } from 'astro';
import { errorResponse, jsonResponse } from '@shared/api/apiResponse';
import { actualizarOrdenProductos, OrdenMigrationError } from '@shared/lib/productos/productoOrdenService';
import { ordenProductosSchema } from '@shared/lib/validation/productoSchema';
import { formatZodError } from '@shared/lib/validation/zodError';

export const patchOrden: APIRoute = async ({ request, locals }) => {
  if (!locals.supabase) return errorResponse('Sesión administrativa requerida.', 401);
  try {
    const body = ordenProductosSchema.safeParse(await request.json());
    if (!body.success) return errorResponse(formatZodError(body.error), 400);
    await actualizarOrdenProductos(locals.supabase, body.data.cambios);
    return jsonResponse(null);
  } catch (error) {
    return errorResponse((error as Error).message, error instanceof OrdenMigrationError ? 503 : 500);
  }
};

export const PATCH: APIRoute = patchOrden;
