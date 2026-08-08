import type { GalleryItem } from '../../types';

// Fila cruda de la tabla `gallery_item`.
export interface GalleryItemRow {
  id: string;
  type: 'accessories' | 'projects';
  image_url: string | null;
  title: string | null;
  sort_order: number;
}

const TYPE_TO_TIPO: Record<GalleryItemRow['type'], GalleryItem['tipo']> = {
  accessories: 'accesorios',
  projects: 'trabajos',
};

export function mapGalleryItemRowToGalleryItem(row: GalleryItemRow): GalleryItem {
  return {
    id: row.id,
    tipo: TYPE_TO_TIPO[row.type],
    imagenUrl: row.image_url,
    titulo: row.title ?? '',
    orden: row.sort_order,
  };
}
