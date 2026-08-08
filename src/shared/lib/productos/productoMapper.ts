import type { Product } from '../../types';
import type { CategoryRow } from '../categorias/categoriaMapper';

// Fila cruda tal como la devuelve Supabase (columnas snake_case, ids ya
// normalizados a string). `product_photo` y `product_feature` llegan unidas
// (join) por la consulta: `select('*, product_photo(url, sort_order),
// product_feature(content, sort_order)')`.
//
// `category_id` es la ÚNICA FK de `product` hacia `category` (ver
// DATABASE_SCHEMA.md) — apunta siempre a una categoría hoja (el trigger
// `trg_product_category_leaf` lo exige), es decir, a lo que la app llama
// "subcategoría". El instrumento (`Product.categoriaId`) no se guarda aparte:
// se deriva subiendo un nivel por `parent_category_id`, por eso el mapper
// necesita también las filas de `category` (para resolver ese padre).
export interface ProductoRow {
  id: string;
  code: number;
  name: string;
  description: string | null;
  keywords: string | null;
  price: number;
  original_price: number | null;
  category_id: string;
  vendor_id: string;
  status: 'draft' | 'published';
  is_active: boolean;
  is_personalizable: boolean;
  created_at: string;
  product_photo: { url: string; sort_order: number }[];
  product_feature: { content: string; sort_order: number }[];
}

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function mapProductoRowToProduct(row: ProductoRow, categoryRows: CategoryRow[]): Product {
  const leaf = categoryRows.find((c) => c.id === row.category_id);
  const parent = leaf?.parent_category_id ? categoryRows.find((c) => c.id === leaf.parent_category_id) : undefined;

  return {
    id: row.id,
    codigo: row.code,
    nombre: row.name,
    slug: slugify(row.name),
    descripcion: row.description ?? '',
    keywords: row.keywords ?? '',
    precio: row.price,
    precioOriginal: row.original_price,
    categoriaId: (parent ?? leaf)?.id ?? row.category_id,
    subcategoriaId: parent ? leaf!.id : null,
    vendorId: row.vendor_id,
    publicado: row.status === 'published',
    activo: row.is_active,
    personalizable: row.is_personalizable,
    createdAt: row.created_at,
    fotos: [...row.product_photo].sort((a, b) => a.sort_order - b.sort_order).map((p) => p.url),
    caracteristicas: [...row.product_feature].sort((a, b) => a.sort_order - b.sort_order).map((f) => f.content),
  };
}
