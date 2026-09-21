import { z } from 'zod';

// SPEC-007 · REQ-701/702. La base repite estas invariantes con CHECK.
export const calificacionWriteSchema = z.object({
  promedio: z.number().min(0).max(5).refine((value) => Number.isInteger(value * 10), 'máximo un decimal'),
  cantidad: z.number().int().min(0).max(2_147_483_647),
}).strict().refine(
  ({ promedio, cantidad }) => cantidad === 0 ? promedio === 0 : promedio > 0,
  'El promedio y la cantidad deben corresponder.',
);

export type CalificacionWrite = z.infer<typeof calificacionWriteSchema>;
