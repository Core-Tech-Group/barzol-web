import { escribirMedia } from '@shared/lib/storage/mediaDriver';
import { buildMediaKey, type MediaFolder } from './mediaKey';
import { buildPublicUrl } from './mediaUrl';

// Escritura de contenido multimedia: qué clave le toca al archivo, dónde se
// escribe y con qué URL se lo va a leer después.
//
// El destino físico —bucket R2 o disco local— lo decide el driver detrás de
// `@shared/lib/storage/mediaDriver`, que `astro.config.mjs` resuelve según
// `DEPLOY_TARGET`. Este archivo no sabe cuál de los dos está activo, y por eso
// la clave y la URL pública salen idénticas en ambos.
//
// El cuerpo viaja como `ReadableStream` de punta a punta: nunca se materializa
// el archivo completo en memoria. Un worker dispone de 128 MB, así que hacer
// `arrayBuffer()` de un video lo mataría; el stream deja que el destino consuma
// los bytes a medida que llegan.

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
 * `contentType` se le pasa al driver para que el destino lo devuelva en el
 * `Content-Type` al servir el archivo; sin esto el navegador recibiría
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

  await escribirMedia(key, cuerpo, contentType);

  return {
    key,
    publicUrl: buildPublicUrl(key),
    contentType,
    size: contentLength,
  };
}
