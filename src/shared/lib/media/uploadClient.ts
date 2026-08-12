import type { MediaFolder } from '@shared/lib/storage/mediaKey';
import type { MediaGuardada } from '@shared/lib/storage/mediaStorage';
import type { ApiResponse } from '@shared/api/apiResponse';

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
