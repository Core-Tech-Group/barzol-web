import { z } from 'zod';

// Contrato de entrada de PUT /api/configuracion — todos los campos son
// opcionales (actualización parcial de la fila singleton).

export const configuracionWriteSchema = z.object({
  whatsappNumero: z.string().trim().min(1, 'requerido').optional(),
  emailContacto: z.string().trim().min(1, 'requerido').optional(),
  instagramUrl: z.string().nullable().optional(),
  facebookUrl: z.string().nullable().optional(),
  direccion: z.string().nullable().optional(),
});

export type ConfiguracionWrite = z.infer<typeof configuracionWriteSchema>;
