import type { ApiResponse } from '@shared/api/apiResponse';
import type { InicioWriteInput, ItemEntrada } from '@shared/lib/home/inicioPlan';

// SPEC-904 · REQ-971, REQ-973, REQ-974 — la orquestación del guardado del
// inicio, fuera de `InicioAdmin.tsx`.
//
// Vive en su propio módulo por dos motivos. `BZ-79`: el componente ya tiene 835
// líneas y meterle esto lo empujaría en la dirección contraria. Y `BZ-60`: la
// capa que probaría al componente sigue bloqueada, mientras que esto se prueba
// hoy sin montar nada.

/** La forma con la que trabaja la isla. `open` e `isNew` son presentación. */
export interface ItemIsla {
  id: string;
  type: 'section' | 'banner';
  visible: boolean;
  title?: string;
  products?: string[];
  link?: string;
  image?: string | null;
  open?: boolean;
  isNew?: boolean;
}

/**
 * Ids provisionales de la isla para lo que todavía no existe en la base.
 * Éste es el ÚNICO punto donde esa convención cruza al servidor, y cruza
 * convertida en `null`.
 */
const PREFIJO_PROVISIONAL = 'new-';

const idPersistido = (id: string): string | null => (id.startsWith(PREFIJO_PROVISIONAL) ? null : id);

function exigirUrlPersistible(valor: string | null | undefined, donde: string): string | null {
  const v = valor ?? null;
  if (v !== null && /^\s*data:/i.test(v)) {
    throw new Error(`La imagen de ${donde} todavía no se subió. Volvé a elegirla y esperá a que termine.`);
  }
  return v;
}

/**
 * Traduce el estado de la isla al cuerpo de `PUT /api/inicio`.
 *
 * Pura a propósito: es donde se decide que los productos viajan por `id` y no
 * por nombre (REQ-974), y esa decisión merece test propio.
 */
export function construirCuerpo(items: ItemIsla[], heroImages: (string | null)[]): InicioWriteInput {
  const cuerpoItems: ItemEntrada[] = items.map((it) =>
    it.type === 'section'
      ? {
          id: idPersistido(it.id),
          tipo: 'seccion',
          titulo: (it.title ?? '').trim(),
          visible: it.visible,
          productoIds: it.products ?? [],
        }
      : {
          id: idPersistido(it.id),
          tipo: 'banner',
          visible: it.visible,
          link: it.link ?? '',
          imagenUrl: exigirUrlPersistible(it.image, 'un banner'),
        }
  );

  return {
    heroImages: heroImages.map((url, i) => exigirUrlPersistible(url, `la portada ${i + 1}`)),
    items: cuerpoItems,
  };
}

type Enviar = (url: string, init: RequestInit) => Promise<Response>;

const enviarPorDefecto: Enviar = (url, init) => fetch(url, init);

/**
 * Guarda el inicio entero en una sola petición y **lanza si algo falla**.
 *
 * Que lance es el requisito, no un detalle: REQ-970 y REQ-973 dicen que sin
 * confirmación del servidor no hay toast de éxito ni estado limpio. Quien llama
 * conserva en memoria lo que el administrador quería, así que un fallo es
 * reintentable en vez de una pérdida.
 *
 * `enviar` se inyecta con valor por defecto para poder probarlo sin parchear
 * `globalThis.fetch`.
 */
export async function guardarInicio(
  items: ItemIsla[],
  heroImages: (string | null)[],
  enviar: Enviar = enviarPorDefecto
): Promise<void> {
  const cuerpo = construirCuerpo(items, heroImages);

  const respuesta = await enviar('/api/inicio', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });

  // Un 502 de Cloudflare llega como HTML: `json()` lanza y ese throw es la
  // respuesta correcta. Mirar solo `res.ok` es cómo se construye un guardado
  // que miente.
  let sobre: ApiResponse<unknown>;
  try {
    sobre = (await respuesta.json()) as ApiResponse<unknown>;
  } catch {
    throw new Error(`El servidor respondió ${respuesta.status} y no se pudo leer la respuesta.`);
  }

  if (!respuesta.ok || !sobre.success) {
    throw new Error(sobre.message || `No se pudo guardar la página de inicio (${respuesta.status}).`);
  }
}
