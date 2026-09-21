import { z } from 'zod';

// Contrato de entrada de POST /api/vendedores y PUT /api/vendedores/[id].
// El máximo es el de la columna (`vendor.name varchar(100)`).
export const vendedorWriteSchema = z.object({
  nombre: z.string().trim().min(1, 'requerido').max(100, 'máximo 100 caracteres'),
});

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

export const ordenProductosSchema = z.object({
  cambios: z.array(z.object({
    id: z.string().regex(/^[1-9]\d*$/),
    orden: z.number().int().min(0).max(2147483647),
  })).min(1).superRefine((items, ctx) => {
    if (new Set(items.map((i) => i.id)).size !== items.length || new Set(items.map((i) => i.orden)).size !== items.length) {
      ctx.addIssue({ code: 'custom', message: 'Ids u órdenes duplicados.' });
    }
  }),
});
