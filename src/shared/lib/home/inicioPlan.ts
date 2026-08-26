import type { HomeItemRow } from './homeMapper';

// SPEC-904 · REQ-971, REQ-972, REQ-974, REQ-975.
//
// Toda la decisión de qué escribir vive acá, en funciones puras: el servicio
// solo ejecuta el plan. Esa separación no es estética — `updateInicio` habla
// con PostgREST y probarlo obligaría a doblar `@supabase/supabase-js`, que la
// Constitución 5.1 prohíbe. Partido así, la parte que decide se prueba entera
// y la que ejecuta no decide nada.
//
// REQ-972 revisado (Enmienda 1): supabase-js no puede abrir una transacción,
// así que no hay atomicidad que prometer. Lo que sí hay es un diff — actualizar
// lo que cambió, insertar lo nuevo, borrar lo que sobra— con los borrados al
// final. La alternativa evidente (borrar todo, insertar todo) es más corta y
// deja la portada en blanco si el segundo paso falla.

export interface ItemEntradaSeccion {
  id: string | null;
  tipo: 'seccion';
  titulo: string;
  visible: boolean;
  productoIds: string[];
}

export interface ItemEntradaBanner {
  id: string | null;
  tipo: 'banner';
  visible: boolean;
  link: string;
  imagenUrl: string | null;
}

export type ItemEntrada = ItemEntradaSeccion | ItemEntradaBanner;

export interface InicioWriteInput {
  heroImages: (string | null)[];
  items: ItemEntrada[];
}

/** Lo que existe hoy en la base, reducido a lo único que el diff necesita. */
export interface EstadoExistente {
  itemsExistentes: string[];
  /**
   * Las filas hero se emparejan por `orden` y no por posición en el array:
   * `home_hero_image.image_url` es `NOT NULL`, así que una portada vacía es
   * una fila **ausente**, no una fila con `null`. Con huecos en el medio, la
   * posición y el `sort_order` dejan de coincidir.
   */
  heroExistentes: { id: string; orden: number }[];
}

/** Columnas escribibles de `home_item`. `id`, `created_at` y compañía no. */
export type FilaItem = Pick<HomeItemRow, 'type' | 'title' | 'is_visible' | 'sort_order' | 'image_url' | 'link'>;

export interface FilaHero {
  image_url: string;
  sort_order: number;
}

export interface PlanInicio {
  /** `productoIds` en `null` significa "esta fila no tiene hijos que tocar". */
  actualizarItems: { id: string; fila: FilaItem; productoIds: string[] | null }[];
  insertarItems: { fila: FilaItem; productoIds: string[] | null }[];
  borrarItems: string[];
  actualizarHero: ({ id: string } & FilaHero)[];
  insertarHero: FilaHero[];
  borrarHero: string[];
}

const TIPO_TO_TYPE: Record<ItemEntrada['tipo'], FilaItem['type']> = {
  seccion: 'section',
  banner: 'banner',
};

/**
 * REQ-975 — última frontera antes de la columna.
 *
 * El esquema Zod ya rechaza las `data:` URI en el borde del endpoint. Esta
 * comprobación no es la misma con otro nombre: cubre a quien llame al servicio
 * sin pasar por la ruta HTTP, que es exactamente como se cuelan las cosas.
 */
function exigirUrlPersistible(valor: string | null, donde: string): string | null {
  if (valor === null) return null;
  if (/^\s*data:/i.test(valor)) {
    throw new Error(`No se puede guardar una imagen en base64 (data:) en ${donde}. Subila a R2 primero.`);
  }
  return valor;
}

function filaDeItem(item: ItemEntrada, orden: number): FilaItem {
  const base = { type: TIPO_TO_TYPE[item.tipo], is_visible: item.visible, sort_order: orden };

  return item.tipo === 'seccion'
    ? { ...base, title: item.titulo, image_url: null, link: null }
    : { ...base, title: null, image_url: exigirUrlPersistible(item.imagenUrl, 'un banner'), link: item.link };
}

/**
 * Calcula qué escribir para dejar el inicio como pide `entrada`.
 *
 * Un `id` que la isla envía pero la base no reconoce se trata como alta, no
 * como cambio: un `update` contra un id inexistente afecta cero filas y
 * PostgREST lo da por bueno, así que el item desaparecería sin que nadie viera
 * un error.
 */
export function planificarInicio(existente: EstadoExistente, entrada: InicioWriteInput): PlanInicio {
  const conocidos = new Set(existente.itemsExistentes);
  const plan: PlanInicio = {
    actualizarItems: [],
    insertarItems: [],
    borrarItems: [],
    actualizarHero: [],
    insertarHero: [],
    borrarHero: [],
  };

  const sobreviven = new Set<string>();

  entrada.items.forEach((item, orden) => {
    const fila = filaDeItem(item, orden);
    const productoIds = item.tipo === 'seccion' ? item.productoIds : null;

    if (item.id !== null && conocidos.has(item.id)) {
      sobreviven.add(item.id);
      plan.actualizarItems.push({ id: item.id, fila, productoIds });
    } else {
      plan.insertarItems.push({ fila, productoIds });
    }
  });

  plan.borrarItems = existente.itemsExistentes.filter((id) => !sobreviven.has(id));

  // Una portada vacía no es una fila con `null`: es una fila que no existe.
  // `image_url` es `NOT NULL` en el esquema, y además una fila fantasma sería
  // indistinguible de una imagen que se subió mal.
  const ordenesOcupados = new Set<number>();

  entrada.heroImages.forEach((url, orden) => {
    const image_url = exigirUrlPersistible(url, `la imagen hero ${orden + 1}`);
    if (image_url === null) return;

    ordenesOcupados.add(orden);
    const fila = existente.heroExistentes.find((h) => h.orden === orden);

    if (fila === undefined) plan.insertarHero.push({ image_url, sort_order: orden });
    else plan.actualizarHero.push({ id: fila.id, image_url, sort_order: orden });
  });

  plan.borrarHero = existente.heroExistentes.filter((h) => !ordenesOcupados.has(h.orden)).map((h) => h.id);

  return plan;
}
