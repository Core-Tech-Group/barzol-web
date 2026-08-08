import { getMediaBucket } from './r2Bucket';
import { buildMediaKey, type MediaFolder } from './mediaKey';
import { buildPublicUrl } from './mediaUrl';

// Escritura de contenido multimedia en R2.
//
// El cuerpo viaja como `ReadableStream` de punta a punta: nunca se materializa
// el archivo completo en memoria. Un worker dispone de 128 MB, así que hacer
// `arrayBuffer()` de un video lo mataría; el stream deja que R2 consuma los
// bytes a medida que llegan.

export interface MediaGuardada {
  /** Clave del objeto dentro del bucket — conviene guardarla junto a la URL. */
  key: string;
  /** URL pública de lectura, ya utilizable en un `<img src>`. */
  publicUrl: string;
  contentType: string;
  size: number;
}

export interface GuardarMediaInput {
  folder: MediaFolder;
  fileName: string;
  contentType: string;
  /** Tamaño declarado, ya validado contra el límite del tipo. */
  contentLength: number;
  cuerpo: ReadableStream<Uint8Array>;
}

/**
 * Sube un archivo y devuelve dónde quedó.
 *
 * `contentType` se guarda como metadato HTTP del objeto para que R2 lo devuelva
 * en el `Content-Type` al servirlo; sin esto el navegador recibiría
 * `application/octet-stream` y descargaría la imagen en vez de mostrarla.
 */
export async function guardarMedia({
  folder,
  fileName,
  contentType,
  contentLength,
  cuerpo,
}: GuardarMediaInput): Promise<MediaGuardada> {
  const key = buildMediaKey(folder, fileName);

  await getMediaBucket().put(key, cuerpo, {
    httpMetadata: { contentType },
  });

  return {
    key,
    publicUrl: buildPublicUrl(key),
    contentType,
    size: contentLength,
  };
}
