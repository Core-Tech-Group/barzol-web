import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import { solicitudFirmaSchema } from '@shared/lib/validation/mediaSchema';
import { formatZodError } from '@shared/lib/validation/zodError';
import { createPresignedUpload } from '@shared/lib/storage/r2Presign';

// POST /api/media/firma — devuelve una URL firmada para subir un archivo a R2.
//
// La sesión de admin ya la exige `src/middleware.ts`, que bloquea todo método
// distinto de GET bajo `/api/**`. Este endpoint no vuelve a comprobarla; si esa
// regla del middleware cambia, hay que revisar este archivo.
//
// Firmar no sube nada: emite un permiso acotado (una clave, un tipo, un tamaño,
// cinco minutos) que el navegador usa para hablar directo con R2.

export const POST: APIRoute = async ({ request }) => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse('El cuerpo de la petición no es JSON válido.', 400);
  }

  const validacion = solicitudFirmaSchema.safeParse(payload);
  if (!validacion.success) {
    return errorResponse(formatZodError(validacion.error), 400);
  }

  const { carpeta, nombreArchivo, tipoContenido, tamanoBytes } = validacion.data;

  try {
    const subida = await createPresignedUpload({
      folder: carpeta,
      fileName: nombreArchivo,
      contentType: tipoContenido,
      contentLength: tamanoBytes,
    });
    return jsonResponse(subida, 201);
  } catch (error) {
    // El error crudo puede traer el endpoint del bucket o parte de las
    // credenciales: se registra en el servidor y al cliente le llega un texto
    // genérico.
    console.error('[api/media/firma] No se pudo firmar la subida a R2', error);
    return errorResponse('No se pudo preparar la subida del archivo.', 500);
  }
};
