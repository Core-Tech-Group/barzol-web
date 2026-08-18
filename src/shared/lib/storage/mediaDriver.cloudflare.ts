import { getMediaBucket } from './r2Bucket';
import type { MediaLeida } from './mediaLectura';

// Escritura física de multimedia en el objetivo `cloudflare`: el bucket R2, por
// binding nativo (ver `r2Bucket.ts`).
//
// Es la mitad intercambiable de `mediaStorage.ts`. Lo que queda compartido —y
// por lo tanto no se duplica— es todo lo demás: el nombrado de claves
// (`mediaKey.ts`), la sanitización del nombre de archivo y el armado de la URL
// pública (`mediaUrl.ts`). Acá sólo vive DÓNDE se escriben los bytes.
// Ver la ficha OP-04 del kanban de despliegue local.

/**
 * Escribe el objeto bajo `key`.
 *
 * `contentType` se guarda como metadato HTTP del objeto para que R2 lo devuelva
 * al servirlo; sin esto el navegador recibiría `application/octet-stream` y
 * descargaría la imagen en vez de mostrarla.
 */
export async function escribirMedia(
  key: string,
  cuerpo: ReadableStream<Uint8Array>,
  contentType: string
): Promise<void> {
  await getMediaBucket().put(key, cuerpo, {
    httpMetadata: { contentType },
  });
}

/**
 * Lectura de un objeto para servirlo desde la propia aplicación.
 *
 * En este objetivo devuelve SIEMPRE `null`, y es deliberado: las imágenes se
 * sirven desde la base pública del bucket (`BARZOL_R2_PUBLIC_URL`), no
 * proxeadas por el worker — ver ARCHITECTURE.md § Storage de multimedia. Hacer
 * pasar cada imagen por el worker gastaría tiempo de CPU facturable para
 * entregar exactamente lo que R2 ya entrega solo, y abriría una ruta por la que
 * cualquiera podría vaciar el bucket a través del sitio.
 *
 * Existe igual, con la misma firma que el driver de Node, para que
 * `pages/media/[...ruta].ts` compile en los dos objetivos: ahí, bajo Cloudflare,
 * un `null` se traduce en 404 — que es lo que esa ruta ya devolvía antes de
 * existir este archivo.
 */
export async function leerMedia(_key: string): Promise<MediaLeida | null> {
  return null;
}
