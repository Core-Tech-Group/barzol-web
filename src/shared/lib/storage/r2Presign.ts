import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client } from './r2Client';
import { getR2Config } from './r2Config';
import { buildMediaKey, type MediaFolder } from './mediaKey';

// Firma de subidas directas navegador → R2.
//
// El archivo NUNCA pasa por el servidor: el endpoint solo devuelve una URL
// firmada y el navegador hace el PUT contra R2. Dos motivos:
//   - las funciones serverless de Vercel topan alrededor de 4.5 MB de cuerpo de
//     request, insuficiente para fotos de catálogo y video;
//   - la transferencia no consume tiempo de ejecución de la función.

/** Ventana de validez de la URL firmada. Corta: se pide justo antes de subir. */
export const PRESIGNED_URL_TTL_SECONDS = 300;

export interface PresignedUpload {
  /** Clave del objeto dentro del bucket — es lo que se guarda en Supabase. */
  key: string;
  /** URL firmada para el PUT. Caduca en `expiresIn` segundos. */
  uploadUrl: string;
  /** URL pública de lectura, ya utilizable en un `<img src>`. */
  publicUrl: string;
  expiresIn: number;
}

export interface PresignedUploadInput {
  folder: MediaFolder;
  fileName: string;
  contentType: string;
  contentLength: number;
}

/** Reconstruye la URL pública de lectura a partir de la clave del objeto. */
export function buildPublicUrl(key: string): string {
  return `${getR2Config().publicBaseUrl}/${key}`;
}

/**
 * Genera la URL firmada para subir un archivo.
 *
 * `ContentType` y `ContentLength` se incluyen en el comando firmado, no solo en
 * la validación previa: eso los ata a la firma, y R2 rechaza el PUT si el
 * navegador manda un tipo o un tamaño distintos a los declarados. Sin esto, la
 * validación de tamaño sería puramente cosmética — bastaría con declarar 1 KB y
 * subir 2 GB.
 */
export async function createPresignedUpload({
  folder,
  fileName,
  contentType,
  contentLength,
}: PresignedUploadInput): Promise<PresignedUpload> {
  const config = getR2Config();
  const key = buildMediaKey(folder, fileName);

  const comando = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  const uploadUrl = await getSignedUrl(getR2Client(), comando, {
    expiresIn: PRESIGNED_URL_TTL_SECONDS,
  });

  return {
    key,
    uploadUrl,
    publicUrl: buildPublicUrl(key),
    expiresIn: PRESIGNED_URL_TTL_SECONDS,
  };
}
