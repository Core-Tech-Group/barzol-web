import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import { subidaMediaSchema, normalizeContentType } from '@shared/lib/validation/mediaSchema';
import { formatZodError } from '@shared/lib/validation/zodError';
import { guardarMedia } from '@shared/lib/storage/mediaStorage';

// POST /api/media?carpeta=<carpeta>&nombre=<archivo> — sube un archivo a R2.
//
// El cuerpo de la petición es el archivo en crudo, no un formulario: así se
// puede pasar el `ReadableStream` directo a R2 sin cargarlo entero en memoria.
// `request.formData()` sí lo bufferizaría, y un worker tiene 128 MB.
//
// La sesión de admin ya la exige `src/middleware.ts`, que bloquea todo método
// distinto de GET bajo `/api/**`. Este endpoint no vuelve a comprobarla; si esa
// regla del middleware cambia, hay que revisar este archivo.

export const POST: APIRoute = async ({ request, url }) => {
  const validacion = subidaMediaSchema.safeParse({
    carpeta: url.searchParams.get('carpeta'),
    nombreArchivo: url.searchParams.get('nombre'),
    tipoContenido: normalizeContentType(request.headers.get('content-type')),
    tamanoBytes: request.headers.get('content-length'),
  });

  if (!validacion.success) {
    return errorResponse(formatZodError(validacion.error), 400);
  }

  if (!request.body) {
    return errorResponse('La petición no trae ningún archivo.', 400);
  }

  const { carpeta, nombreArchivo, tipoContenido, tamanoBytes } = validacion.data;

  try {
    const guardada = await guardarMedia({
      folder: carpeta,
      fileName: nombreArchivo,
      contentType: tipoContenido,
      contentLength: tamanoBytes,
      cuerpo: request.body,
    });
    return jsonResponse(guardada, 201);
  } catch (error) {
    // El error crudo puede traer detalles del bucket o de la configuración
    // interna: se registra en el servidor y al cliente le llega texto genérico.
    console.error('[api/media] No se pudo guardar el archivo en R2', error);
    return errorResponse('No se pudo guardar el archivo.', 500);
  }
};
