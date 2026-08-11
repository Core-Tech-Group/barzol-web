import { env } from 'cloudflare:workers';

// Acceso al bucket de multimedia por binding nativo de Cloudflare.
//
// No hay credenciales, ni endpoint, ni firma: el binding `MEDIA` está declarado
// en `wrangler.jsonc` y la plataforma concede el acceso al worker. Por eso no
// existe ninguna clave de R2 en el entorno de la aplicación — nada que rotar ni
// que se pueda filtrar desde el código.
//
// En `npm run dev` Cloudflare simula el bucket en `.wrangler/state`, así que la
// subida se puede probar en local sin escribir en el bucket real.

/**
 * Devuelve el bucket de multimedia.
 *
 * @throws si el binding no existe — pasa cuando `wrangler.jsonc` se editó sin
 * volver a generar tipos, o cuando el proyecto de Cloudflare no tiene el bucket
 * enlazado todavía.
 */
export function getMediaBucket(): R2Bucket {
  const bucket = env.MEDIA;

  if (!bucket) {
    throw new Error(
      'Falta el binding R2 `MEDIA`. Verificá `r2_buckets` en wrangler.jsonc y, ' +
        'en producción, que el bucket esté enlazado al proyecto en Cloudflare.'
    );
  }

  return bucket;
}
