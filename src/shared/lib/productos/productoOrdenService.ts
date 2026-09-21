import type { SupabaseClient } from '@supabase/supabase-js';
import { getCategorias } from '../categorias/categoriaService';
import { ordenAlGuardar, type CambioOrden } from './ordenProducto';

/** Mantiene el orden al editar dentro del instrumento y agrega al final al crear o mover. */
export async function ordenParaGuardar(
  client: SupabaseClient,
  categoriaNombre: string,
  idActual?: string
): Promise<number | undefined> {
  const categorias = await getCategorias();
  const destino = categorias.find((c) => c.nombre === categoriaNombre);
  if (!destino) throw new Error(`Categoría "${categoriaNombre}" no encontrada.`);

  const { data, error } = await client.from('product').select('id, category_id, sort_order');
  // El mismo código puede desplegarse antes que la migración SQL.
  if (error?.code === '42703' || error?.code === 'PGRST204') return undefined;
  if (error) throw error;

  const grupo = (categoryId: string) => categorias.find((c) =>
    c.id === categoryId || c.subcategorias.some((s) => s.id === categoryId))?.id ?? categoryId;
  const anterior = idActual ? data?.find((p) => String(p.id) === idActual) : undefined;
  const ordenes = (data ?? [])
    .filter((p) => grupo(String(p.category_id)) === destino.id)
    .map((p) => Number(p.sort_order));

  return ordenAlGuardar({
    instrumentoAnterior: anterior ? grupo(String(anterior.category_id)) : null,
    instrumentoNuevo: destino.id,
    ordenActual: anterior ? Number(anterior.sort_order) : null,
    ordenesDelInstrumentoNuevo: ordenes,
  });
}

export class OrdenMigrationError extends Error {}

export async function actualizarOrdenProductos(client: SupabaseClient, cambios: CambioOrden[]): Promise<void> {
  const { error } = await client.rpc('reordenar_productos', { cambios: cambios.map((c) => ({ id: Number(c.id), orden: c.orden })) });
  if (error?.code === 'PGRST202' || error?.code === '42883' || error?.code === '42703') {
    throw new OrdenMigrationError('Falta aplicar supabase/pendiente-orden-productos.sql en Supabase.');
  }
  if (error) throw error;
}
