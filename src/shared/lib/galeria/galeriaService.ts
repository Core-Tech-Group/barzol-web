import type { GalleryItem } from '../../types';

// TODO: implementar acceso a datos real (Supabase/ORM). Por ahora solo
// define el contrato que consumirá la ruta de pages/api/galeria.

export async function getGaleria(): Promise<GalleryItem[]> {
  throw new Error('Not implemented');
}

export async function addGaleriaItem(
  data: Omit<GalleryItem, 'id' | 'createdAt'>
): Promise<GalleryItem> {
  throw new Error('Not implemented');
}
