import type { HomeHeroImage, HomeItem } from '../../types';

// Fila cruda de `home_hero_image`.
export interface HomeHeroImageRow {
  id: string;
  image_url: string | null;
  sort_order: number;
}

export function mapHomeHeroImageRowToHomeHeroImage(row: HomeHeroImageRow): HomeHeroImage {
  return { id: row.id, imagenUrl: row.image_url, orden: row.sort_order };
}

// Fila cruda de `home_item`, con `home_section_product` ya unida (join) por
// la consulta — así responde Supabase al pedir `select('*, home_section_product(product_id, sort_order)')`.
export interface HomeItemRow {
  id: string;
  type: 'section' | 'banner';
  title: string | null;
  is_visible: boolean;
  sort_order: number;
  image_url: string | null;
  link: string | null;
  home_section_product: { product_id: string; sort_order: number }[];
}

const TYPE_TO_TIPO: Record<HomeItemRow['type'], HomeItem['tipo']> = {
  section: 'seccion',
  banner: 'banner',
};

export function mapHomeItemRowToHomeItem(row: HomeItemRow): HomeItem {
  return {
    id: row.id,
    tipo: TYPE_TO_TIPO[row.type],
    titulo: row.title,
    visible: row.is_visible,
    orden: row.sort_order,
    imagenUrl: row.image_url,
    link: row.link,
    productoIds: [...row.home_section_product]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((sp) => sp.product_id),
  };
}
