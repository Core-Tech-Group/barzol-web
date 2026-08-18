import { MEDIA_MIME_TYPES } from '@shared/lib/validation/mediaSchema';

// Tipo MIME de un archivo de multimedia a partir de su extensión.
//
// Hace falta porque el destino no siempre guarda el tipo declarado: R2 lo lleva
// como metadato del objeto, pero un archivo en disco no tiene dónde. La
// extensión es la única fuente que sobrevive a los dos, y `sanitizeFileName` la
// preserva al construir la clave.
//
// El mapa es cerrado a propósito. Lo que no esté acá se sirve como
// `application/octet-stream`, que el navegador descarga en vez de interpretar:
// para una ruta que devuelve archivos subidos desde el panel, adivinar el tipo
// es peor que no servirlo.

const POR_EXTENSION: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  // SVG NO está en la allow-list de subida (`mediaSchema.ts`) justamente porque
  // un SVG servido desde nuestro propio dominio es un XSS almacenado. Se
  // contempla acá porque las imágenes de relleno del catálogo de prueba sí lo
  // son, generadas por `scripts/generar-seed-sql.mjs` y nunca por un visitante.
  // La ruta que usa este mapa neutraliza el riesgo con `Content-Security-Policy`
  // y `X-Content-Type-Options` — ver `pages/media/[...ruta].ts`.
  svg: 'image/svg+xml',
};

export const TIPO_GENERICO = 'application/octet-stream';

/** Tipo MIME por extensión, o `application/octet-stream` si no se reconoce. */
export function tipoMimePorExtension(ruta: string): string {
  const extension = ruta.slice(ruta.lastIndexOf('.') + 1).toLowerCase();
  return POR_EXTENSION[extension] ?? TIPO_GENERICO;
}

/** ¿Es un tipo que el panel admin puede haber subido? Útil en pruebas y guardas. */
export function esTipoSubible(mime: string): boolean {
  return (MEDIA_MIME_TYPES as readonly string[]).includes(mime);
}
