import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import { updateInicio } from '@shared/lib/home/homeService';
import { inicioWriteSchema } from '@shared/lib/validation/inicioSchema';
import { formatZodError } from '@shared/lib/validation/zodError';

// SPEC-904 · REQ-971, REQ-976, REQ-977.
//
// Nunca hay POST: la página de inicio no se "crea", se reemplaza entera. El
// orden es una propiedad del conjunto, así que va en una sola petición y no en
// una por item (REQ-971).
//
// No hay GET: las dos lecturas las hace `InicioView.astro` en el servidor con
// los servicios directamente, y añadir una ruta pública que devuelva el inicio
// sería superficie nueva sin nadie que la use.

export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    // La validación va ANTES de tocar `locals.supabase`, y ese orden es parte
    // del requisito: un cuerpo inválido no debe llegar a la base (REQ-977).
    const validacion = inicioWriteSchema.safeParse(await request.json());
    if (!validacion.success) return errorResponse(formatZodError(validacion.error), 400);

    // El cliente autenticado ya lo armó el middleware — se reusa desde locals.
    // Con el singleton anónimo, `auth.uid()` es nulo y las policies de REQ-979
    // rechazan la escritura (REQ-976).
    await updateInicio(locals.supabase!, validacion.data);

    return jsonResponse(null);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};
