import { supabase } from '../db/client';
import type { GalleryItem } from '../../types';
import { mapGalleryItemRowToGalleryItem, type GalleryItemRow } from './galeriaMapper';

// ÚNICA fuente de la galería del proyecto — sirve a las dos galerías del
// sitio (Accesorios personalizados y Trabajos de ingeniería), distinguidas
// por `tipo`.

const TIPO_TO_TYPE: Record<GalleryItem['tipo'], GalleryItemRow['type']> = {
  accesorios: 'accessories',
  trabajos: 'projects',
};

export async function getGaleria(tipo?: GalleryItem['tipo']): Promise<GalleryItem[]> {
  let query = supabase.from('gallery_item').select('id, type, image_url, title, sort_order').order('sort_order');
  if (tipo) query = query.eq('type', TIPO_TO_TYPE[tipo]);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) =>
    mapGalleryItemRowToGalleryItem({ ...r, id: String(r.id) })
  );
}

export async function addGaleriaItem(
  data: Omit<GalleryItem, 'id'>
): Promise<GalleryItem> {
  throw new Error('Not implemented');
}
