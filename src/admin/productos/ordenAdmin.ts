import { compararPorOrden, compararRecientes, type CambioOrden } from '@shared/lib/productos/ordenProducto';
import type { ApiResponse } from '@shared/api/apiResponse';

export type ModoListado = 'reordenar' | 'recientes';

export function modoListado(filtroInstrumento: string | null, busqueda: string): ModoListado {
  return filtroInstrumento && !busqueda.trim() ? 'reordenar' : 'recientes';
}

export function ordenarParaAdmin<T extends { id: string; orden: number; createdAt: string }>(productos: readonly T[], modo: ModoListado) {
  const items = [...productos].sort(modo === 'reordenar'
    ? compararPorOrden
    : compararRecientes);
  return { items, paginar: modo !== 'reordenar' };
}

/** Posición visible 1..N; es útil cuando arrastrar una lista larga sería incómodo. */
export function moverAIndice<T>(items: readonly T[], desde: number, posicion: number): T[] {
  if (!Number.isInteger(desde) || !Number.isInteger(posicion) || desde < 0 || desde >= items.length || posicion < 1 || posicion > items.length) {
    throw new RangeError('Posición de producto inválida.');
  }
  const copia = [...items];
  const [item] = copia.splice(desde, 1);
  copia.splice(posicion - 1, 0, item);
  return copia;
}

export async function guardarOrden(
  cambios: CambioOrden[], enviar: (url: string, init: RequestInit) => Promise<Response> = fetch
): Promise<void> {
  const response = await enviar('/api/productos/orden', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cambios }),
  });
  const result = await response.json() as ApiResponse<null>;
  if (!response.ok || !result.success) throw new Error(result.message ?? 'No se pudo guardar el orden.');
}
