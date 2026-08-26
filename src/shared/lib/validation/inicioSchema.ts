import { z } from 'zod';

// Contrato de entrada de PUT /api/inicio — misma forma que `InicioWriteInput`
// en `home/inicioPlan.ts` (SPEC-904, Enmienda 1).
//
// El panel ya valida en el cliente y eso no cuenta: la ruta es alcanzable con
// `curl` y una cookie de sesión. REQ-978 lo dice explícitamente para que nadie
// lea esta duplicación como un "por si acaso" de los que la regla SDD prohíbe.

/**
 * REQ-975 — una `data:` URI dentro de `image_url` se serviría entera en cada
 * visita a la portada. Es `BZ-77`; dejarla entrar por acá lo empeoraría en vez
 * de heredarlo.
 */
const urlDeImagen = z
  .string()
  .trim()
  .refine((v) => !/^data:/i.test(v), 'la imagen debe subirse a R2, no incrustarse en base64');

const heroImage = z.union([urlDeImagen, z.null()]);

const seccion = z.object({
  id: z.union([z.string(), z.null()]),
  tipo: z.literal('seccion'),
  // REQ-978 · una sección sin título no se puede pintar ni buscar.
  titulo: z.string().trim().min(1, 'requerido'),
  visible: z.boolean(),
  productoIds: z.array(z.string()),
});

const banner = z.object({
  id: z.union([z.string(), z.null()]),
  tipo: z.literal('banner'),
  visible: z.boolean(),
  link: z.string(),
  imagenUrl: z.union([urlDeImagen, z.null()]),
});

export const inicioWriteSchema = z.object({
  heroImages: z.array(heroImage),
  // El índice del array ES el orden: no hay campo `orden` que pueda
  // contradecir a la posición.
  items: z.array(z.discriminatedUnion('tipo', [seccion, banner])),
});

export type InicioWrite = z.infer<typeof inicioWriteSchema>;
