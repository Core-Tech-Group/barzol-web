import type { ApiResponse } from '@shared/api/apiResponse';
import { estadoImagen } from '@shared/lib/galeria/imagenGaleria';

// SPEC-905 · REQ-984, REQ-985, REQ-986 — el guardado de la galería, fuera de la
// isla.
//
// `GalleryAdmin.tsx` está a 29 líneas del límite de la Regla 9.1 y **no** está
// en el trinquete de `BZ-79`: cualquier archivo que cruce las 500 sin estar en
// la lista bloquea el gate. Sacar esto no fue una preferencia de diseño, fue la
// restricción con la que se escribió la tarea — y de paso convierte en probable
// un bucle que vivía dentro de un componente React.

export interface FotoIsla {
  id: string;
  caption: string;
  image: string | null;
}

export interface EntradaGaleria {
  titulo: string;
  imagenUrl: string;
  orden: number;
}

export interface PlanGaleria {
  crear: EntradaGaleria[];
  actualizar: (EntradaGaleria & { id: string })[];
  borrar: string[];
}

/** Convención de la isla para lo que todavía no existe en la base. */
const PREFIJO_PROVISIONAL = 'new-';

const esNueva = (id: string) => id.startsWith(PREFIJO_PROVISIONAL);

/**
 * REQ-984 — qué tarjetas impiden guardar, y por qué cada una.
 *
 * Se devuelven las dos listas por separado en vez de un booleano porque el
 * panel señala la tarjeta concreta. Un "faltan datos" genérico obliga a
 * buscarlo a ojo, y con las seis filas rotas de producción eso es exactamente
 * lo que no queremos que pase.
 */
export function fotosIncompletas(fotos: FotoIsla[]): { sinImagen: string[]; sinTitulo: string[] } {
  return {
    sinImagen: fotos.filter((f) => estadoImagen(f.image) !== 'ok').map((f) => f.id),
    sinTitulo: fotos.filter((f) => !f.caption.trim()).map((f) => f.id),
  };
}

/**
 * Calcula qué peticiones hacen falta para dejar la galería como está en la isla.
 *
 * Lanza si alguna foto no tiene una imagen válida: el plan es la última
 * frontera antes de la red, y `BZ-82` fue precisamente un valor inválido que
 * viajó sin que nadie lo mirara.
 */
export function planificarGaleria(iniciales: FotoIsla[], actuales: FotoIsla[]): PlanGaleria {
  const { sinImagen } = fotosIncompletas(actuales);
  if (sinImagen.length > 0) {
    throw new Error(`Hay ${sinImagen.length} foto(s) sin imagen válida. Subí la imagen antes de guardar.`);
  }

  const plan: PlanGaleria = { crear: [], actualizar: [], borrar: [] };

  actuales.forEach((foto, orden) => {
    // `image` ya pasó por `fotosIncompletas`, así que no es null.
    const entrada = { titulo: foto.caption.trim(), imagenUrl: foto.image as string, orden };
    if (esNueva(foto.id)) plan.crear.push(entrada);
    else plan.actualizar.push({ id: foto.id, ...entrada });
  });

  const sobreviven = new Set(actuales.filter((f) => !esNueva(f.id)).map((f) => f.id));
  plan.borrar = iniciales.filter((f) => !sobreviven.has(f.id)).map((f) => f.id);

  return plan;
}

type Enviar = (url: string, init: RequestInit) => Promise<Response>;

const enviarPorDefecto: Enviar = (url, init) => fetch(url, init);

async function pedir(enviar: Enviar, url: string, method: string, body?: unknown): Promise<void> {
  const respuesta = await enviar(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let sobre: ApiResponse<unknown>;
  try {
    sobre = (await respuesta.json()) as ApiResponse<unknown>;
  } catch {
    throw new Error(`El servidor respondió ${respuesta.status} y no se pudo leer la respuesta.`);
  }

  if (!respuesta.ok || !sobre.success) {
    throw new Error(sobre.message || `No se pudo guardar la galería (${respuesta.status}).`);
  }
}

/**
 * Ejecuta el plan. **Escrituras primero, borrados al final** (REQ-985).
 *
 * Es la misma decisión que `SPEC-904` REQ-972 y por el mismo motivo: PostgREST
 * no ofrece transacción, así que el orden es lo único que separa "un fallo a
 * media escritura" de "la galería se quedó vacía".
 */
export async function guardarGaleria(
  tipo: 'accesorios' | 'trabajos',
  plan: PlanGaleria,
  enviar: Enviar = enviarPorDefecto
): Promise<void> {
  for (const { id, ...entrada } of plan.actualizar) {
    await pedir(enviar, `/api/galeria/${id}`, 'PUT', { tipo, ...entrada });
  }

  for (const entrada of plan.crear) {
    await pedir(enviar, '/api/galeria', 'POST', { tipo, ...entrada });
  }

  for (const id of plan.borrar) {
    await pedir(enviar, `/api/galeria/${id}`, 'DELETE');
  }
}
