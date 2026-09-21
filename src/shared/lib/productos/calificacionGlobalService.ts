import { getSupabase } from '../db/client';
import { resumirCalificaciones } from './calificacionGlobal';

/** Consulta liviana sobre todo el catálogo público, independiente del home. */
export async function getCalificacionGlobal() {
  return resumirCalificaciones(async (afterId, limit) => {
    const { data, error } = await getSupabase()
      .from('product')
      .select('id, rating_avg, rating_count')
      .eq('status', 'published')
      .eq('is_active', true)
      .gt('rating_count', 0)
      .gt('id', afterId)
      .order('id', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: Number(row.id),
      promedio: Number(row.rating_avg),
      cantidad: Number(row.rating_count),
    }));
  });
}
