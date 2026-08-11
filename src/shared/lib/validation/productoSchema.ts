import { z } from 'zod';

// Contrato de entrada de POST/PUT /api/productos — misma forma que
// `ProductoWriteInput` en productoService.ts.

export const productoWriteSchema = z.object({
  nombre: z.string().trim().min(1, 'requerido'),
  categoriaNombre: z.string().trim().min(1, 'requerido'),
  subcategoriaNombre: z.string().nullable(),
  vendorNombre: z.string().trim().min(1, 'requerido'),
  precio: z.number(),
  precioOriginal: z.number().nullable(),
  descripcion: z.string(),
  keywords: z.string(),
  caracteristicas: z.array(z.string()),
  fotos: z.array(z.string()),
  publicado: z.boolean(),
  activo: z.boolean(),
  personalizable: z.boolean(),
});

export type ProductoWrite = z.infer<typeof productoWriteSchema>;
