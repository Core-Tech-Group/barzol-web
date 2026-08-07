import type { Product } from '../../types';

// Fila cruda tal como viene de la base de datos (columnas snake_case).
// producto_fotos y producto_caracteristicas llegan ya unidas (join) por la
// consulta — así responde Supabase cuando se pide `select('*, producto_fotos(url,orden), ...')`.
export interface ProductoRow {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string;
  keywords: string;
  precio: number;
  precio_original: number | null;
  categoria_id: string | null; // nullable: accesorios genéricos sin instrumento asociado
  subcategoria_id: string | null;
  vendor_id: string;
  publicado: boolean;
  activo: boolean;
  personalizable: boolean;
  created_at: string;
  producto_fotos: { url: string; orden: number }[];
  producto_caracteristicas: { texto: string; orden: number }[];
}

export function mapProductoRowToProduct(row: ProductoRow): Product {
  return {
    id: row.id,
    nombre: row.nombre,
    slug: row.slug,
    descripcion: row.descripcion,
    keywords: row.keywords,
    precio: row.precio,
    precioOriginal: row.precio_original,
    categoriaId: row.categoria_id,
    subcategoriaId: row.subcategoria_id,
    vendorId: row.vendor_id,
    publicado: row.publicado,
    activo: row.activo,
    personalizable: row.personalizable,
    createdAt: row.created_at,
    fotos: [...row.producto_fotos].sort((a, b) => a.orden - b.orden).map((f) => f.url),
    caracteristicas: [...row.producto_caracteristicas].sort((a, b) => a.orden - b.orden).map((c) => c.texto),
  };
}
