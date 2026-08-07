import type { Category, Subcategory } from '../../types';

// Fila cruda de la tabla `category` (autorreferenciada — ver DATABASE_SCHEMA.md).
// No existe una tabla `subcategory` separada: una subcategoría es una fila de
// `category` cuyo parent_category_id apunta a otra categoría.
export interface CategoryRow {
  id: string;
  parent_category_id: string | null;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

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
      nombre: root.name,
      slug: root.code,
      orden: root.sort_order,
      subcategorias: children
        .filter((c) => c.parent_category_id === root.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((c): Subcategory => ({
          id: c.id,
          categoriaId: c.parent_category_id as string,
          nombre: c.name,
          slug: c.code,
          orden: c.sort_order,
        })),
    }));
}
