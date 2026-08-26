import type { MediaFolder } from '@shared/lib/storage/mediaKey';
import type { MediaGuardada } from '@shared/lib/storage/mediaStorage';
import type { ApiResponse } from '@shared/api/apiResponse';
import { IMAGE_MIME_TYPES } from '@shared/lib/validation/mediaSchema';
import { optimizeImageFile, extensionForMimeType } from '@shared/lib/media/imageOptimizer';

// Cliente de `POST /api/media` para islas de admin — solo tipos importados
// del lado servidor (se borran en build, no filtran código de servidor al
// bundle del navegador). El body es el archivo crudo, no FormData: así el
// endpoint lo pasa directo a R2 como stream.

export async function subirMedia(blob: Blob, opts: { carpeta: MediaFolder; nombreArchivo: string }): Promise<MediaGuardada> {
  const params = new URLSearchParams({ carpeta: opts.carpeta, nombre: opts.nombreArchivo });
  const res = await fetch(`/api/media?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': blob.type },
    body: blob,
  });
  const body = (await res.json()) as ApiResponse<MediaGuardada>;
  if (!res.ok || !body.success || !body.data) throw new Error(body.message || 'No se pudo subir la imagen.');
  return body.data;
}

/**
 * Valida, optimiza y sube una imagen elegida en un `<input type="file">`.
 *
 * SPEC-904 REQ-975. Existe para que ninguna isla vuelva a resolver esto con un
 * `FileReader` y una `data:` URI: eso es lo que hacía la pantalla de inicio, y
 * habría acabado grabando base64 dentro de `home_hero_image.image_url` para
 * servirlo en cada visita a la portada (`BZ-77`).
 *
 * Devuelve la URL pública de R2, que es lo único que se persiste.
 */
export async function subirImagen(file: File, carpeta: MediaFolder): Promise<string> {
  if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new Error('Formato no soportado — usá JPG, PNG, WEBP o AVIF.');
  }

  const { blob } = await optimizeImageFile(file);
  const base = file.name.replace(/\.[^.]+$/, '').trim() || 'imagen';
  const guardada = await subirMedia(blob, {
    carpeta,
    nombreArchivo: `${base}.${extensionForMimeType(blob.type)}`,
  });

  return guardada.publicUrl;
}
