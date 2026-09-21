import type { SupabaseClient } from '@supabase/supabase-js';
import type { CalificacionWrite } from '../validation/calificacionSchema';

export type CalificacionErrorCode = 'MIGRACION_PENDIENTE' | 'SIN_PERMISO';

export class CalificacionError extends Error {
  constructor(readonly code: CalificacionErrorCode, message: string) {
    super(message);
    this.name = 'CalificacionError';
  }
}

export type CalificacionWritePort = (id: number, input: CalificacionWrite) => Promise<boolean>;

export async function guardarCalificacion(write: CalificacionWritePort, id: number, input: CalificacionWrite): Promise<void> {
  let updated: boolean;
  try {
    updated = await write(id, input);
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code : undefined;
    if (code === 'PGRST204' || code === '42703') {
      throw new CalificacionError('MIGRACION_PENDIENTE', 'La base de datos aún no tiene habilitadas las calificaciones.');
    }
    throw error;
  }
  if (!updated) throw new CalificacionError('SIN_PERMISO', 'No se pudo actualizar el producto.');
}

// Adaptador de I/O. El CRUD normal de producto no escribe estas dos columnas.
export async function updateCalificacion(cliente: SupabaseClient, id: number, input: CalificacionWrite): Promise<void> {
  return guardarCalificacion(async (productId, rating) => {
    const { data, error } = await cliente.from('product')
      .update({ rating_avg: rating.promedio, rating_count: rating.cantidad })
      .eq('id', productId)
      .select('id');
    if (error) throw error;
    return Boolean(data?.length);
  }, id, input);
}
