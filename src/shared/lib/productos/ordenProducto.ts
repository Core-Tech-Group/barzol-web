import type { Product } from '../../types';

export type ProductoOrdenable = Pick<Product, 'id' | 'orden' | 'createdAt'>;
export type ProductoConInstrumento = ProductoOrdenable & Pick<Product, 'categoriaId'>;
export interface CambioOrden { id: string; orden: number }

export function siguienteOrden(ordenesDelInstrumento: readonly number[]): number {
  return ordenesDelInstrumento.length ? Math.max(...ordenesDelInstrumento) + 1 : 0;
}

export function ordenAlGuardar(input: {
  instrumentoAnterior: string | null;
  instrumentoNuevo: string;
  ordenActual: number | null;
  ordenesDelInstrumentoNuevo: readonly number[];
}): number {
  return input.instrumentoAnterior === input.instrumentoNuevo && input.ordenActual !== null
    ? input.ordenActual
    : siguienteOrden(input.ordenesDelInstrumentoNuevo);
}

export function compararPorOrden(a: ProductoOrdenable, b: ProductoOrdenable): number {
  return a.orden - b.orden || compararRecientes(a, b);
}

export function compararRecientes(a: Pick<ProductoOrdenable, 'id' | 'createdAt'>, b: Pick<ProductoOrdenable, 'id' | 'createdAt'>): number {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt) || Number(b.id) - Number(a.id);
}

export function compararRecomendado(ordenInstrumento: ReadonlyMap<string, number>) {
  return (a: ProductoConInstrumento, b: ProductoConInstrumento): number =>
    (ordenInstrumento.get(a.categoriaId) ?? Number.MAX_SAFE_INTEGER)
      - (ordenInstrumento.get(b.categoriaId) ?? Number.MAX_SAFE_INTEGER)
      || compararPorOrden(a, b);
}

export function cambiosDeOrden(lista: readonly Pick<Product, 'id' | 'orden'>[]): CambioOrden[] {
  return lista.flatMap((producto, index) => producto.orden === index ? [] : [{ id: producto.id, orden: index }]);
}
