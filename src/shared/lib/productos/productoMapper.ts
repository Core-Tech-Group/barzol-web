import type { Product } from '../../types';

// Fila cruda tal como viene de la base de datos (columnas snake_case).
export interface ProductoRow {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria_id: string;
  imagen_url: string;
  destacado: boolean;
  disponible: boolean;
  created_at: string;
}

export function mapProductoRowToProduct(row: ProductoRow): Product {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    precio: row.precio,
    categoriaId: row.categoria_id,
    imagenUrl: row.imagen_url,
    destacado: row.destacado,
    disponible: row.disponible,
    createdAt: row.created_at,
  };
}
