import type { Product } from '@shared/types';

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
  { valor: 'nuevos', label: 'Más recientes' },
  { valor: 'precio-asc', label: 'Precio: menor a mayor' },
  { valor: 'precio-desc', label: 'Precio: mayor a menor' },
] as const;

export type OrdenValor = (typeof ORDEN_OPCIONES)[number]['valor'];

export const ORDEN_POR_DEFECTO: OrdenValor = 'nuevos';

/** Normaliza el `?orden=` de la URL — entrada externa, puede ser cualquier cosa. */
export function parseOrden(valor: string | null): OrdenValor {
  const encontrada = ORDEN_OPCIONES.find((o) => o.valor === valor);
  return encontrada ? encontrada.valor : ORDEN_POR_DEFECTO;
}

/** Ordena sin mutar el arreglo recibido. */
export function ordenarProductos<T extends Pick<Product, 'precio' | 'createdAt'>>(
  productos: T[],
  orden: OrdenValor
): T[] {
  const copia = [...productos];

  switch (orden) {
    case 'precio-asc':
      return copia.sort((a, b) => a.precio - b.precio);
    case 'precio-desc':
      return copia.sort((a, b) => b.precio - a.precio);
    case 'nuevos':
      return copia.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
}
