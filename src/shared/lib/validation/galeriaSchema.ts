import { z } from 'zod';

// Contrato de entrada de POST/PUT /api/galeria — misma forma que
// `GaleriaWriteInput` en galeriaService.ts.

export const galeriaWriteSchema = z.object({
  tipo: z.enum(['accesorios', 'trabajos']),
  titulo: z.string().trim().min(1, 'requerido'),
  imagenUrl: z.string().trim().min(1, 'requerido'),
  orden: z.number(),
});

export type GaleriaWrite = z.infer<typeof galeriaWriteSchema>;
