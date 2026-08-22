import type { Category, Subcategory } from '../../types';
import { slugify } from '../text/slugify';

// Fila cruda de la tabla `category` (autorreferenciada — ver DATABASE_SCHEMA.md).
// No existe una tabla `subcategory` separada: una subcategoría es una fila de
// `category` cuyo parent_category_id apunta a otra categoría.
export interface CategoryRow {
  id: string;
  parent_category_id: string | null;
  code: number; // numérico, uso interno/inventario — ya NO es el slug público
  name: string;
  sort_order: number;
  is_active: boolean;
}

// `category.code` es un número de inventario, no un texto de ruta — el slug
// público se calcula desde `name` (no se persiste, igual que en `product`).
// La función vive en `../text/slugify` desde BZ-61: estaba duplicada acá y en
// `productoMapper.ts`, y el slug es la URL pública (ver SPEC-003).

// Recibe TODAS las filas activas de `category` (una sola consulta) y arma el
// árbol de 2 niveles que espera el resto del proyecto: categorías raíz
// (parent_category_id null) con sus subcategorías anidadas.
export function mapCategoryRowsToCategories(rows: CategoryRow[]): Category[] {
  const activeRows = rows.filter((r) => r.is_active);
  const roots = activeRows.filter((r) => r.parent_category_id === null);
  const children = activeRows.filter((r) => r.parent_category_id !== null);

  return roots
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((root) => ({
      id: root.id,
      codigo: root.code,
      nombre: root.name,
      slug: slugify(root.name),
      orden: root.sort_order,
      subcategorias: children
        .filter((c) => c.parent_category_id === root.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((c): Subcategory => ({
          id: c.id,
          codigo: c.code,
          categoriaId: c.parent_category_id as string,
          nombre: c.name,
          slug: slugify(c.name),
          orden: c.sort_order,
        })),
    }));
}
