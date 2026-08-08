import { z } from 'zod';
import { MEDIA_FOLDERS } from '@shared/lib/storage/mediaKey';

// Contrato de entrada de `POST /api/media/firma`.
//
// La lista de tipos es una allow-list, no una deny-list: cualquier MIME que no
// esté acá se rechaza. Un bucket público sirviendo `text/html` o `image/svg+xml`
// es un XSS almacenado bajo nuestro propio dominio, así que SVG queda fuera a
// propósito pese a ser un formato de imagen legítimo.

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'] as const;

export const MEDIA_MIME_TYPES = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES] as const;
export type MediaMimeType = (typeof MEDIA_MIME_TYPES)[number];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

export function maxBytesFor(contentType: MediaMimeType): number {
  return (VIDEO_MIME_TYPES as readonly string[]).includes(contentType)
    ? MAX_VIDEO_BYTES
    : MAX_IMAGE_BYTES;
}

function formatMB(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export const solicitudFirmaSchema = z
  .object({
    carpeta: z.enum(MEDIA_FOLDERS),
    nombreArchivo: z.string().trim().min(1, 'requerido').max(255, 'máximo 255 caracteres'),
    tipoContenido: z.enum(MEDIA_MIME_TYPES),
    tamanoBytes: z
      .number()
      .int('debe ser un entero')
      .positive('debe ser mayor a 0'),
  })
  // El límite depende de otro campo del mismo objeto, así que se comprueba
  // después del `object`. Va con `superRefine` y no con `refine`: en Zod 4 el
  // segundo argumento de `refine` ya no acepta una función, y pasarla deja el
  // problema sin `path` ni mensaje propio ("Invalid input" a secas).
  .superRefine((datos, ctx) => {
    const maximo = maxBytesFor(datos.tipoContenido);
    if (datos.tamanoBytes > maximo) {
      ctx.addIssue({
        code: 'custom',
        path: ['tamanoBytes'],
        message: `supera el máximo de ${formatMB(maximo)} para ${datos.tipoContenido}`,
      });
    }
  });

export type SolicitudFirma = z.infer<typeof solicitudFirmaSchema>;
