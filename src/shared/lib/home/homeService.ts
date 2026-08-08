import { getSupabase } from '../db/client';
import type { HomeHeroImage, HomeItem } from '../../types';
import { mapHomeHeroImageRowToHomeHeroImage, mapHomeItemRowToHomeItem } from './homeMapper';

// ÚNICA fuente de la página de inicio del proyecto: imágenes hero + la lista
// unificada y reordenable de secciones de productos y banners.

export async function getHeroImages(): Promise<HomeHeroImage[]> {
  const { data, error } = await getSupabase()
    .from('home_hero_image')
    .select('id, image_url, sort_order')
    .order('sort_order');
  if (error) throw error;
  return (data ?? []).map((r) => mapHomeHeroImageRowToHomeHeroImage({ ...r, id: String(r.id) }));
}

export async function getHomeItems(): Promise<HomeItem[]> {
  const { data, error } = await getSupabase()
    .from('home_item')
    .select('id, type, title, is_visible, sort_order, image_url, link, home_section_product(product_id, sort_order)')
    .order('sort_order');
  if (error) throw error;
  return (data ?? []).map((r) =>
    mapHomeItemRowToHomeItem({
      ...r,
      id: String(r.id),
      home_section_product: (r.home_section_product ?? []).map((sp: any) => ({
        product_id: String(sp.product_id),
        sort_order: sp.sort_order,
      })),
    })
  );
}
