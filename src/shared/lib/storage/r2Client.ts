import { S3Client } from '@aws-sdk/client-s3';
import { getR2Config } from './r2Config';

// Cliente S3-compatible apuntando a Cloudflare R2.
//
// `region: 'auto'` es obligatorio en R2: no expone regiones al estilo de AWS,
// pero el SDK exige el campo para poder firmar (SigV4 lo incluye en la firma).
//
// Instancia perezosa y cacheada por proceso. En Vercel cada instancia de la
// función serverless reutiliza este módulo entre invocaciones mientras esté
// caliente, así que se evita reconstruir el cliente en cada request.

let cache: S3Client | null = null;

export function getR2Client(): S3Client {
  if (cache) return cache;

  const config = getR2Config();

  cache = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cache;
}
