import { getSupabase } from '../db/client';
import type { SupabaseClient } from '@supabase/supabase-js';
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
  let query = getSupabase().from('gallery_item').select('id, type, image_url, title, sort_order').order('sort_order');
  if (tipo) query = query.eq('type', TIPO_TO_TYPE[tipo]);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) =>
    mapGalleryItemRowToGalleryItem({ ...r, id: String(r.id) })
  );
}

export interface GaleriaWriteInput {
  tipo: GalleryItem['tipo'];
  titulo: string;
  imagenUrl: string;
  orden: number;
}

export async function createGaleriaItem(
  supabaseAuth: SupabaseClient,
  input: GaleriaWriteInput
): Promise<{ id: string }> {
  const { data, error } = await supabaseAuth
    .from('gallery_item')
    .insert({ type: TIPO_TO_TYPE[input.tipo], title: input.titulo, image_url: input.imagenUrl, sort_order: input.orden })
    .select('id')
    .single();
  if (error) throw error;
  return { id: String(data.id) };
}

export async function updateGaleriaItem(
  supabaseAuth: SupabaseClient,
  id: string,
  input: GaleriaWriteInput
): Promise<{ id: string }> {
  const { error } = await supabaseAuth
    .from('gallery_item')
    .update({ type: TIPO_TO_TYPE[input.tipo], title: input.titulo, image_url: input.imagenUrl, sort_order: input.orden })
    .eq('id', Number(id));
  if (error) throw error;
  return { id };
}

export async function deleteGaleriaItem(supabaseAuth: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabaseAuth.from('gallery_item').delete().eq('id', Number(id));
  if (error) throw error;
}
