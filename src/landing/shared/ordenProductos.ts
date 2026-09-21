import type { Product } from '@shared/types';
import { compararRecomendado, compararRecientes } from '@shared/lib/productos/ordenProducto';

// Orden del listado de productos, compartido por /busqueda y /catalogo.
//
// Vive en `landing/shared` y no en `shared/lib`: es una decisión de cómo se
// presenta el listado, no una regla de negocio, y las dos vistas que lo usan
// son de presentación. Estaba duplicado en ambas como un <select> sin
// funcionalidad (Regla 9.2).
//
// El valor viaja en la URL (`?orden=`) en vez de en estado del cliente: así
// el orden elegido sobrevive a compartir el enlace, recargar y paginar.

export const ORDEN_OPCIONES = [
  { valor: 'recomendados', label: 'Recomendados' },
  { valor: 'nuevos', label: 'Más recientes' },
  { valor: 'precio-asc', label: 'Precio: menor a mayor' },
  { valor: 'precio-desc', label: 'Precio: mayor a menor' },
] as const;

export type OrdenValor = (typeof ORDEN_OPCIONES)[number]['valor'];

export const ORDEN_POR_DEFECTO: OrdenValor = 'recomendados';

export function hrefParaOrden(pathname: string, params: URLSearchParams, valor: OrdenValor): string {
  const siguiente = new URLSearchParams(params);
  siguiente.delete('page');
  if (valor === ORDEN_POR_DEFECTO) siguiente.delete('orden');
  else siguiente.set('orden', valor);
  const qs = siguiente.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Normaliza el `?orden=` de la URL — entrada externa, puede ser cualquier cosa. */
export function parseOrden(valor: string | null): OrdenValor {
  const encontrada = ORDEN_OPCIONES.find((o) => o.valor === valor);
  return encontrada ? encontrada.valor : ORDEN_POR_DEFECTO;
}

/** Ordena sin mutar el arreglo recibido. */
export function ordenarProductos<T extends Pick<Product, 'id' | 'categoriaId' | 'orden' | 'precio' | 'createdAt'> & { ordenDisponible?: boolean }>(
  productos: readonly T[],
  orden: OrdenValor,
  ordenInstrumento: ReadonlyMap<string, number> = new Map()
): T[] {
  const copia = [...productos];

  switch (orden) {
    case 'recomendados':
      return copia.some((p) => p.ordenDisponible === false)
        ? copia.sort(compararRecientes)
        : copia.sort(compararRecomendado(ordenInstrumento));
    case 'precio-asc':
      return copia.sort((a, b) => a.precio - b.precio);
    case 'precio-desc':
      return copia.sort((a, b) => b.precio - a.precio);
    case 'nuevos':
      return copia.sort(compararRecientes);
  }
}
