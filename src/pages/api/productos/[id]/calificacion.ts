import type { APIRoute } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import { errorResponse, jsonResponse } from '@shared/api/apiResponse';
import { calificacionWriteSchema } from '@shared/lib/validation/calificacionSchema';
import { updateCalificacion, CalificacionError } from '@shared/lib/productos/calificacionService';
import { logServerError } from '@shared/lib/errors/logServerError';

interface CalificacionContext {
  params: Record<string, string | undefined>;
  request: Request;
  locals: { supabase?: SupabaseClient };
}

export async function patchCalificacion({ params, request, locals }: CalificacionContext): Promise<Response> {
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return errorResponse('Producto inválido.', 400);
  if (!locals.supabase) return errorResponse('No autenticado.', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('JSON inválido.', 400);
  }
  const parsed = calificacionWriteSchema.safeParse(body);
  if (!parsed.success) return errorResponse('El promedio o la cantidad no son válidos.', 400);

  try {
    await updateCalificacion(locals.supabase, id, parsed.data);
    return jsonResponse(null);
  } catch (error) {
    if (error instanceof CalificacionError) {
      return errorResponse(error.message, error.code === 'MIGRACION_PENDIENTE' ? 503 : 403);
    }
    logServerError({ contexto: 'api.calificacion', ruta: '/api/productos/[id]/calificacion', metodo: 'PATCH' }, error);
    return errorResponse('No se pudo guardar la calificación.', 500);
  }
}

export const PATCH: APIRoute = patchCalificacion;
