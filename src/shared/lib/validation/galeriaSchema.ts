import { z } from 'zod';
import { esUrlPublica } from '@shared/lib/galeria/imagenGaleria';

// Contrato de entrada de POST/PUT /api/galeria — misma forma que
// `GaleriaWriteInput` en galeriaService.ts.

export const galeriaWriteSchema = z.object({
  tipo: z.enum(['accesorios', 'trabajos']),
  titulo: z.string().trim().min(1, 'requerido'),
  // SPEC-905 REQ-981. Hasta `BZ-82` esto era un `min(1)`, y por ahí entraron
  // seis filas de producción con el nombre del archivo del escritorio dentro.
  // `image_url` es NOT NULL en el esquema, así que no hay estado "sin imagen"
  // que admitir: o es una URL que se puede servir, o la fila no vale.
  imagenUrl: z.string().refine(esUrlPublica, 'debe ser una URL pública de la imagen ya subida'),
  orden: z.number(),
});

export type GaleriaWrite = z.infer<typeof galeriaWriteSchema>;
