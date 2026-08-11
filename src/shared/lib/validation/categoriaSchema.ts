import { z } from 'zod';

// Contrato de entrada de POST/PUT /api/categorias — misma forma que
// `CategoriaWriteInput` en categoriaService.ts.

export const categoriaWriteSchema = z.object({
  nombre: z.string().trim().min(1, 'requerido'),
  parentId: z.string().nullable(),
  orden: z.number(),
});

export type CategoriaWrite = z.infer<typeof categoriaWriteSchema>;
